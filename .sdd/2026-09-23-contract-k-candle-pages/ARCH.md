# 合約 K 線的兩個畫面 — Architecture Design

**Status:** Confirmed
**Source PRD:** `.sdd/2026-09-23-contract-k-candle-pages/PRD.md`
**Tech context:** Nuxt · Vue 3 · TypeScript · Clean / Onion（元件 → Application → Domain ← Proxy）

---

## 1. Design Goal & Guiding Principle

- **In one sentence:** 合約的讀取從 proxy 一路長到畫面，但**規則一條都不另寫**——
  查詢條件、預設區間、看多長、每根涵蓋、何時重新取，全部沿用現貨那一套；
  合約只多出它自己才有的那幾樣：三條價格線、合約標的清單、沒有即時這一層。

- **Guiding principle:** **擴充既有的用例，不複製一份平行的。**

  現貨的 `KCandleService`、`KCandleChartService`、`TradingSymbolService` 各自握著
  一組只該有一份的判斷（預設看二十四小時、快捷區間與可挑粗細、顯示區間與重取條件、
  清單順序照後端）。另開三個合約 service，要嘛把那些判斷抄一份，要嘛讓合約 service
  去呼叫現貨 service——前者會慢慢長歪，後者違反「service 之間不互呼」。
  所以**每個既有 service 多一個合約的讀用例，注入一個合約的 proxy**。

  合約 K 線在圖上畫的是**成交價**，而成交價那一條就是一根普通的 K 線。
  所以合約序列在 domain 裡轉成既有的 `KCandleChartDto`，圖表元件一行都不改。

---

## 2. Change Scope

| Area | Action | What / Why |
| :--- | :--- | :--- |
| `domain/models/entities/k-candle-contract.ts` | **Add** | 合約 K 線本體：成交價、成交筆數、三條線（指數與溢價可為 null）；`toDomain()`、`toKCandle()`（成交價那一條） |
| `domain/models/domains/k-candle-contract-domain.ts` | **Add** | 解讀一根合約 K 線：漲跌沿用 `KCandleDomain`（照成交價），`toDto()` |
| `domain/models/dto/k-candle-contract-dto.ts` | **Add** | 畫面拿到的合約 K 線形狀 |
| `domain/models/dto/k-candle-contract-search-result-dto.ts` | **Add** | 一次合約查詢的結果：由新到舊、筆數、是否為空 |
| `domain/models/vo/k-candle-contract-series-vo.ts` | **Add** | 一次合約序列取回的成果：那批合約 K 線＋系統說它用了哪一種刻度 |
| `domain/models/domains/k-candle-contract-series-domain.ts` | **Add** | 合約序列變成圖表要畫的 `KCandleChartDto`（成交價那一條，透過既有 `KCandleSeriesDomain`） |
| `domain/models/entities/contract-trading-symbol.ts` · `dto/contract-trading-symbol-dto.ts` | **Add** | 合約標的：代號、是否在合約追蹤名單上 |
| `domain/models/domains/contract-trading-symbol-options-domain.ts` · `dto/contract-trading-symbol-options-dto.ts` | **Add** | 挑合約那一格這一次該長什麼樣子：選項、是否一個都沒有、該選著哪一個（預設在清單上就留著，不在就第一個，空清單維持原樣） |
| `domain/interface/i-k-candle-contract-proxy.ts` | **Add** | `findKCandleContractsInRange(query)`、`findKCandleContractSeries(loadPlan)` |
| `domain/interface/i-contract-trading-symbol-proxy.ts` | **Add** | `findContractTradingSymbols()` |
| `infrastructure/proxy/k-candle-contract-proxy.ts` | **Add** | 打 `/contract-k-candles` 與 `/contract-k-candles/series`；null 原樣往內傳 |
| `infrastructure/proxy/contract-trading-symbol-proxy.ts` | **Add** | 打 `/contract-trading-symbols` |
| `domain/service/k-candle-service.ts` · `application/k-candle-application.ts` | **Modify** | 加 `searchKCandleContracts`；注入 `IKCandleContractProxy`。**條件驗證沿用 `KCandleQueryDomain`**、預設區間沿用 `buildDefaultQuery` |
| `domain/service/k-candle-chart-service.ts` · `application/k-candle-chart-application.ts` | **Modify** | 加 `loadKCandleContractChart`；與 `loadKCandleChart` 共用一個私有的「照顯示區間取、擺位置」流程，只差取的是哪一條線 |
| `domain/service/trading-symbol-service.ts` · `application/trading-symbol-application.ts` | **Modify** | 加 `listContractTradingSymbols`、`contractOptionsFor`；注入 `IContractTradingSymbolProxy` |
| `components/molecules/ContractSymbolField.vue` | **Add** | 挑合約那一格：自己取清單、處理載入中／取不到／一個都沒有 |
| `components/molecules/KCandleQueryForm.vue` | **Modify** | 標的那一格改由使用端以插槽放進來（現貨放 `SymbolField`、合約放 `ContractSymbolField`）；開始時間與送出不變 |
| `components/molecules/KCandleChartToolbar.vue` | **Modify** | 同上：標的那一格改由插槽放進來；看多長、每根涵蓋、畫法不變 |
| `components/organisms/KCandleSearchPanel.vue` · `KCandleChartPanel.vue` | **Modify** | 把 `SymbolField` 填進上面兩個插槽，其餘不動 |
| `components/organisms/KCandleContractTable.vue` | **Add** | 合約查詢結果的表格（多三條線的收盤與成交筆數；null 畫「—」） |
| `components/organisms/KCandleContractSearchPanel.vue` | **Add** | 合約 K 線瀏覽那一整塊：條件、四種狀態、結果；**沒有維護入口** |
| `components/organisms/KCandleContractChartPanel.vue` | **Add** | 合約 K 線圖表那一整塊：控制項、常駐說明、行情數字、圖；**沒有跟盤、指標、立刻更新** |
| `pages/contract-k-candles/index.vue` · `chart.vue` | **Add** | 接線：合約 K 線瀏覽、合約 K 線圖表 |
| `pages/k-candles/index.vue` · `chart.vue` | **Modify** | 標題改「現貨 K 線瀏覽」「現貨 K 線圖表」 |
| `components/templates/ConsoleLayout.vue` | **Modify** | 導覽四個看行情的去處；合約兩個 `primary: false`（底部仍四格） |
| `plugins/dependencies.ts` | **Modify** | 把兩個合約 proxy 注入三個 service |
| `tests/**` | **Add / Modify** | 見 Traceability |

