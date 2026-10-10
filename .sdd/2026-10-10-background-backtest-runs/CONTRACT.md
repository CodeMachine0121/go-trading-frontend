# Contract Traceability Matrix — 回測送出後在列表裡看進度與結果（網頁）

Contract: PRD.md
Design map: ARCH.md
Implementation: `app/` (Nuxt 3 frontend)
Oracle: Acceptance Criteria (17 clauses) + Non-Functional Requirements (4 clauses)

> Static conformance audit: each oracle was written from the PRD before reading code; tests and
> code were each judged against it. Mapped tests were run individually only as corroboration.
> Four clauses were first found 🟠/🟡 (AC-01a contract pane, AC-02f revisit, AC-04b overview open,
> NFR-1 list without report); their tests were strengthened and each was falsified once — the rows
> below show the state after that fix.

## Clauses

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-01a | 合法的回測送出後列表多一筆（合約策略腳本頁） | 顯示「已送出，輪次 #40」；列表最上面一筆 #40 徽章排隊中；開始回測按鈕可再按 | StrategyScriptBacktestPane.vue:373, BacktestRunPanel.vue:34, use-backtest-runs.ts:59 | StrategyScriptBacktestPaneContract.spec.ts「合約策略腳本頁送出後說出輪次編號…」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01b | 欄位錯誤就地擋下 | 錯誤標在區間欄位；沒有送出；列表不變 | backtest-request-domain (existing) + use-latest-run.ts | StrategyScriptBacktestPane.spec.ts「起點晚於終點時說在時間那一格…」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01c | 每人上限滿了 | 顯示「你同時最多 3 筆，等其中一筆結束再送」；列表不變 | backtest-proxy.ts:297, backtest-run-owner-limit-error.ts, StrategyScriptBacktestPane.vue:365 | backtest-proxy.spec.ts「同時太多筆被擋下時說出上限」; StrategyScriptBacktestPane.spec.ts / TradingStrategyBacktestPane.spec.ts「同時太多筆時說出上限，列表不變」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01d | 三個回測區塊行為相同 | 現貨腳本頁與交易策略頁送出後同樣顯示已送出並在該頁列表多一筆 | TradingStrategyBacktestPane.vue:316,329 | StrategyScriptBacktestPane.spec.ts「剛送出的那一筆立刻出現…」; TradingStrategyBacktestPane.spec.ts「送出之後說出輪次編號…」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02a | 進度與狀態自己更新 | 後端說 70% → 列上「進行中 70%」；後端說完成 → 徽章完成、列上 +25.5%、最大回撤、筆數 | use-backtest-runs.ts:81-98, backtest-run-domain.ts:63 | use-backtest-runs.spec.ts「有在跑的就每隔三秒…」; BacktestRunList.spec.ts「每一列寫出…」「完成的那一列寫摘要」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02b | 全部結束就停止更新 | 沒有排隊中或進行中時不再向後端重讀 | use-backtest-runs.ts:81 | use-backtest-runs.spec.ts「全部結束就不回頭問」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02c | 更新不閃等待進度條 | 自己更新時頂端等待進度條不出現 | backtest-run-proxy.ts:32, use-backtest-runs.ts:93 | backtest-run-proxy.spec.ts「背景那一發不讓頂端的進度條亮」; use-backtest-runs.spec.ts (refreshRuns path) | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02d | 取消排隊中的 | 按 #41 取消 → 徽章已取消 | use-backtest-runs.ts:64, backtest-run-status-domain.ts | use-backtest-runs.spec.ts「取消之後那一列換成後端回的樣子」; backtest-run-domain.spec.ts (cancelled → 已取消) | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02e | 已結束的沒有取消 | #42 完成那一列沒有取消按鈕 | backtest-run-domain.ts:40, BacktestRunList.vue:105 | BacktestRunList.spec.ts「排隊中與進行中有取消，結束的沒有」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02f | 離開再回來列表仍在 | 回到同一頁列表從後端重讀，#40 最新狀態仍在 | BacktestRunPanel.vue (onMounted load), use-backtest-runs.ts:117 | StrategyScriptBacktestPane.spec.ts「回到這一頁時列表從後端重讀…」; use-backtest-runs.spec.ts「離開之後…」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03a | 完成的輪次用既有成績單畫面 | 點 #40 → 調參段與驗證段兩組摘要卡、權益曲線、交易表；與當場回覆相同 | BacktestRunDetailDialog.vue:62, backtest-run-proxy.ts:41 | BacktestRunDetailDialog.spec.ts「有驗證起點時由上而下…」「成績單、資金曲線與交易明細…」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03b | 失敗的只顯示原因 | 「失敗：超過時間上限」，沒有成績單 | backtest-run-domain.ts:63, BacktestRunDetailDialog.vue:57 | BacktestRunDetailDialog.spec.ts「失敗的只說原因，沒有成績單」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03c | 已取消的只顯示狀態 | 顯示已取消，沒有成績單 | 同上 | BacktestRunDetailDialog.spec.ts「已取消的說已取消」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04a | 列全部、可篩、分頁 | 25 筆 → 新到舊 20 筆、總數 25、可往下；篩失敗 → 只列 3 筆 | BacktestRunsPage.vue:23, backtest-run-list-query-domain.ts:30-34, BacktestRunList.vue:125,132 | BacktestRunsPage.spec.ts「打開就列最新的二十筆…」「再顯示更多…」「篩失敗就只列那三筆」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04b | 總覽頁也能點開 | 點 #40 → 同樣用成績單畫面 | BacktestRunPanel.vue (open → useBacktestRunDetail) | BacktestRunsPage.spec.ts「點一筆完成的就用成績單畫面呈現」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04c | 空狀態 | 「還沒有回測，去策略腳本或交易策略頁送出一筆」 | BacktestRunsPage.vue:32 | BacktestRunsPage.spec.ts「一筆都沒有時引導…」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05 | 回測區塊的說明 | 說明寫「送出後會在背後計算，可在下方列表或回測紀錄頁查看」；沒有「請等待」 | locales/traditional-chinese/backtest.ts:132,138 | StrategyScriptBacktestPane.spec.ts / TradingStrategyBacktestPane.spec.ts「說明寫著送出後在背後計算…」 | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-1 | 列表不載入成績單本體；更新用背景；離開停止更新 | 列表沒有成績單；重讀走背景；離開後不再重讀 | backtest-run-proxy.ts:22-36, use-backtest-runs.ts:117 | backtest-run-proxy.spec.ts「把狀態、來源與筆數…」(result null); use-backtest-runs.spec.ts「離開時還在路上的那一次…」 | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-2 | 一律帶登入身分；401 走既有救回登入 | 每一發帶身分，401 走既有流程 | BackendApiProxy (shared base of both proxies) | backend-api-proxy.spec.ts (401 recovery) | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-3 | 既有成績單畫面零改動 | BacktestResultSections／SummaryCard／EquityCurveChart／TradeTable／BacktestDomain 無改動 | — (git diff main..HEAD touches none of them) | existing specs of those components unchanged | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-4 | 新文字繁中與英文都有 | 每一則新文字兩種語言 | locales/english/backtest.ts, shell.ts; LocalizedTextVo in domain | StrategyScriptBacktestPane.spec.ts「切成英文」; backtest-proxy.spec.ts (owner limit en); backtest-run-domain.spec.ts (en descriptions/outcomes) | asserts-oracle | produces-oracle | ✅ conforms |

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| BacktestRunDetailDialog.vue (running state) | 點開一筆仍在跑的輪次時寫「這一筆沒有成績單」 | undocumented — natural complement of AC-03, not out of scope |
| BacktestRunList.vue「查看」button | 每列除了編號外另有「查看」鍵打開明細 | undocumented — UI affordance for AC-03/AC-04b |
| use-backtest-runs.ts cancel failure | 取消一筆已結束的（後端 409）時列表上方說出後端原話、清單不變 | undocumented — follows the PRD rule that backend refusals are shown verbatim |

No orphan implements an Out-of-Scope item (comparison of runs, assistant/journal screens, manual deletion).

## Summary

- Conforms: 21/21 clauses ✅ (100%)
- Violations: none
- Mis-asserted: none (AC-01a, AC-02f, AC-04b were shallow before the fix)
- Partial: none (NFR-1 lacked an assertion before the fix)
- Gaps: none
- Unclear: none
- Orphans: 3 (all undocumented complements, none out of scope)
- Interpretation recorded: AC-04a「可翻到下一頁」is delivered as "show more" that raises the limit by 20 up to 200, because the backend list has no offset.
