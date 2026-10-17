# 同一段還在路上就不再要一次 — Architecture Design

**Status:** Confirmed
**Source PRD:** `.sdd/2026-10-18-chart-duplicate-load-guard/PRD.md`
**Tech context:** Nuxt 3 · TypeScript · Clean Architecture（`.vue` = Controller → Application → Domain ← Infrastructure Proxy）

---

## 1. Design Goal & Guiding Principle

- **In one sentence:** 同一個 proxy 實例上，完全相同的彙總 K 線序列要求還在路上時，後到的呼叫共用那一份 Promise，不再打第二次後端；Promise 了結（成功或失敗）即忘記。
- **Guiding principle:** 「要求完全相同 ⇒ 答案完全相同」是 wire 層的事實，所以共用放在**唯一知道 wire 長什麼樣子的 Proxy**。Domain 與 Application 不知道有這件事（data-access 規則：快取／重新整理策略不寫進 Domain），元件的「最後一次動作才畫上去」完全不動。

---

## 2. Change Scope

| Area | Action | What / Why |
| :--- | :--- | :--- |
| `app/infrastructure/proxy/in-flight-request-sharing.ts` | **Add** | 以字串鍵記著在路上的 Promise；同鍵共用、了結即刪。兩個 proxy 共用一份實作 |
| `KCandleProxy.findKCandleSeries` | **Modify** | 以「標的＋起訖＋彙總刻度」為鍵經由共用表送出 |
| `KCandleContractProxy.findKCandleContractSeries` | **Modify** | 同上；各自一張表，所以兩張圖互不影響 |
| `KCandleChartViewportDomain` / `KCandleChartService` / 兩個 ChartPanel | **Not touched** | 取回計畫、併入、「最後一次動作才畫上去」都照舊 |
| 中途取消（AbortController） | **Not touched** | PRD Out of Scope；後端停不下來，取消只會讓下一次重算 |
| 其他 proxy 的請求 | **Not touched** | 只有序列這一支有「很久才回來＋會被連續觸發」的問題 |

---

## 3. New Classes / Modules

| Name | Kind | Responsibility (purpose) | Collaborators | Satisfies (PRD scenario) |
| :--- | :--- | :--- | :--- | :--- |
| `InFlightRequestSharing<T>` | Infrastructure class（proxy 內部組件） | `share(key, request)`：同鍵已在路上就回傳同一個 Promise，否則呼叫 `request()` 並記著，了結（`finally`）時刪除 | — | 只要一次、連拖五下、回來後再要、失敗後再要、等著的那一處照常說明失敗 |

它不是 Domain Model（拿的是執行中的 Promise，不是領域資料），也不是 helper：它是有狀態的物件，由 proxy 以組合方式持有，不匯出任何 static。

---

## 4. Modified Components

| Component | Current role | Change needed |
| :--- | :--- | :--- |
| `KCandleProxy` | 打 `/k-candles/series` 並把 wire 收成 `KCandleSeriesVo` | 持有一個 `InFlightRequestSharing<KCandleSeriesVo>`；`findKCandleSeries` 以 `symbol|fetchStart|fetchEnd|interval` 為鍵包住原本的請求與轉換 |
| `KCandleContractProxy` | 打 `/contract-k-candles/series` | 同上，各自一個實例 |

鍵包含**轉換後**的 VO 的來源全部參數（標的、起、訖、粗細），所以兩份共用者拿到的是同一個 `KCandleSeriesVo`；VO 不可變，共用安全。

---

## 5. Component Relationships

```mermaid
flowchart TD
    Panel[KCandle(Contract)ChartPanel.vue] --> App[KCandleChartApplication]
    App --> Svc[KCandleChartService]
    Svc --> IProxy[IKCandleProxy / IKCandleContractProxy]
    IProxy -.impl.-> Proxy[KCandleProxy / KCandleContractProxy]
    Proxy --> Sharing[InFlightRequestSharing]
    Proxy --> Backend[(go-trading series endpoint)]
```

---

## 6. Extensibility & Handoff Notes

- **Most likely next requirement:** 別的慢請求（例如指標計算、回測序列）也要同樣的共用；或想在換標的時中途取消。
- **Where it lands:** `InFlightRequestSharing` 已與資源無關——任何 proxy 持有一個實例、決定鍵即可。
- **How to add it:** 在那個 proxy 加一個欄位 `new InFlightRequestSharing<Vo>()`，把請求包進 `share(key, () => ...)`。取消則另開一刀，在這個類別上加「最後一個等待者離開就 abort」。
- **Patterns applied & why:** Request coalescing（single-flight），放在 wire 邊界，因為「相同要求 ⇒ 相同答案」只在這一層成立。
- **Do not hardcode:** 鍵一定要包含所有會改變答案的查詢參數；新增查詢參數時要一起進鍵。
- **Known debt / deferred:** 不共用**已回來**的結果（那是快取，另一件事）。

---

## 7. Traceability

| PRD Scenario | Fulfilled by |
| :--- | :--- |
| 拖了一下還是要同一段，只要一次 | `InFlightRequestSharing.share`（同鍵回傳同一 Promise）＋ `KCandleContractProxy` 的鍵 |
| 連拖五下仍只要一次 | `InFlightRequestSharing.share` |
| 換了粗細就照常去要 | 鍵含彙總刻度 |
| 兩張圖互不影響 | `KCandleProxy` 與 `KCandleContractProxy` 各自一個 `InFlightRequestSharing` 實例 |
| 回來之後再要同一段照常去要 | `share` 在 `finally` 刪鍵 |
| 等著的那一處照常說明失敗 | 共用的 Promise 被 reject，每個等待者照原本 `catch` 分流 |
| 失敗之後再要同一段照常去要 | `finally` 刪鍵（失敗不被記住） |

---

## 8. Risks & Open Decisions

- **Risks / trade-offs:** 共用者拿到的是同一個 VO 實例——VO 為不可變，可接受。
- **Open decisions (for implementation):** 無。
