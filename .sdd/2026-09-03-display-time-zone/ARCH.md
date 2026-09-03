# 顯示時區 — Architecture Design

**Status:** Confirmed
**Source PRD:** `.sdd/2026-09-03-display-time-zone/PRD.md`
**Tech context:** Nuxt 3 · Vue 3 · TypeScript（strict）· Clean Architecture 前端版（元件 → Application → Domain ← Proxy）

---

## 1. Design Goal & Guiding Principle

- **In one sentence:**
  把「用哪一個時區說時間」變成一個可以選、會被記住的東西，
  讓全站每一處顯示與輸入都問同一個物件要說法。

- **Guiding principle:**
  **時區是「說法」，不是「資料」。**
  領域裡的時間永遠是一個**瞬間**（`Date`），規則（五分鐘刻度、不得指向未來、查到目前為止）
  也永遠是對瞬間的規則。時區只在**進出畫面的那一層**發生作用：
  顯示時把瞬間換成當地寫法，輸入時把當地寫法換回瞬間。
  因此沒有任何既有的 domain model 需要認識時區——它們一行不改。

  換算的能力掛在**選定的時區這個物件**身上（`TimeZoneDto` 的 `formatDateTime` /
  `formatMinuteInput` / `parseMinuteInput`），元件拿到它就會說時間，
  不必再去認識任何格式化函式——這也是既有 `utilities/utc-time-format.ts` 被取代的原因：
  那份工具的參數（時區）現在有主人了。

---

## 2. Change Scope

| Area | Action | What / Why |
| :--- | :--- | :--- |
| `app/domain/models/entities/time-zone.ts` | **Add** | 一個可選時區在 domain 內的本體形狀：識別字與城市名 |
| `app/domain/models/domains/time-zone-domain.ts` | **Add** | 行為：算出目前的位移標籤、組出顯示名稱、轉 DTO |
| `app/domain/models/dto/time-zone-dto.ts` | **Add** | 交給畫面的唯一形狀，**並帶著換算能力**（顯示／輸入的雙向轉換） |
| `app/domain/interface/i-time-zone-preference-proxy.ts` | **Add** | 「記住／讀回這台瀏覽器選的時區」這個能力 |
| `app/infrastructure/proxy/time-zone-preference-proxy.ts` | **Add** | 實作（localStorage）。全站唯一碰得到瀏覽器儲存的地方 |
| `app/domain/service/time-zone-service.ts` | **Add** | 三個用例：列出可選時區、讀回選定的時區、選定一個時區 |
| `app/application/time-zone-application.ts` | **Add** | 元件唯一認識的下層 |
| `app/utilities/time-zone-format.ts` | **Add**（取代 `utc-time-format.ts`） | 機械換算：某個瞬間在某個時區的寫法、當地寫法回推瞬間、位移標籤 |
| `app/utilities/utc-time-format.ts` | **Delete** | 它的三個函式都成為 `TimeZoneDto` 的方法 |
| `app/composables/use-selected-time-zone.ts` | **Add** | 跨畫面共用的「目前選定的時區」；只呼叫 Application |
| `app/components/molecules/TimeZoneField.vue` | **Add** | 頂欄的時區選單（笨元件：收清單與目前值，換了就 emit） |
| `app/components/templates/ConsoleLayout.vue` | **Modify** | 原本寫死的 `UTC` 標記改成具名插槽 `#timezone`——樣板仍不綁任何資料 |
| `app/pages/**` （四頁） | **Modify** | 取用 composable，填上頂欄插槽，並把選定的時區往下傳 |
| `KCandleSearchPanel` / `KCandleTable` / `KCandleQueryForm` / `KCandleEditorPanel` / `KCandleForm` / `KCandleChartPanel` / `KCandleChart` | **Modify** | 多收一個 `timeZone` prop，顯示與輸入都問它 |
| `app/plugins/dependencies.ts` | **Modify** | 組裝並 provide `$timeZoneApplication` |
| `KCandleQueryDomain`、`KCandleWriteDomain`、`KCandleChartViewportDomain`、所有 proxy | **Not touched** | 領域規則與後端契約都是對**瞬間**的，與說法無關 |

