# Contract Traceability Matrix — 合約 K 線的兩個畫面

Contract: `.sdd/2026-09-23-contract-k-candle-pages/PRD.md`
Design map: `.sdd/2026-09-23-contract-k-candle-pages/ARCH.md`（§7 Traceability）
Implementation: `app/pages/contract-k-candles` · `app/components` · `app/domain` · `app/application` · `app/infrastructure/proxy`（`git diff main...HEAD`，branch `feat/contract-k-candle-pages`）
Oracle: Acceptance Criteria — 43 clauses（23 `AC-`、5 `BR-`、3 `EC-`、4 `UI-`、3 `NFR-`、5 `OOS-`）

`T/` = `tests/`、`A/` = `app/`。每一條的 oracle 都是**先只讀 PRD 寫下**，之後才打開程式碼與測試。
AC 依 Section 3 的 Scenario 順序編號；EC 取自 §4 Edge Cases；UI 取自 §5；OOS 取自 §1 Out of Scope（實作了 out-of-scope 的東西就是違規）。

## Clauses

### US-01 — 名字說出是哪一條線

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-1 | 導覽上四個去處都在 | 導覽上看得到「現貨 K 線瀏覽」「現貨 K 線圖表」「合約 K 線瀏覽」「合約 K 線圖表」四個名字 | `A/components/templates/ConsoleLayout.vue:31-35` DESTINATIONS | `T/components/templates/ConsoleLayout.spec.ts:87`「提供各畫面之間的導覽，而且是照那個順序」（整排標籤逐字 `toEqual`） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-2 | 既有畫面只換名字 | 原本看圖的畫面標題是「現貨 K 線圖表」；原本查詢的畫面標題是「現貨 K 線瀏覽」 | `A/pages/k-candles/chart.vue:34`、`A/pages/k-candles/index.vue:24`（`ConsoleLayout` 的 `title`） | **無**。`ConsoleLayout.spec.ts` 斷言的是導覽標籤，而且全檔以 `title: 'K 線瀏覽'` 掛載；沒有任何測試掛載 `pages/k-candles/*.vue` 讀它的標題 | no-test | produces-oracle | 🟡 partial |
| AC-3 | 窄螢幕底部仍是四格 | 窄螢幕底部仍是四格（加「更多」）；合約兩個去處在「更多」裡 | `ConsoleLayout.vue:34-35`（`primary: false`）、`:53-54` | `ConsoleLayout.spec.ts:213`（`tab-` 共 5 格＝4＋更多）、`:219`（`more-/contract-k-candles`、`more-/contract-k-candles/chart` 在紙裡） | asserts-oracle | produces-oracle | ✅ conforms |

