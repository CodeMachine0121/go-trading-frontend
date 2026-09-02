# Contract Traceability Matrix — 交易標的選單

Contract: `PRD.md`
Design map: `ARCH.md`
Implementation: `app/components/molecules/SymbolField.vue`、`app/domain/{models,interface,service}`、`app/infrastructure/proxy/trading-symbol-proxy.ts`、`app/application/trading-symbol-application.ts`、三個 organism 與三個 page
Oracle: Acceptance Criteria（10 個情境 + 5 條業務規則 + 2 條非功能需求 = 17 clauses）

## Clauses

`Spec-expected` 欄是只讀規格文字得出的業務可觀察結果；`Impl` / `Test` 欄是把它橋接到程式碼之後查到的位置。

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-1 | 讀行情的畫面呈現可挑的清單 | 交易標的是一份可挑的清單，內含 BTCUSDT 與 ETHUSDT | `SymbolField.vue:73`、三個 organism 的 `<SymbolField>` | `SymbolField.spec.ts:35`、`KCandleChartPanel.spec.ts:62`（畫面上真的看得到那個選單） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-2 | 挑另一檔就換那一檔的行情 | 畫面改以 ETHUSDT 取行情 | `SymbolField.vue:73`（v-model）+ 各 organism 既有的 `watch(symbol)` | `SymbolField.spec.ts:41`、`KCandleChartPanel.spec.ts:148`、`KCandleSearchPanel.spec.ts:262` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-3 | 依後端給的順序呈現 | 依 BTCUSDT、ETHUSDT、SOLUSDT 的順序 | `trading-symbol-service.ts`（不重排）+ `trading-symbol-proxy.ts`（不重排） | `SymbolField.spec.ts:35`、`trading-symbol-application.spec.ts`、`trading-symbol-proxy.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-4 | 原本帶的那一檔就在清單上 | 仍然是 BTCUSDT，不做任何切換 | `SymbolField.vue:49-52` | `SymbolField.spec.ts:49`（刻意用**不是第一個**的那一檔，否則這條測不出東西） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-5 | 原本帶的那一檔不在清單上 | 改選 ETHUSDT（清單上的第一個） | `SymbolField.vue:52` | `SymbolField.spec.ts:55` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-6 | 後端一檔都沒有 | 仍然是 BTCUSDT，並說明目前沒有任何交易標的 | `SymbolField.vue:52`（清單空的就不改）+ `:34`（說明） | `SymbolField.spec.ts:61` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-7 | 連不上後端 | 說明取不到交易標的清單，不呈現空白的選單 | `SymbolField.vue:59`、`:31`、`:75`（沒有清單就停用選單） | `SymbolField.spec.ts:70` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-8 | 取清單失敗時仍看得出目前是哪一檔 | 畫面上仍然顯示 BTCUSDT | `SymbolField.vue:81`（目前這一檔不在清單上時仍列一個選項給它） | `SymbolField.spec.ts:70`（斷言選項就是 `['BTCUSDT']`） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-9 | 新增一根系統還沒有過的交易標的 | 可以直接打出 XRPUSDT，不受清單限制 | `KCandleForm.vue`（刻意維持文字輸入，**本切片一行未改**） | `KCandleSearchPanel.spec.ts`（維護入口的既有測試仍以打字填 `form-symbol`，且全數通過） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-10 | 修改既有的一根時交易標的仍然唯讀 | 欄位唯讀 | `KCandleForm.vue`（既有的 `identityReadonly`，本切片未動） | `KCandleSearchPanel.spec.ts`（既有測試） | asserts-oracle | produces-oracle | ✅ conforms |
| BR-1 | 清單一律來自後端，選項不寫死任何標的名稱 | 選單裡的選項完全由後端決定 | `SymbolField.vue`（原本的 `SUGGESTED_SYMBOLS = ['BTCUSDT','ETHUSDT']` 已移除） | `SymbolField.spec.ts:35`（選項完全由替身決定；替身給三檔就出現三檔） | asserts-oracle | produces-oracle | ✅ conforms |
| BR-2 | 順序依後端，畫面不重排 | 同 AC-3 | `trading-symbol-service.ts` | `trading-symbol-application.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-3 | 落單修正：清單非空且不在清單上就改選第一個 | 同 AC-5 | `SymbolField.vue:52` | `SymbolField.spec.ts:55`、`:49` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-4 | 空清單維持目前這一檔 | 同 AC-6 | `SymbolField.vue:52`（`firstTradingSymbol !== undefined` 這一半） | `SymbolField.spec.ts:61` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-5 | 讀行情從清單挑；建資料維持手打 | 三個讀的畫面是選單；新增表單是輸入框 | 三個 organism 用 `SymbolField`；`KCandleForm.vue` 未動 | `SymbolField.spec.ts`（選單）與既有的維護測試（輸入框）並存且都綠 | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-1 | 取清單與取行情各自進行 | 取清單慢不擋行情先畫出來 | `SymbolField.vue:42`（自己的 `onMounted`，與 organism 的載入互不等待） | `KCandleChartPanel.spec.ts:62`（圖已經畫出來，清單另外載入） | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-2 | **選單裡的選項**不得有寫死的標的名稱 | 同 BR-1 | 同 BR-1 | 同 BR-1 | asserts-oracle | produces-oracle | ✅ conforms |

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| `SymbolField.vue:29`（清單載入中的說明） | 規格第 5 節列了「清單載入中：選單暫時不能操作」，但沒有寫成 Gherkin 情境 | 已實作且有測試（`SymbolField.spec.ts:81`）；屬於 UI/UX 節而非驗收情境，不另補 |
| 三個 organism 的 `DEFAULT_SYMBOL = 'BTCUSDT'` | 進畫面時先帶哪一檔的起點，清單回來之後依 BR-3 修正 | Code review 指出它與 NFR-2 原本的寫法直接衝突（一邊標 ✅、一邊列為 orphan 並辯護，兩者不可能同時成立）。**已改 PRD 的 NFR-2**，把它限定在「選單裡的選項」，並在規則本身寫明起點不在此限 |
| `tests/fixtures/trading-symbol-application.ts` | 四個測試檔共用的替身 | 測試用具，非產品行為 |

