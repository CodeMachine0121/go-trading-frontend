# Contract Traceability Matrix — 合約策略腳本畫面

Contract: PRD.md
Design map: ARCH.md
Implementation: `git log main..HEAD` on `feat/contract-strategy-scripts` (`app/`, tests in `tests/`)
Oracle: Acceptance Criteria (32 clauses: 23 AC, 6 BR, 1 UI from §5, 2 NFR)

Ceiling: this is a static conformance audit. It compares test assertions and code paths against the oracle derived from the PRD. It does not run invented scenarios. The mapped specs were run as corroboration only (4 files, 51 tests green); no verdict rests on pass/fail.

## Clauses

The `Spec-expected` column holds the business-observable oracle from Phase 2; the
concrete artifact it bridges to (via UL-MAP/ARCH) is what the audit columns check.

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-1 | US-01 導覽上兩個去處都在：任何畫面看導覽 → 看得到「現貨策略腳本」與「合約策略腳本」 | 導覽列出兩個去處，名字分別是「現貨策略腳本」「合約策略腳本」 | `app/components/templates/ConsoleLayout.vue:39-40` | `tests/components/templates/ConsoleLayout.spec.ts:~100` (exact label list) | asserts-oracle | produces-oracle | ✅ conforms |
| AC-2 | US-01 既有畫面只換名字：標題是「現貨策略腳本」，回測分頁、執行條件與其餘一切照舊 | 原畫面標題為「現貨策略腳本」；回測分頁仍在、其餘行為不變 | `app/pages/strategy-scripts/index.vue:30`; panel default `marketDataKind='kCandle'` `IndicatorCalculationPanel.vue:59` | `tests/pages/strategy-script-page-titles.spec.ts:16`; existing `IndicatorCalculationPanel.spec.ts` (spot default, backtest tab) | asserts-oracle | produces-oracle | ✅ conforms |
| AC-3 | US-01 窄螢幕底部仍是四格，且「合約策略腳本」在「更多」裡 | 窄螢幕底排仍四格；「合約策略腳本」出現在「更多」 | `ConsoleLayout.vue:40` (`primary: false`), `:57-58` | `ConsoleLayout.spec.ts:214-217` (5 tabs), `:220-249` (更多 list) | shallow — four-tab count asserted, but the 更多 test never checks `more-/contract-strategy-scripts`; `tab-/strategy-scripts` asserts `toContain('策略腳本')`, which passes for the old label too | produces-oracle | 🟠 mis-asserted |
| AC-4 | US-02 合約畫面只列合約行情種類：有「均線」（K 線）與「費率反轉」（合約）→ 清單只有「費率反轉」 | 合約畫面清單只含「費率反轉」 | `app/domain/service/strategy-script-service.ts:27-41`; `use-strategy-script-library.ts:95` | `IndicatorCalculationPanelContract.spec.ts:161`; `strategy-script-application.spec.ts:33` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-5 | US-02 現貨畫面只列 K 線種類 → 清單只有「均線」 | 現貨畫面清單只含「均線」 | same as AC-4 (default kind) | `IndicatorCalculationPanelContract.spec.ts:184`; `strategy-script-application.spec.ts:45` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-6 | US-02 在合約畫面另存為「OI 背離」→ 存下的吃合約行情，且出現在合約畫面清單 | 存下的一支是合約行情種類，且之後出現在合約畫面清單 | `IndicatorCalculationPanel.vue:~190` (content carries kind); `strategy-script-write-domain.ts:61`; `strategy-script-proxy.ts:130` | `IndicatorCalculationPanelContract.spec.ts:203` | shallow — asserts only the saved kind; the second Then (appears in the contract list afterwards) is never asserted | produces-oracle (save → `refreshStrategyScripts` with page kind) | 🟠 mis-asserted |
| AC-7 | US-02 在現貨畫面另存為「新均線」→ 存下的吃 K 線 | 從現貨畫面存下的一支是 K 線種類 | panel default kind → `StrategyScriptContentDto` default `'kCandle'` | `strategy-script-proxy.spec.ts:~112` (proxy body from default content) | shallow — no test drives save from the spot workbench; only the proxy default is pinned | produces-oracle | 🟠 mis-asserted |
| AC-8 | US-02 從市集加入的合約行情種類，打開合約策略腳本 → 出現在「加入的」那一段 | 加入的那一支出現在合約畫面清單的「加入的」部分 | `strategy-script-service.ts:38-40` (adopted filtered by kind) | `strategy-script-application.spec.ts:41`; `IndicatorCalculationPanelContract.spec.ts:180` | asserts-oracle (adopted segment = `['別人的 OI 背離']`; UI merges both segments into one picker by existing design) | produces-oracle | ✅ conforms |
| AC-9 | US-02 K 線圖表挑不到合約行情種類 | K 線圖表套用指標的選單中沒有那一支合約種類 | `app/components/organisms/KCandleChartPanel.vue:427` (no arg → `kCandle`) | only `strategy-script-application.spec.ts:45` (default arg) | shallow — no KCandleChartPanel test with a contract-kind script; passing `'contractKCandle'` there would go unnoticed | produces-oracle | 🟠 mis-asserted |
| AC-10 | US-02 交易策略挑信號來源時挑不到合約行情種類的信號策略腳本 | 交易策略信號來源選項中沒有那一支 | `app/composables/use-trading-strategy-workbench.ts:85` | only `strategy-script-application.spec.ts:45` | shallow — no trading-strategy workbench test with a contract signal script | produces-oracle | 🟠 mis-asserted |
| AC-11 | US-02 市集上有一支合約行情種類 → 看得到它，且標著「合約行情」 | 市集卡片出現，且標記「合約行情」 | `MarketplaceStrategyScriptCard.vue:76`; `published-strategy-script-domain.ts:30-31` | `StrategyScriptMarketplacePanel.spec.ts:~299` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12 | US-03 空白算式收合約行情格 | 預填進入點收一串合約行情格 | `indicator-script-domain.ts:166`; panel `:116` | `IndicatorCalculationPanelContract.spec.ts:106`; `indicator-script-domain.spec.ts:174` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-13 | US-03 種類改成信號時，進入點仍收合約行情格，回傳改成一個信號 | 進入點仍是合約行情格，回傳是一個信號 | `indicator-script-domain.ts:136`, panel `retargetResultType` | `IndicatorCalculationPanelContract.spec.ts:113`; `indicator-script-domain.spec.ts:181` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-14 | US-03 按帶入範例內容 → 範例收合約行情格，且讀了資金費率或持倉量 | 範例進入點收合約行情格，內文讀資金費率或持倉量 | `indicator-script-domain.ts:~52-104` | `IndicatorCalculationPanelContract.spec.ts:123`; `indicator-script-domain.spec.ts:198` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-15 | US-03 合約畫面「算式裡可以用什麼」→ 進入點是合約行情格；看得到資金費率、這一格內有結算、持倉量、標記價格；看得到「沒有值的一律是零」 | 說明的進入點是合約行情格；列出這四項；有「沒有值的一律是零」 | `market-data-kind-domain.ts:~40-50`, `k-candle-field-vo.ts` `CONTRACT_K_CANDLE_FIELDS`; `IndicatorScriptGuideDialog.vue:88` | `IndicatorCalculationPanelContract.spec.ts:134`; `market-data-kind-domain.spec.ts:244` | asserts-oracle | produces-oracle (see orphan O-2 about the hardcoded float64 note) | ✅ conforms |
| AC-16 | US-03 現貨說明一字不差：進入點是一串 K 線，只列 K 線的那十項 | 現貨說明進入點是 K 線，恰好十項，無新增內容 | `market-data-kind-domain.ts:~30-38` | `IndicatorCalculationPanelContract.spec.ts:149`; `market-data-kind-domain.spec.ts:266` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-17 | US-04 算的是合約：挑 BTCUSDT、看最近兩小時、按執行 → 交易服務做合約指標計算；結果照現貨呈現實際採用幾根、每根涵蓋與種類 | 請求送到合約指標計算；結果顯示採用根數、每根涵蓋、種類 | `indicator-calculation-proxy.ts:96`; `indicator-calculation-request-domain.ts:61` | `IndicatorCalculationPanelContract.spec.ts:218`; `indicator-calculation-proxy.spec.ts:~379` | shallow — routing is pinned, but the presentation only checks `used-candle-count` *exists*; coverage and kind are never asserted, nor the count's value | produces-oracle (shared result rendering) | 🟠 mis-asserted |
| AC-18 | US-04 合約那邊認得 BTCUSDT、ETHUSDT → 挑標的那一格列合約標的清單 | 標的選單列的是合約標的清單 | `IndicatorCalculationPanel.vue:520` → `ContractSymbolField.vue:48` | `IndicatorCalculationPanelContract.spec.ts:98` + `tests/components/molecules/ContractSymbolField.spec.ts:38-41` | asserts-oracle (by composition; panel test alone is structural) | produces-oracle | ✅ conforms |
| AC-19 | US-04 一個合約標的都沒有 → 說目前沒有任何合約標的，要先加進合約追蹤名單 | 顯示「目前沒有任何合約標的，先把合約加進合約追蹤名單」 | `ContractSymbolField.vue:40` | `ContractSymbolField.spec.ts:55-58` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-20 | US-04 進入點收一串 K 線 → 按執行 → 呈現為「算式的問題」，照交易服務的話 | 以算式的問題呈現，文字為交易服務原話 | `indicator-calculation-proxy.ts` 422 → `IndicatorScriptFailedError` (shared) | `IndicatorCalculationPanelContract.spec.ts:245`; `indicator-calculation-proxy.spec.ts:396` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-21 | US-04 交易服務說這支吃 K 線 → 呈現為「請求的問題」，照那句話 | 以請求的問題呈現，文字為交易服務原話 | shared rejection translation → `request-rejected-alert` | `IndicatorCalculationPanelContract.spec.ts:233` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-22 | US-04 打開合約策略腳本 → 右欄沒有回測分頁，只有指標預覽 | 右欄無回測分頁，只有指標預覽 | `IndicatorCalculationPanel.vue:474, 794`; `market-data-kind-domain.ts` `offersBacktest:false` | `IndicatorCalculationPanelContract.spec.ts:89` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-23 | US-04 湊不出最少可算根數 → 與現貨同一句話，落在「要看多長」旁邊 | 合約畫面顯示與現貨相同的一句，位於「要看多長」旁 | shared `CandleCoverageShortfallDomain` in proxy; panel `messageFor` | spot only: `IndicatorCalculationPanel.spec.ts:702` | no-test (for the contract page) | produces-oracle (same code path) | 🟡 partial |
| BR-1 | 行情種類：一個畫面只有一種，決定清單、存下的種類、預填/範例/說明、計算去處、標的清單 | 每一項都跟著畫面的種類 | `IndicatorCalculationPanel.vue` prop → domain | composite of AC-4..AC-22 | asserts-oracle (via ACs) | produces-oracle | ✅ conforms |
| BR-2 | 挑策略腳本的其他地方（K 線圖表、交易策略）只列 K 線種類 | 兩處選單都不含合約種類 | `KCandleChartPanel.vue:427`; `use-trading-strategy-workbench.ts:85` | as AC-9/AC-10 | shallow | produces-oracle | 🟠 mis-asserted |
| BR-3 | 市集兩種都列，每一支標出種類 | 市集把兩種都當完整的一支處理：都列出、都標種類，且「自己的/已加入」狀態對兩種一樣正確 | `app/application/strategy-script-marketplace-application.ts:29` calls `listAvailableStrategyScripts()` with no kind → default `kCandle` filter (`strategy-script-service.ts:27-41`) → `MarketplaceListingDomain` never sees contract-kind `mine`/`adopted` ids | none for contract ownership/adoption state | no-test | **diverges** — a contract script I adopted shows 「加入」 rather than 「已加入」, and my own published contract script is shown as not mine (it gets an adopt button, `MarketplaceStrategyScriptCard.vue:102`) | 🔴 violation |
| BR-4 | 一支策略腳本的行情種類不在畫面上改動 | 畫面上沒有更換種類的途徑；改寫時送出原種類 | no kind control in UI; `strategy-script-write-domain.ts:61` | none | no-test | produces-oracle | 🟡 partial |
| BR-5 | 交易服務沒回行情種類（舊版）：視為 K 線 | 缺少種類的那一支被當成 K 線 | `strategy-script-proxy.ts:180,198`; `strategy-script-marketplace-proxy.ts:82`; `market-data-kind-domain.ts` default | `strategy-script-proxy.spec.ts:~456`; `strategy-script-marketplace-proxy.spec.ts:25`; `market-data-kind-domain.spec.ts:226` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-6 | 連不上交易服務、伺服器錯誤：與現貨畫面相同的呈現與重試 | 合約畫面的連線/伺服器錯誤呈現與重試方式和現貨一樣 | shared `useIndicatorCalculationRun` / proxy translation | spot tests only | no-test (contract) | produces-oracle (shared path) | 🟡 partial |
| UI-1 | §5 導覽：「合約策略腳本」有自己不重複的圖示，收在「更多」 | 新去處的圖示和其他去處都不同 | `AppIcon.vue` `contract-formula`; `ConsoleLayout.vue:40` | `ConsoleLayout.spec.ts:~120` (11 icons, 11 unique) | asserts-oracle (「更多」 part tracked under AC-3) | produces-oracle | ✅ conforms |
| NFR-1 | 手機直立與桌機皆可用，沿用既有工作區版面規則 | 合約畫面沿用同一工作區的響應式版面 | same `IndicatorCalculationPanel`; `ContractSymbolField` swap | none specific | no-test | produces-oracle (same organism) | 🟡 partial |
| NFR-2 | 沿用登入與擁有權規則 | 合約畫面同樣需要登入、只列自己的＋加入的 | shared proxies/session | none specific | no-test | produces-oracle | 🟡 partial |

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| `app/domain/models/domains/indicator-script-domain.ts:136` | The signature pattern matches both `KCandle` and `ContractKCandle`, so changing the result type on the contract page quietly rewrites a spot-style `[]indicator.KCandle` entry point to `ContractKCandle` (tested at `indicator-script-domain.spec.ts:190`). This makes the PRD §7 risk (spot entry point → script problem) less likely, but no clause covers it | undocumented — reconcile with PRD |
| `app/components/molecules/IndicatorScriptGuideDialog.vue:84` | A hardcoded note 「價量一律是 float64」 appears on the contract guide as well, which contradicts the contract fields it lists (`TradeCount int64`, `FundingSettledInBar bool`, `Mark/Index/PremiumIndex indicator.PriceLine`) | undocumented — move into `guide.notes` per kind |
| `.sdd/UL-MAP.md:204` | The 底部分頁列 entry still says 「策略腳本」 and 「其餘六個」; it now needs 「現貨策略腳本」 and seven, including 合約策略腳本 | doc drift |