### US-02 — 查一段合約 K 線

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-4 | 由新到舊列出，帶著三條價格線 | 兩列，08:01 在上；每列有標記價格收盤、指數價格收盤、溢價指數收盤、成交筆數 | `A/domain/service/k-candle-service.ts:53-67`（排序）、`A/components/organisms/KCandleContractTable.vue:116-134` | `T/components/organisms/KCandleContractSearchPanel.spec.ts:91`；`T/application/k-candle-application.spec.ts:219`（順序逐項 `toEqual`） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-5 | 舊合約 K 線沒有指數價格與溢價指數 | 那兩格顯示「—」，不是 0 | `A/infrastructure/proxy/k-candle-contract-proxy.ts:125-134`（null 原樣）、`KCandleContractTable.vue:23,123-134` | `KCandleContractSearchPanel.spec.ts:111`（逐格 `toBe('—')`）；`T/infrastructure/proxy/k-candle-contract-proxy.spec.ts:118`；`k-candle-application.spec.ts:259` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-6 | 負的溢價照原樣顯示 | 那一格顯示 `-0.0005` | proxy `:113-115`（`Decimal` 由字串建）、表格 `:133`（`toString()`） | `KCandleContractSearchPanel.spec.ts:107`；`k-candle-contract-proxy.spec.ts:103` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-7 | 沒有挑合約不送出 | 不打合約 K 線查詢；挑合約那一格旁寫「請指定交易標的」 | `k-candle-service.ts:55`（`KCandleQueryDomain` 先驗）、`KCandleContractSearchPanel.vue:76-79,117` | `KCandleContractSearchPanel.spec.ts:135`（proxy 未被呼叫＋錯誤在 `ContractSymbolField` 內）；`k-candle-application.spec.ts:294` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-8 | 開始時間在未來不送出 | 不送出；開始時間旁寫「開始時間不得晚於目前時間」 | 同上、`KCandleContractSearchPanel.vue:80-82,110` | `KCandleContractSearchPanel.spec.ts:148`；`k-candle-application.spec.ts:294` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-9 | 只讀合約那一條線 | 查的是合約那一條（`/contract-k-candles`），現貨那一條一次都沒被問 | `k-candle-contract-proxy.ts:11,56-63` | `k-candle-contract-proxy.spec.ts:86`（URL 逐字）；`KCandleContractSearchPanel.spec.ts:124`；`k-candle-application.spec.ts:273`（spot proxy 未被呼叫） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-10 | 連不上交易服務 | 畫面說連不上後端，並有一顆重試；按下去再查一次 | `KCandleContractSearchPanel.vue:90-91,148-164` | `KCandleContractSearchPanel.spec.ts:159`（訊息＋按重試後列出一列） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-11 | 一根都沒有 | 畫面說「查無 K 線」，不是錯誤 | `KCandleContractSearchResultDto.isEmpty`、`KCandleContractTable.vue:47-53` | `KCandleContractSearchPanel.spec.ts:188`（查無＋沒有 rejected alert）；`k-candle-application.spec.ts:285` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12 | 這裡只讀 | 查詢結果那一塊沒有新增、編輯、刪除的入口 | `KCandleContractSearchPanel.vue`（未引入 `KCandleEditorPanel`，沒有 `row-actions`） | `KCandleContractSearchPanel.spec.ts:197`（`create-button`／`edit-button`／「新增 K 線」都不在；刪除在現貨只從 `edit-button` 開的編輯面板進得去，故涵蓋） | asserts-oracle | produces-oracle | ✅ conforms |

### US-03 — 看合約的走勢圖

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-13 | 一進來看最近一天 | 取 BTCUSDT、顯示區間＝現在往前 24 小時；每根涵蓋標系統回報的那一種；行情大字＝最新那一根的**成交價**收盤 | `A/components/organisms/KCandleContractChartPanel.vue:24,40,166-171,263-283`；`A/domain/service/k-candle-chart-service.ts:143-149` | `T/components/organisms/KCandleContractChartPanel.spec.ts:91`（區間逐字、`十五分鐘` 來自回覆、quote 含 `105.5` 而標記價格設成 `7777` 可區分）；`T/application/k-candle-chart-application.spec.ts:389` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-14 | 換每根涵蓋，看的那一段不動 | 顯示區間不變、以五分鐘重取；標「五分鐘」 | `KCandleContractChartPanel.vue:150-161` | `KCandleContractChartPanel.spec.ts:110`；`k-candle-chart-application.spec.ts:411` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-15 | 拉遠拉近 | 圖換成拉遠後那一段（重取並換上新的一批）；挑「自動」時不說刻度，由系統換粗，畫面標系統回報的那一種 | `KCandleContractChartPanel.vue:141-148,304-311`；proxy `:72-81`（自動不帶 `interval`） | `KCandleContractChartPanel.spec.ts:126`「在圖上拉遠時換成那一段」——**只斷言第二次請求的 `visibleStartTime`**。mock 兩次都回 `15m`，所以沒有驗到「系統換粗後標的跟著換」，也沒驗圖換上新那一批 | **shallow** | produces-oracle | 🟠 mis-asserted |
| AC-16 | 明說沒有即時跟盤與指標 | 圖的上方有一句話：合約圖表沒有即時跟盤、沒有指標，資料由背景每分鐘同步 | `KCandleContractChartPanel.vue:204-209` | `KCandleContractChartPanel.spec.ts:153`（三個片語逐一 `toContain`） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-17 | 沒有現貨才有的控制項 | 沒有套用指標那一塊；沒有「立刻更新」按鈕 | `KCandleContractChartPanel.vue`（未引入 `ChartIndicatorPanel`、無 catch-up）；`A/pages/contract-k-candles/chart.vue:9` 不注入指標／即時／腳本 application | `KCandleContractChartPanel.spec.ts:164`（兩者不在＋正向保險：`ContractSymbolField` 在） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-18 | 固定粗細而那一段太長 | 畫面照系統說的原因呈現（縮短區間或改更粗），畫面不自行預先擋下 | `KCandleContractChartPanel.vue:115-117,211-217`；proxy 把 `interval` 送出去、由後端判 | `KCandleContractChartPanel.spec.ts:176`（挑 1m → 後端拒絕 → alert 逐字）；`k-candle-chart-application.spec.ts:452` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-19 | 那段時間沒有資料 | 畫面說「查無 K 線」 | `KCandleContractChartPanel.vue:296-302` | `KCandleContractChartPanel.spec.ts:205`；`k-candle-chart-application.spec.ts:442` | asserts-oracle | produces-oracle | ✅ conforms |