---

## 3. New Classes / Modules

| Name | Kind | Responsibility (purpose) | Collaborators | Satisfies (PRD scenario) |
| :--- | :--- | :--- | :--- | :--- |
| `TimeZone` | Entity | 一個可選時區的本體形狀：IANA 識別字與城市名。只有欄位，帶一個 `toDomain()` | `TimeZoneDomain` | US-01 全部 |
| `TimeZoneDomain` | Domain Model | 算出「目前」相對於世界標準時間的位移、組出「台北（UTC+08:00）」這個說法、轉 DTO | `TimeZoneDto`、`utilities/time-zone-format` | 可選的時區都標出目前的位移 |
| `TimeZoneDto` | DTO | 畫面拿到的形狀，**並負責雙向換算**：`formatDateTime`（顯示）、`formatMinuteInput` / `parseMinuteInput`（輸入）、`toWallClock` / `fromWallClock`（給只認世界標準時間卻要照當地時鐘分格的東西，目前只有繪圖函式庫） | `utilities/time-zone-format` | US-02、US-03 全部 |
| `ITimeZonePreferenceProxy` | 介面 | 記住／讀回這台瀏覽器選的時區 | — | US-04 全部 |
| `TimeZonePreferenceProxy` | Proxy | localStorage 實作。**全站唯一碰瀏覽器儲存的檔案** | — | US-04 全部 |
| `TimeZoneService` | Domain Service | 三個互不呼叫的用例：`listSelectableTimeZones` / `restoreSelectedTimeZone` / `selectTimeZone`。清單以外的識別字一律退回世界標準時間（私有 helper `resolveTimeZone`） | `ITimeZonePreferenceProxy`、`TimeZone` | US-01、US-04 |
| `TimeZoneApplication` | Application | 元件唯一認識的下層 | `TimeZoneService` | （全部） |
| `useSelectedTimeZone` | Composable | 跨畫面共用的選定時區（`useState`），掛載後才讀回記住的那一個——避免伺服器端與瀏覽器端說法不同 | `TimeZoneApplication` | US-01、US-04 |
| `TimeZoneField` | Molecule | 頂欄的選單。收下可選清單與目前的識別字，換了就往上送 | `TimeZoneDto` | US-01 |

> **深度檢查**：任何元件要「把一個瞬間說出來」只需要 `timeZone.formatDateTime(date)`；
> 要「把使用者填的讀回來」只需要 `timeZone.parseMinuteInput(value)`。
> 換算怎麼做（Intl、日光節約時間邊界的兩次修正）全部藏在裡面。

---

## 4. Modified Components

| Name | Change | Why |
| :--- | :--- | :--- |
| `ConsoleLayout` | 寫死的 `UTC` 標記 → 具名插槽 `#timezone` | 樣板只出骨架，不綁資料；選單由頁面填進來 |
| 四個 page | 取用 `useSelectedTimeZone()`，填頂欄插槽、把 `timeZone` 往下傳 | 拿資料是 page 的事，中間層不自己去拿 |
| `KCandleTable` | 起始時間欄改問 `timeZone`，表頭標出目前位移 | 顯示 |
| `KCandleQueryForm` / `KCandleForm` | 說明文字改問 `timeZone` | 使用者要知道自己填的是哪一個時區 |
| `KCandleSearchPanel` / `KCandleEditorPanel` | 進出欄位的換算改問 `timeZone`；**換時區時把欄位裡的值以舊時區讀回瞬間、再以新時區寫出** | 換說法不該改變它指的瞬間 |
| `KCandleChartPanel` | 已取回區間的說明改問 `timeZone` | 顯示 |
| `KCandleChart` | 交給繪圖函式庫的是選定時區的**當地時鐘讀數**（`timeZone.toWallClock`），標籤直接從那份讀數讀回來；使用者拉出的區間再換回瞬間（`fromWallClock`） | 繪圖函式庫用它收到的時間的**世界標準時間**年月日決定哪一格標年、標月、標日（`weightByTime`）。餵真正的瞬間進去，分格就落在世界標準時間的午夜與元旦上，負位移的時區還會整格標成前一天、前一年 |

