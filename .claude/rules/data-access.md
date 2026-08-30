# Data Access — 前端沒有資料庫，只有 Proxy

後端版的 `persistence.md`（Code First、ORM schema sync、禁手寫 SQL、一 entity 一 repository）**在前端完全不適用**——這裡沒有資料庫、沒有 ORM、沒有 migration。本檔是它的前端對應物。

## 唯一的資料入口是 Proxy

**所有跨越應用程式邊界的資料存取，一律經由 `app/infrastructure/proxy/` 底下的 Proxy。**

- `$fetch`、`useFetch`、`useAsyncData`、`axios`、`fetch`、`WebSocket`、`localStorage`、`sessionStorage`——**只准出現在 proxy 實作檔內**。
- `.vue` 元件、Application、Domain 一律透過 `app/domain/interface/` 的 `I{能力}Proxy` 介面存取，不得直接碰上述任何 API。
- 元件裡看到 `useFetch('/api/...')` 就是分層破功，一律往下推成 Proxy。

## 一個外部資源一個 Proxy

後端的「一 entity 一 repository」，在前端對應成 **「一個後端資源／端點群一個 Proxy」**：

```
GET /investment-verdicts, /investment-verdicts/history, /investment-verdicts/track-record
    → IInvestmentVerdictProxy / InvestmentVerdictProxy
```

- 同一個資源的**所有**端點（列表、歷史、單筆）都收在同一個 Proxy，**不拆 reader / writer**、不一個端點一個 Proxy。
- Proxy 介面放 `app/domain/interface/`，實作放 `app/infrastructure/proxy/`。

## Proxy 負責把 wire 格式收乾淨

**後端回傳的原始 JSON 不得漏進 domain。** Proxy 的職責是正規化：

- wire 型別（後端回傳的原始形狀）只存在於 proxy 檔內，命名 `{資源}Wire`，**不得匯出、不得進 `domain/models/`**。它是「資料一律用 class」的唯一例外——wire 描述的是外部契約，從 `JSON.parse` 來、不帶行為、不會被 `new`，所以用 `type` alias 就好（見 [code-style.md](code-style.md)）。
- 把 wire 資料轉成 **entity**（或 VO）再往內傳：日期字串 → `Date`、數字字串 → 精確小數型別、`null` → 明確的預設值或 `undefined`、snake_case → camelCase。
- 後端改欄位名時，**只有 proxy 檔要改**——這是分層的價值所在。

## 前端狀態不是持久化

瀏覽器端的狀態（Pinia store、`useState`、URL query）是**畫面狀態**，不是資料庫：

- 不把它當「資料真相」。真相永遠在後端，前端只是快取。
- 快取 / 重新整理策略寫在 Application 或 composable，**不寫進 Domain**——Domain 不該知道「資料是不是快取來的」。
- 需要跨頁共用的畫面狀態才開 store；單一頁面用得到的，留在該頁的元件內。

## 沒有 mock server、沒有假資料層

- **禁止手刻 `InMemoryXxxProxy`、`FakeXxxProxy`、`mock-data.ts`** 當開發用替身。要替身就用 mocking 套件對介面產生（見 [testing.md](testing.md)）。
- 後端還沒好時，用 Nuxt 的 server route 或外部 mock 工具擋在**網路層**，不要在程式碼裡多開一層假實作。