### US-04 — 從合約標的清單挑

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-20 | 清單上的都能挑，預設那一個先選著 | BTCUSDT、ETHUSDT 都是選項；BTCUSDT 選著 | `A/components/molecules/ContractSymbolField.vue:29-30,84-90`；`A/domain/models/domains/contract-trading-symbol-options-domain.ts:19-30` | `T/components/molecules/ContractSymbolField.spec.ts:36`（選項逐字、value `BTCUSDT`、未改選）；`T/application/trading-symbol-application.spec.ts:82` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-21 | 預設那一個不在清單上 | 改選清單上的第一個（ETHUSDT） | `ContractSymbolField.vue:51`、options domain `:26-28` | `ContractSymbolField.spec.ts:46`（emit `ETHUSDT`）；`trading-symbol-application.spec.ts:82` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-22 | 一個都沒有 | 那一格說目前沒有任何合約標的，要先加進合約追蹤名單 | `ContractSymbolField.vue:39-41` | `ContractSymbolField.spec.ts:55`（逐字） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-23 | 清單取不到 | 那一格說取不到合約標的清單，請確認後端已啟動 | `ContractSymbolField.vue:36-38,53-57` | `ContractSymbolField.spec.ts:63`（逐字） | asserts-oracle | produces-oracle | ✅ conforms |

### Section 4 — Core Business Rules

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| BR-1 | 兩條線各看各的 | 合約畫面只讀合約那一條、只從合約標的清單挑；現貨畫面仍只讀現貨 | 合約 panel 只用 `ContractSymbolField`＋`searchKCandleContracts`／`loadKCandleContractChart`；`A/infrastructure/proxy/contract-trading-symbol-proxy.ts:5` | AC-9；`KCandleContractSearchPanel.spec.ts:83`（現貨的 `symbol-select` 不在）；`KCandleContractChartPanel.spec.ts:91`（spot series 未被呼叫）；`T/infrastructure/proxy/contract-trading-symbol-proxy.spec.ts`；現貨 panel 既有測試原樣綠 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-2 | 查詢條件規則與現貨相同 | 一定要標的、開始時間不得空白、不得晚於現在、查到送出當下 | `k-candle-service.ts:55` 沿用同一個 `KCandleQueryDomain`；預設用同一個 `buildDefaultQuery`（`KCandleContractSearchPanel.vue:43-47`） | `k-candle-application.spec.ts:294`（三種不合法逐條，含「請填寫開始時間」）；查到當下由 `KCandleQueryDomain` 的既有測試守；`KCandleContractSearchPanel.spec.ts:83`（預設 24 小時前） | asserts-oracle | produces-oracle | ✅ conforms |
| BR-3 | 「沒有這一項」與零分得開 | 舊合約 K 線的指數／溢價畫「—」 | 同 AC-5 | 同 AC-5 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-4 | 圖表的看法與現貨共用同一套 | 預設長度、快捷區間、粗細、何時重取、被拒絕怎麼說一字不差 | `k-candle-chart-service.ts:129-168`（私有 `loadChartFrom` 兩線共用）；panel 從同一個 application 取 presets／choices | `k-candle-chart-application.spec.ts:426`（不重取規則）；`KCandleContractChartPanel.spec.ts:261`（快捷區間）、`:324`（小幅拖動不重取）；現貨圖表既有測試原樣綠證明共用抽出後行為不變 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-5 | 合約圖表沒有即時這一層，而且明說 | 沒有即時／指標／立刻更新，且有常駐說明 | 同 AC-16、AC-17 | 同 AC-16、AC-17 | asserts-oracle | produces-oracle | ✅ conforms |