**Deliberately not touched:** `KCandleChart.vue`（畫圖）、`KCandleQuote.vue`、`KCandleTable.vue`、
`KCandleChartViewportDomain` 與取回計畫、即時跟盤、指標、策略腳本、登入後的第一站（仍是現貨圖表）。

---

## 3. New Classes / Modules

| Name | Layer | Responsibility | Collaborators | Satisfies |
| :--- | :--- | :--- | :--- | :--- |
| `KCandleContract` | entity | 合約 K 線的欄位；`toKCandle()` 給出成交價那一條 | `KCandleContractDomain`、`KCandle` | US-02、US-03 |
| `KCandleContractDomain` | domain model | 漲跌（委派 `KCandleDomain`）→ `KCandleContractDto` | `KCandleDomain` | US-02 |
| `KCandleContractSeriesDomain` | domain model | 合約序列 → `KCandleChartDto`（成交價） | `KCandleSeriesDomain` | US-03 |
| `ContractTradingSymbolOptionsDomain` | domain model | 挑合約那一格的選項與該選著誰 | — | US-04 |
| `KCandleContractProxy` | infrastructure | 合約 K 線的兩個讀取；wire → entity | `BackendApiProxy` | US-02、US-03 |
| `ContractTradingSymbolProxy` | infrastructure | 合約標的清單 | `BackendApiProxy` | US-04 |
| `ContractSymbolField` | molecule | 挑合約 | `TradingSymbolApplication` | US-04 |
| `KCandleContractTable` | organism | 列合約 K 線 | `AppPanel` | US-02 |
| `KCandleContractSearchPanel` | organism | 合約瀏覽互動 | `KCandleQueryForm`、`ContractSymbolField`、`KCandleContractTable` | US-02 |
| `KCandleContractChartPanel` | organism | 合約圖表互動 | `KCandleChartToolbar`、`ContractSymbolField`、`KCandleQuote`、`KCandleChart` | US-03 |

---

## 4. Modified Components

