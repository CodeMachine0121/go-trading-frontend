# Testing（Vitest）

## 只測業務邏輯行為

**測試的對象是業務行為，不是實作細節。**

- 驗證「給定輸入 → 得到什麼業務結果」，不驗證內部呼叫了哪些私有方法、欄位怎麼存。
- 不為 Nuxt、Vue、Vitest 或第三方套件本身寫測試。
- 測試檔一律從**外部視角**（黑箱）import 受測目標，只測公開行為；重構內部實作時測試不該跟著壞。
- 一律 table-driven / 參數化測試（`it.each`），一個案例一組輸入輸出。

## Mocking：只 mock 介面，且只用 mocking 套件

- **一律用 Vitest 的 `vi.fn()` / `vi.mock()` 對「介面」產生替身。**
- **禁止手寫假物件**——不准出現 `FakeVerdictProxy`、`InMemoryVerdictProxy`、`StubProxy` 這類自己刻的假實作 class。替身一律是 `vi.fn()` 組成、標註成 `I{能力}Proxy` 型別的物件。
- 需要被 mock 的東西一定要先有介面（`I` 前綴，放 `app/domain/interface/`）。沒有介面就先補介面，不要為了測試改用具體型別。
- mock 只設在**最外層的邊界**：proxy（後端 API、瀏覽器儲存、時間、亂數）。時間用 `vi.useFakeTimers()`，不自己包一層時鐘物件。

## 各層策略

| 層 | 策略 |
| :--- | :--- |
| **Domain Model** | 直接單元測試（業務行為的核心所在，行為都在這裡）。**測試密度最高的一層** |
| **Domain Service** | **不為它定介面**，以具體實例注入。跨物件編排較重的 service 另寫專屬測試，直接注入 mock 的 proxy |
| **Application** | 注入**真實的 domain service（連帶真實 domain model）**，**只 mock proxy 介面** |
| **`.vue` 元件** | 用 `@vue/test-utils` 掛載，注入 mock 的 Application，只驗「輸入 DTO → 渲染出什麼 / 使用者操作 → 呼叫了哪個 Application method」。**不測樣式、不測 class 名稱** |

Application 測試會**連帶測到 domain service 與 domain model**——這是刻意的「**測試力度放大**」，不要為了隔離而 mock domain service。

元件測試因為要掛載 Vue、成本最高，**只寫真的有互動邏輯的元件**；純展示元件（只把 props 攤到 template）不值得測。

## 測試放置位置

**測試與受測程式碼分離，放在專案根目錄的 `tests/`，目錄結構鏡射 `app/`**：

```
app/domain/models/domains/investment-verdict-domain.ts
tests/domain/models/domains/investment-verdict-domain.spec.ts

app/application/investment-verdict-application.ts
tests/application/investment-verdict-application.spec.ts
```

- 檔名一律 `{受測檔名}.spec.ts`。
- 一律用 `~/` alias import 受測目標，**不用相對路徑跨出 `tests/`**（`import { X } from '~/domain/...'`），確保是從外部視角 import。
- 測試用的固定資料放在測試檔內或同層的 `fixtures/`，**不放進 `app/`**。