### Section 4 — Edge Cases

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| EC-1 | 清單還在路上時，預設的那一個照樣顯示著 | 載入中，挑合約那一格仍顯示 BTCUSDT | `ContractSymbolField.vue:77-83`（目前那一個不在選項上時補一個 option）＋`:33-35` | `ContractSymbolField.spec.ts:73`「清單還在路上時說正在取」——**只斷言提示文字「取合約標的清單中…」**，沒斷言選單裡仍是 `BTCUSDT` | **shallow** | produces-oracle | 🟠 mis-asserted |
| EC-2 | 清單是空的時候不清空 | 欄位維持原來那一個，不變成空白 | options domain `:26-28`（`?? this.selectedSymbol`） | `ContractSymbolField.spec.ts:55`（沒有 emit、選項仍是 `BTCUSDT`）；`trading-symbol-application.spec.ts:82` | asserts-oracle | produces-oracle | ✅ conforms |
| EC-3 | 換時區只換說法 | 開始時間那一格改以新時區寫出同一個瞬間 | `KCandleContractSearchPanel.vue:49-57` | `KCandleContractSearchPanel.spec.ts:209`（UTC 12:00 → 台北 20:00）、`:217`（空白不動） | asserts-oracle | produces-oracle | ✅ conforms |

### Section 5 — UI/UX

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| UI-1 | 版面與現貨一致 | 瀏覽＝「查詢條件」＋「查詢結果」兩塊；圖表＝「看什麼」＋行情數字＋圖 | `KCandleContractSearchPanel.vue:105`、`KCandleContractTable.vue:28`；`KCandleContractChartPanel.vue:177,263,270` | **無**（沒有任何測試讀這幾塊的標題） | no-test | produces-oracle | 🟡 partial |
| UI-2 | 合約瀏覽的表格欄位 | 時間、開、高、低、收、漲跌、成交量、成交筆數、標記／指數／溢價收盤，共 11 欄 | `KCandleContractTable.vue:60-95`（11 欄都在；**漲跌排在第二欄**，與現貨表 `KCandleTable.vue:76` 相同位置，而非 PRD 列舉的收盤之後） | **無**表頭斷言；AC-4 只以 `data-testid` 讀其中四格 | no-test | produces-oracle *(欄位齊全；順序與 PRD 列舉不同但與現貨表一致，視為列舉而非排序規定)* | 🟡 partial |
| UI-3 | 那一句說明常駐圖的上方，收起控制項時不被收走 | 收起「看什麼」之後那句話仍在 | `KCandleContractChartPanel.vue:200-209`（住在 collapsible `AppPanel` 之外） | **無**。`KCandleContractChartPanel.spec.ts:153` 以 `onADesktop()`（控制項展開）掛載，沒有收起後再讀一次 | no-test | produces-oracle | 🟡 partial |
| UI-4 | 手機直立（390）可讀可用，表格可橫捲 | 表格在窄寬度下橫向捲動、時間欄釘住 | `KCandleContractTable.vue:155-163`（`overflow: auto`＋`time-series-table` mixin）；`A/assets/styles/abstracts/_mixins.scss` | **無**（jsdom 量不到版面；需人工或 E2E） | no-test | produces-oracle | 🟡 partial |