---

## 5. Component Relationships

```
ConsoleLayout（#timezone 插槽）
        ▲ 填入
page ──┼── useSelectedTimeZone() ──▶ TimeZoneApplication ──▶ TimeZoneService ──▶ ITimeZonePreferenceProxy
       │            │                                              │
       │            └── selectedTimeZone: TimeZoneDto              └── TimeZone → TimeZoneDomain → TimeZoneDto
       │
       └── :time-zone ──▶ organism ──▶ molecule（formatDateTime / parseMinuteInput）
```

---

## 6. Extensibility & Handoff Notes

- **要多一個時區**：在 `TimeZoneService` 的清單加一個 `TimeZone`，其餘一行不改。
- **要改日期格式**：只有 `utilities/time-zone-format.ts` 一個地方。
- **要自動偵測瀏覽器時區**：在 composable 讀回記住的值時多一個 fallback 即可，
  領域不必知道「偵測」這件事。
- **不要**讓任何 domain model 收下時區。時間在領域內永遠是瞬間；
  一旦讓規則認識時區，五分鐘刻度與「不得晚於目前時間」就會開始有兩種答案。

---

## 7. Traceability

| PRD Scenario | Realized by |
| :--- | :--- |
| 每一頁都選得到時區 | `ConsoleLayout` 插槽 + 四個 page + `TimeZoneField` |
| 預設是世界標準時間 | `TimeZoneService.restoreSelectedTimeZone`（無記錄 → UTC）、composable 的初值 |
| 可選的時區都標出目前的位移 | `TimeZoneDomain.toDto()` |
| K 線清單／圖表的時間照選定的時區 | `KCandleTable`、`KCandleChartPanel`、`KCandleChart` + `TimeZoneDto.formatDateTime` |
| 換時區時當場改用新說法且不重新查詢 | 選定的時區是共用狀態，元件只是重新渲染；沒有任何 proxy 呼叫 |
| 填進去的時間被當成當地時間 | `TimeZoneDto.parseMinuteInput` |
| 填好之後才換時區 | `KCandleSearchPanel` / `KCandleEditorPanel` 的 watch：舊時區讀回瞬間、新時區寫出 |
| 記住上次選的／記住的不在清單上 | `TimeZoneService` + `TimeZonePreferenceProxy` |

---

## 8. Risks & Open Decisions

- **伺服器端與瀏覽器端說法不同**：`localStorage` 只有瀏覽器有。因此初值一律世界標準時間，
  掛載後才讀回——比照既有畫面「預設區間在 onMounted 才取」的做法。
- **日光節約時間邊界**：當地寫法回推瞬間時要修正兩次（先以估算的位移換一次、再以換出來那一刻的位移修一次）。
  紐約的三月與十一月是這條的測試對象。日光節約時間**結束**那一天有一小時的讀數會出現兩次
  （倫敦的 01:30 有兩個瞬間），那是「當地讀數」本身的歧義：一律取後面那一個。
- **位移標籤只說得準「現在」**：`offsetLabel` 是在取清單的那一刻算的，因此只用在時區選單上。
  表格表頭與涵蓋區間的說明改標**城市名**——每一列的位移是那一列那個瞬間的，
  一個「現在的」位移會在日光節約時間前後對不上自己底下的列。
- **格式化器要快取**：一張表格一次渲染會問上千次時間怎麼寫，
  每次現建一個 `Intl.DateTimeFormat` 會把成本整份乘上去（實測千列 24ms → 2ms）。
- **五分鐘刻度**：所有清單內時區的位移都是五分鐘的整數倍，因此「起始時間須落在五分鐘刻度」
  在任何時區下看起來都仍然落在刻度上。加時區時要守住這一點。