- **`KCandleChartService.loadKCandleChart`**：主體抽成私有的 `loadChartFrom(viewport, fetchChart)`，
  由 `loadKCandleChart` 與 `loadKCandleContractChart` 共用（兩個 public 呼叫者，符合 private 門檻）。
  現貨行為逐字不變——既有測試全數原樣通過就是證明。
- **`KCandleQueryForm` / `KCandleChartToolbar`**：`tradingSymbolApplication`、`symbolError` 兩個 prop
  與 `symbol` model 移出，改成一個 `symbol` 插槽。一個 UI 概念一個元件——
  「查詢條件表單」「圖表控制列」各自仍只有一個，換的只是標的那一格。

---

## 5. Component Relationships

```
pages/contract-k-candles/index.vue ─▶ KCandleContractSearchPanel ─▶ KCandleQueryForm[#symbol=ContractSymbolField]
                                                                 └▶ KCandleContractTable
pages/contract-k-candles/chart.vue ─▶ KCandleContractChartPanel ─▶ KCandleChartToolbar[#symbol=ContractSymbolField]
                                                                 └▶ KCandleQuote · KCandleChart
KCandleApplication.searchKCandleContracts ─▶ KCandleService ─▶ IKCandleContractProxy.findKCandleContractsInRange
KCandleChartApplication.loadKCandleContractChart ─▶ KCandleChartService ─▶ IKCandleContractProxy.findKCandleContractSeries
TradingSymbolApplication.listContractTradingSymbols / contractOptionsFor ─▶ TradingSymbolService ─▶ IContractTradingSymbolProxy
```

---

## 6. Extensibility & Handoff Notes

- **Most likely next requirement:** 在合約圖上疊畫標記價格／指數價格線，或在合約瀏覽加上手動維護。
- **Seam that absorbs it:** 合約 K 線整根（三條線）一路帶到 `KCandleContractSeriesVo`；
  要畫第二條線時從 `KCandleContractSeriesDomain` 多轉出一組線，不必回頭改 proxy。
  手動維護則是 `IKCandleContractProxy` 加寫入方法、`KCandleService` 加用例，與現貨同形。
- **What a new engineer must know:** 合約的規則**沒有自己的一份**——要改預設區間、快捷區間或重取條件，
  改的是現貨那一份，兩條線一起變。這是刻意的。

---

## 7. Traceability

| PRD Scenario | Fulfilled by | Test |
| :--- | :--- | :--- |
| US-01 導覽上四個去處都在 · 窄螢幕底部仍是四格 | `ConsoleLayout` DESTINATIONS | `tests/components/templates/ConsoleLayout.spec.ts` |
| US-01 既有畫面只換名字 | `pages/k-candles/*.vue` | 頁面標題斷言（頁面測試或 `ConsoleLayout` 標題） |
| US-02 由新到舊 · 三條價格線 · 負溢價 | `KCandleService.searchKCandleContracts`、`KCandleContractDomain`、`KCandleContractProxy`、`KCandleContractTable` | application / proxy / organism 測試 |
| US-02 舊合約 K 線沒有指數與溢價 | proxy null 原樣、表格畫「—」 | proxy / organism 測試 |
| US-02 沒挑合約 · 開始時間在未來 | `KCandleQueryDomain`（沿用） | application 測試 |
| US-02 只讀合約那一條線 | `KCandleContractProxy` 打 `/contract-k-candles` | proxy 測試 |
| US-02 連不上 · 一根都沒有 · 這裡只讀 | `KCandleContractSearchPanel` | organism 測試 |
| US-03 一進來看一天 · 換粗細 · 拉遠拉近 · 太長被拒 · 沒資料 | `KCandleChartService.loadKCandleContractChart`、`KCandleContractSeriesDomain`、`KCandleContractChartPanel` | application / organism 測試 |
| US-03 明說沒有即時與指標 · 沒有現貨才有的控制項 | `KCandleContractChartPanel` | organism 測試 |
| US-04 全部四個情境 | `ContractTradingSymbolOptionsDomain`、`ContractSymbolField` | domain / molecule 測試 |

---

## 8. Risks & Open Decisions

- 後端合約序列未部署時合約圖表會被拒絕；照既有被拒絕的方式呈現。
- 側欄收起時合約與現貨的圖示相同，靠標題提示區分；若要不同圖示是另一刀。