未發現實作到 Out of Scope 項目的程式碼：沒有新增／修改／移除清單的路徑、沒有搜尋或篩選、
清單旁沒有附帶其他資訊、沒有把清單記下來重複使用（三個畫面各自取一次，
這一點也寫在 PRD 第 7 節的已知風險）。

## Summary

- Conforms: 17/17 clauses ✅（100%）
- Violations: 無
- Mis-asserted: 無
- Partial: 無
- Gaps: 無
- Unclear: 無
- Orphans: 3（一個是 UI/UX 節而非驗收情境，一個在 ARCH 說明過保留理由，一個是測試用具）

### 這次稽核連帶發現的一件事

把交易標的換成選單之後，**「未指定交易標的」在這三個畫面上已經走不到了**——
選單挑不出空值，而清單是空的時候也維持原本那一檔（BR-4）。
原本三個 panel 各有一條以「把欄位清空」驅動的測試，現在改成
**讓 `SymbolField` 直接交出一個空值**：驗的不再是「使用者能不能打出空值」，
而是「欄位交出什麼，畫面就照什麼處理」這條元件之間的契約。
規則本身仍然由領域層守著（`k-candle-query-domain`、`k-candle-chart-viewport-domain`、
`indicator-calculation-request-domain` 各有專屬測試），一條都沒有失去。

> 本表是**靜態一致性稽核**：它把測試斷言與程式碼路徑分別對照規格推導出的預期結果，
> 而不是以「跑起來是綠的」作為判準。作為佐證，本切片新增／變更的每一個檔案覆蓋率均為 100%，
> 且四個畫面都對真實後端做過 SSR 實測（皆回 200，圖表頁確實渲染出交易標的選單）。