## Summary

- Conforms: 19/32 clauses ✅ (59%)
- Violations: BR-3 (code produces the wrong outcome)
- Mis-asserted: AC-3, AC-6, AC-7, AC-9, AC-10, AC-17, BR-2 (green test asserts a weaker thing)
- Partial: AC-23, BR-4, BR-6, NFR-1, NFR-2 (no test asserts the oracle)
- Gaps: none
- Unclear: none
- Orphans: 3
- Out-of-scope check: no contract backtest, no contract kind in trading strategies/bots, no indicators on the contract K-candle chart, no kind-change UI. Clean.

## Re-audit after fixes

| Clause | Was | Fix | Now |
|---|---|---|---|
| BR-3 | 🔴 violation — the marketplace read only spot-kind scripts to decide "mine / adopted" | `StrategyScriptService.listAllAvailableStrategyScripts()` (every kind) used by `StrategyScriptMarketplaceApplication.listMarketplace`; tests for an owned and an adopted contract script (`StrategyScriptMarketplacePanel.spec.ts`); falsified | ✅ |
| (found while fixing AC-6/BR-4) | 🔴 unreported violation — an untouched contract blank draft counted as unsaved, so picking a script asked to discard changes | `StrategyScriptDraftDomain` compares against the blank script of the content's own kind; tests in `strategy-script-draft-domain.spec.ts` and the contract panel; falsified | ✅ |
| AC-3 | 🟠 | Exact label 「現貨策略腳本」 on the bottom bar; 合約策略腳本 asserted inside 「更多」 | ✅ |
| AC-6 | 🟠 | Saved contract script asserted in the contract picker and selected | ✅ |
| AC-7 | 🟠 | Spot save-as asserted to send `kCandle` | ✅ |
| AC-9, BR-2 | 🟠 | K 線圖表 picker test with own and adopted contract scripts absent | ✅ |
| AC-10 | 🟠 | Trading strategy workbench asserted to ask for the list without a kind (spot default, pinned by the application test) | ✅ |
| AC-17 | 🟠 | Used count, interval label and result kind asserted | ✅ |
| AC-23, BR-6 | 🟡 | Coverage-shortfall, unreachable and server-error presentation repeated on the contract panel | ✅ |
| BR-4 | 🟡 | Rewriting a contract script asserted to resend `contractKCandle` | ✅ |
| NFR-1, NFR-2 | 🟡 | Shared layout/session code; no contract-specific behaviour exists to test | accepted |
| Orphan: retarget rewrites a spot entry point | ⚠️ | Added to PRD US-03 as a scenario (already covered by `indicator-script-domain.spec.ts`) | documented |
| Orphan: 「價量一律是 float64」 on the contract guide | ⚠️ | Kept: every price and volume on a contract bar is `float64`; the int64/bool/PriceLine items are not prices or volumes and are typed in the list itself | no change |
| Orphan: UL-MAP bottom-bar row | ⚠️ | Updated to 現貨策略腳本 and seven entries under 「更多」 | fixed |

Conformance after fixes: 30/32 conform; NFR-1 and NFR-2 rest on shared code with no feature-specific branch.