### Section 6 — Non-Functional Requirements

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| NFR-1 | 每個畫面都有載入中／查無／被拒絕／連不上四種狀態，說法沿用現貨 | 兩個畫面四種狀態各自出現，文字與現貨相同 | 瀏覽 `KCandleContractSearchPanel.vue:122-172`；圖表 `KCandleContractChartPanel.vue:211-261`（「查詢中…」「取行情中…」與連不上那句與 `KCandleSearchPanel.vue:176,194`、`KCandleChartPanel.vue:541,559` 逐字相同） | 查無／被拒絕／連不上兩個畫面都有測試（`SearchPanel.spec.ts:159,175,188`；`ChartPanel.spec.ts:176,191,205`）。**載入中兩個畫面都沒有正向斷言**——圖表只斷言 `loading-alert` 不在（`:298`），瀏覽完全沒碰 | no-test（載入中那一格） | produces-oracle | 🟡 partial |
| NFR-2 | 根數上限由後端決定，畫面如實轉達被拒絕的原因 | 被拒絕時顯示後端給的那句話 | proxy 經 `BackendApiProxy` 包成 `BackendRequestRejectedError`；兩個 panel 原樣顯示 | `k-candle-contract-proxy.spec.ts`「被拒絕時把後端說的原因包成可轉達的錯誤」；`SearchPanel.spec.ts:175`；`ChartPanel.spec.ts:176` | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-3 | 金額與價格一律精確小數 | 每個價格欄由字串建 `Decimal`，不經 `Number` | `k-candle-contract-proxy.ts:95-133`（全部 `new Decimal(string)`；`tradeCount` 為筆數非金額） | `k-candle-contract-proxy.spec.ts:103`（`-0.0005`、`-0.0006` 經 `toString()` 逐字） | asserts-oracle | produces-oracle | ✅ conforms |

