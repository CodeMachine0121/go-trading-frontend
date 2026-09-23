# Contract Conformance — 合約回測畫面

**Oracle:** `PRD.md` Section 3 Acceptance Criteria (Gherkin) · **Mode:** static audit（對照 oracle 判讀測試斷言與程式路徑，不以整套測試的通過與否為依據）

## Clauses

| ID | Clause | Oracle | Test (asserts?) | Code (produces?) | Status |
|---|---|---|---|---|---|
| AC-01 | 合約策略腳本畫面有回測去處 | 右欄有指標預覽與回測 | `IndicatorCalculationPanelContract.spec` 有回測分頁… — asserts-oracle | `market-data-kind-domain.ts`（`offersBacktest: true`）— produces | ✅ |
| AC-02 | 送出一次合約重演（5 倍、只做多） | 走合約入口、帶 5 與 longOnly | `StrategyScriptBacktestPaneContract.spec` 送出的是一次合約重演 + `backtest-proxy-contract.spec` 入口與 body — asserts | `StrategyScriptBacktestPane.vue` runContract → `BacktestProxy.runContractBacktest` — produces | ✅ |
| AC-03 | 槓桿與滑點留白 | 不上線 | pane「留白」+ proxy「留白的槓桿與滑點不上線」— asserts | `contractTermsBody` — produces | ✅ |
| AC-04 | 槓桿小於一 | 不送出，槓桿旁寫「槓桿倍數不得小於 1 倍」 | pane it.each + terms domain spec — asserts | `ContractBacktestTermsDomain` — produces | ✅ |
| AC-05 | 滑點為負 | 不送出，寫「滑點不得為負」 | 同上 — asserts | 同上 — produces | ✅ |
| AC-06 | 交易服務指名槓桿 | 那句話在槓桿那一格 | pane（FormField errorMessage）+ proxy it.each — asserts | 欄位對照 `leverage` — produces | ✅ |
| AC-07 | 現貨策略腳本的回測照舊 | 沒有三格、仍是只做現貨 | pane「現貨的回測沒有…」— asserts | `BacktestConditionFields` v-else — produces | ✅ |
| AC-08 | 強平 | 成績單強平 1 筆、明細「強平」 | pane 成績單與明細 + figures spec — asserts | `TRADE_EXIT_REASON_LABELS.liquidation` — produces | ✅ |
| AC-09 | 淨付出資金費用 | 「付出 18.00」 | figures spec it.each — asserts | `fundingFeeLabel` — produces | ✅ |
| AC-10 | 淨收到資金費用 | 「收到 5.00」 | 同上 — asserts | 同上 — produces | ✅ |
| AC-11 | 沒有空單 | 做空 0 筆、勝率不適用 | figures spec — asserts | `winRateLabel` — produces | ✅ |
| AC-12 | 完整分級 | 「完整分級」+ 確認日期 + 今天那一組 | figures spec + pane — asserts | `MAINTENANCE_MARGIN_BASES.tiers` + SummaryCard — produces | ✅ |
| AC-13 | 最小那一級 | 「最小那一級」+ 強平價算得太遠 | figures spec — asserts | `SMALLEST_TIER_BASIS` — produces | ✅ |
| AC-14 | 合約的交易明細 | 做空、5 倍、500、10000.00、5.00 | figures spec + pane — asserts | `BacktestDomain.closedTradeDto` + TradeTable — produces | ✅ |
| AC-15 | 現貨成績單照舊 | 沒有合約那幾格 | figures spec（contract 為 null）— asserts | `contractFigures === null` 分支 — produces | ✅ |
| AC-16 | 合約交易策略只挑得到合約策略腳本 | 選項只來自合約清單 | workbench composable「每一種的選項只來自那一種的清單」— asserts | `use-trading-strategy-workbench.ts` + Workbench computed — produces | ✅ |
| AC-17 | 沒選就是 K 線 | K 線、只挑得到 K 線策略腳本 | form spec + Workbench spec（預設 kCandle）— asserts | form 預設 — produces | ✅ |
| AC-18 | 換行情種類拿掉既有來源 | 來源清空並寫出那句話 | form spec + Workbench spec — asserts | `changeMarketDataKind` — produces | ✅ |
| AC-19 | 合約交易策略選交易模式 | 存下只做空 | form spec + proxy spec（body 帶 tradingMode）— asserts | write domain / proxy — produces | ✅ |
| AC-20 | 已存的 K 線交易策略 | K 線、改不了、沒有交易模式 | Workbench spec — asserts | `marketDataKindLocked` + v-if — produces | ✅ |
| AC-21 | 清單標出行情種類 | 「合約行情」或「K 線」 | ListPanel it.each — asserts | ListPanel template — produces | ✅ |
| AC-22 | 合約交易策略的回測條件 | 合約標的清單、槓桿與滑點、交易模式唯讀一句 | strategy pane contract spec — asserts | `TradingStrategyBacktestPane` — produces | ✅ |
| AC-23 | 送出合約交易策略重演 | 槓桿 3、不帶交易模式 | strategy pane + proxy spec — asserts | `runContractTradingStrategyBacktest` — produces | ✅ |
| AC-24 | K 線交易策略的回測照舊 | 一模一樣 | strategy pane「K 線…一模一樣」+ 既有 `TradingStrategyBacktestPane.spec` — asserts | 非合約分支 — produces | ✅ |
| AC-25 | 機器人挑交易策略 | 只挑得到 K 線那一份 | bot workbench spec — asserts | `followableByStrategyBot` 篩選 — produces | ✅ |

## Orphans

| Behavior | Note |
|---|---|
| 送 `maintenanceMarginRate` 的欄位對照 | 畫面從不送這一格，未加對照；不構成孤兒行為 |
| 「回測照什麼規則走」合約版內容 | PRD §4 業務規則所述，由 `backtest-application-contract.spec` 釘住 |

## Summary

✅ 25 conforms · 🔴 0 violations · 🟠 0 mis-asserted · 🟡 0 partial · ❌ 0 gaps · ❔ 0 unclear · ⚠️ 0 orphans — **Conformance 100%**