### Section 1 — Out of Scope（實作了就是違規）

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| OOS-1 | 不手動新增／修改／刪除／補齊合約 K 線 | 沒有任何合約寫入入口或 proxy 方法 | `A/domain/interface/i-k-candle-contract-proxy.ts` 只有兩個讀方法 | AC-12 | asserts-oracle | produces-oracle | ✅ conforms |
| OOS-2 | 合約圖表無即時跟盤、指標、腳本套用、立刻更新 | 都不在 | 同 AC-17 | AC-17 | asserts-oracle | produces-oracle | ✅ conforms |
| OOS-3 | 不在圖上另畫標記／指數／溢價 | 圖只拿到成交價那一條 | `A/domain/models/domains/k-candle-contract-series-domain.ts:20-29`（`toKCandle()`） | `k-candle-chart-application.spec.ts:389`（標記價格 `7777` 不出現，`latestKCandle` 是成交價 `105`） | asserts-oracle | produces-oracle | ✅ conforms |
| OOS-4 | 不做資金費率／持倉／保證金分級／追蹤名單增減畫面 | 導覽與 pages 只多兩個合約 K 線畫面 | `A/pages/contract-k-candles/` 只有 `index.vue`、`chart.vue` | `ConsoleLayout.spec.ts:87`（整排去處逐字 `toEqual`） | asserts-oracle | produces-oracle | ✅ conforms |
| OOS-5 | 現貨兩個畫面只改名字 | 現貨畫面行為不變 | `KCandleSearchPanel.vue`、`KCandleChartPanel.vue` 只把 `SymbolField` 改由插槽放進 form／toolbar | 現貨 panel 既有測試原樣綠（改動只是建構子多一個 contract proxy）；`KCandleQueryForm.spec.ts`／`KCandleChartToolbar.spec.ts` 移除的「標的沒填」「改標的往上送」由 `KCandleSearchPanel.spec.ts:150` 與 `SymbolField.spec.ts:106` 接住 | asserts-oracle | produces-oracle *(另見 Orphans 第一列的樣式副作用)* | ✅ conforms |

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| `A/components/organisms/KCandleTable.vue:178-186` ＋ `_mixins.scss` `time-series-table` | 抽 mixin 時把 `&__absent` 搬進 `&__table` 裡——原本那條規則被 `td` 的顏色蓋掉、**實際沒有生效**，現在生效了：**現貨表格**裡「—」那幾格變淡。這是現貨畫面一處看得見的改變，而 OOS-5 說現貨只改名字 | 輕微；可視為修一個隱性 bug，但應在 PRD／commit 裡說出來，或補一條現貨表格的斷言釘住它 |
| `ContractSymbolField.vue:89` | 不在合約追蹤名單上的標的後面加「（未追蹤）」 | 良性（UL-MAP「合約標的」提到追蹤名單；有測試 `ContractSymbolField.spec.ts:36`），PRD 未寫 |
| `k-candle-contract-proxy.ts:119-134` | 一條線四個數字缺任何一個就整條當 `null` | 良性，是 BR-3 的保守延伸；有測試 `k-candle-contract-proxy.spec.ts` `it.each`（只缺開盤／只缺收盤） |
| `KCandleContractChartPanel.vue:86-93` | 挑不到任何合約（空字串）時圖表不送出、也不顯示錯誤 | 良性，與 EC-2「不怪使用者沒填」同一理由；有測試 `ChartPanel.spec.ts:213` |
| 兩個 panel 的 `server-error-alert` 與「未預期的錯誤」退路 | PRD 的四種狀態之外多一種「後端出錯」與一個兜底句 | 良性，沿用現貨畫面；皆有測試 |
| `KCandleContractChartPanel.vue:66-67,98,108` | 只採用最後一次請求的結果 | 良性，沿用現貨圖表；有測試 `ChartPanel.spec.ts:277,301` |

## Summary

- Conforms: **35/43** clauses ✅（81.4%）
- Violations: 無
- Mis-asserted: **2** 🟠 — AC-15、EC-1
- Partial: **6** 🟡 — AC-2、UI-1、UI-2、UI-3、UI-4、NFR-1
- Gaps: 無
- Orphans: 6（1 個需要說明的現貨樣式副作用，其餘良性）

### 不一致的地方與修法

| ID | 哪裡不對 | 修法 |
| :--- | :--- | :--- |
| AC-15 🟠 | `T/components/organisms/KCandleContractChartPanel.spec.ts:126-138` 只驗第二次請求的開始時間；mock 兩次都回 `15m`，拿掉「換上新那一批」或讓標籤不跟著回覆，測試照樣綠 | 讓第二次回 `interval: '1h'` 的另一批，斷言 `interval-label` 為「一小時」、`KCandleChart` 的 `chart` 是新那一批，並斷言 `loadPlan.aggregationIntervalChoice.declaredInterval` 為 `null`（自動＝由系統換粗） |
| EC-1 🟠 | `T/components/molecules/ContractSymbolField.spec.ts:73-84` 只斷言提示文字 | 在同一條加上 `optionTexts(wrapper)` 為 `['BTCUSDT']` 且 select value 為 `BTCUSDT` |
| AC-2 🟡 | `A/pages/k-candles/chart.vue:34`、`index.vue:24` 的標題沒有任何測試 | 補頁面測試（`mountSuspended` 掛兩個頁面讀 `ConsoleLayout` 的 `title`），或在 ARCH 所說的「頁面標題斷言」落地 |
| UI-1 🟡 | 兩個畫面的區塊標題沒有斷言 | 在兩個 panel spec 各補一條讀 `AppPanel` 標題（查詢條件／查詢結果；看什麼＋圖標題） |
| UI-2 🟡 | `KCandleContractTable.vue:60-95` 的 11 個表頭沒有斷言；漲跌的位置與 PRD 列舉不同 | 補一條表頭逐字 `toEqual`；並把 PRD §5 的欄位列舉改成與實作／現貨表相同的順序（或反過來改表格），讓兩者一致 |
| UI-3 🟡 | 「收起控制項時那句話不被收走」沒有測試 | 以 `startsChartControlsCollapsed: true` 的 layout density 掛載（或按收起），斷言 `no-live-follow-notice` 仍在 |
| UI-4 🟡 | 手機寬度可讀、表格橫捲 | jsdom 驗不了；列入人工驗收或 E2E（390 寬截圖） |
| NFR-1 🟡 | 兩個畫面的「載入中」沒有正向斷言 | 讓 proxy 回一個不 resolve 的 Promise，斷言 `loading-alert` 分別為「查詢中…」「取行情中…」 |

### 這一刀的驗收重點

- **核心行為全數到位且有斷言**：合約只讀合約那一條（URL 逐字＋現貨 proxy 未被呼叫雙向釘住）、`null` 畫「—」、負溢價原樣、圖只畫成交價（標記價格設 `7777` 區分）、沒有即時／指標／立刻更新。
- **缺的都是測試，不是行為**：沒有任何一條 code 偏離 oracle。兩條 🟠 是「測試名字說了、斷言沒做到」，六條 🟡 是版面與頁面標題這類沒被任何測試讀到的東西。
- 現貨那邊的插槽重構由既有測試原樣通過守住；唯一看得見的副作用是現貨表格「—」變淡（見 Orphans）。

> **Ceiling.** 靜態一致性稽核：先由 PRD 推出 oracle，再分別審測試與程式碼，不靠跑整套測試下結論。
> 只以單檔執行作佐證（`KCandleContractSearchPanel`、`KCandleContractChartPanel`、`ContractSymbolField`、
> `k-candle-contract-proxy`、`ConsoleLayout`、`k-candle-chart-application` 六檔全綠）。
> 無法在此驗證的是：版面在 390 寬的實際樣子（UI-4），以及後端 `/contract-k-candles`、`/contract-k-candles/series`、
> `/contract-trading-symbols` 真的回這個 wire 形狀——後者由 go-trading 合約補充資料那一刀的 `CONTRACT.md` 負責。

---

## 第二輪（修正後）

| ID | 第一輪 | 第二輪 | 怎麼解決的 |
|----|--------|--------|------------|
| AC-2 | 🟡 | ✅ | `tests/pages/market-page-titles.spec.ts` 逐一掛載四個看行情的畫面，斷言標題；把合約圖表標題改掉時它會失敗（已驗證） |
| AC-15 | 🟠 | ✅ | 拉遠那一次系統回一小時、換一批：斷言標「一小時」、圖換成新的那一批、挑的仍是「自動」 |
| EC-1 | 🟠 | ✅ | 清單還在路上時，選單照樣選著 BTCUSDT |
| UI-1 | 🟡 | ✅ | 兩個面板各斷言區塊標題（查詢條件／查詢結果；看什麼＋畫出來的合約） |
| UI-2 | 🟡 | ✅ | 斷言十一個欄位的確切文字與順序；PRD 的欄位順序改成與程式和現貨表一致（漲跌緊跟時間） |
| UI-3 | 🟡 | ✅ | 收起「看什麼」之後斷言那一句說明還在 |
| NFR-1 | 🟡 | ✅ | 兩個畫面各補「正在取／正在查」的載入狀態 |
| UI-4 | 🟡 | 🟡 | 寬 390 的版面要靠實機或截圖確認，jsdom 量不到版面——**維持待人工確認** |

孤兒「現貨表的破折號現在會淡化」：已寫進 PRD 第 5 節，說明這是讓原本的意思生效，不是新行為。

**第二輪結果：42 / 43 conforms；UI-4 需人工在手機寬度確認。**
