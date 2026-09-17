# Contract Traceability Matrix — 交易策略回測分頁

Contract: `.sdd/2026-09-17-trading-strategy-backtest-console/PRD.md`
Design map: `.sdd/2026-09-17-trading-strategy-backtest-console/ARCH.md`
Implementation: `app/components/organisms/TradingStrategyBacktestPane.vue`,
`app/infrastructure/proxy/backtest-proxy.ts`,
`app/domain/models/domains/trading-strategy-backtest-request-domain.ts`,
`app/components/templates/TradingStrategyWorkbenchPage.vue`
Oracle: Acceptance Criteria（14 條情境）＋ Core Business Rules（6 條）

## Clauses

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-1 | 回測分頁上要填的比重演一支腳本少兩格 | 看得到市場、起訖、本金、押注；看不到算式 | `TradingStrategyBacktestPane.vue` | `TradingStrategyBacktestPane.spec.ts:95` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-2 | 彙總刻度是一句話，不是挑得動的選單 | 一句說明，沒有選單 | `BacktestConditionFields.vue`（`aggregationIntervalNote`） | `TradingStrategyBacktestPane.spec.ts:84` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-3 | 重演的是眼前這一份 | 受測對象是第 7 份交易策略 | `TradingStrategyBacktestPane.vue` `runBacktest` | `TradingStrategyBacktestPane.spec.ts:119` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-4 | 成績單、資金曲線與交易明細同時在畫面上 | 三塊同時在上面 | `TradingStrategyBacktestPane.vue` | `TradingStrategyBacktestPane.spec.ts:133` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-5 | 算的時候說一聲，而且不讓他按第二次 | 說重演中，執行鍵停用 | `use-trading-strategy-backtest-run.ts` | `TradingStrategyBacktestPane.spec.ts:143` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-6 | 還沒存過時說清楚下一步是先存 | 一句話＋執行鍵停用 | `TradingStrategyBacktestPane.vue`、`TradingStrategyBacktestRequestDomain` | `TradingStrategyBacktestPane.spec.ts:103` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-7 | 存過之後那句話就不見了 | 那句話不在畫面上，執行鍵可以按 | `TradingStrategyBacktestPane.vue` | `TradingStrategyBacktestPane.spec.ts:112` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-8 | 打架過才多出那一格 | 看到「規則打架的棒數 180」 | `BacktestSummaryCard.vue` | `BacktestSummaryCard.spec.ts:55`、`TradingStrategyBacktestPane.spec.ts:166` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-9 | 一棒都沒打架過時那一格不出現 | 成績單上沒有那一格 | `BacktestSummaryCard.vue` | `BacktestSummaryCard.spec.ts:64` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-10 | 重演一支策略腳本時那一格永遠不出現 | 成績單上沒有那一格 | `backtest-proxy.ts`（單支路徑不回報，正規化為 0） | `backtest-proxy.spec.ts:283`、`BacktestSummaryCard.spec.ts:64` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-11 | 改存過就清掉上一張成績單 | 那張成績單不在畫面上 | `TradingStrategyBacktestPane.vue`（`savedGeneration`） | `TradingStrategyBacktestPane.spec.ts:229` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12 | 來源的腳本跑不起來時說成算式的問題 | 措辭與重演一支腳本相同 | `backtest-proxy.ts` `backtestFailureOf` | `TradingStrategyBacktestPane.spec.ts:202`、`backtest-proxy.spec.ts:306` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-13 | 刻度不一致時那句話落在市場那一格旁邊 | 拒絕出現在市場那一格旁邊 | `BACKTEST_FIELD_TRANSLATIONS.signalSources` | `TradingStrategyBacktestPane.spec.ts:190`、`backtest-proxy.spec.ts:293` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-14 | 送出去的東西裡沒有刻度也沒有算式 | body 上沒有那兩樣 | `backtest-proxy.ts` `runTradingStrategyBacktest` | `backtest-proxy.spec.ts:254` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-15 | 連不上後端時執行鍵停用 | 說連不上，執行鍵停用 | `use-latest-run.ts`＋`TradingStrategyBacktestPane.vue` | `TradingStrategyBacktestPane.spec.ts:213` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-1 | 受測對象是眼前這一份，識別碼由頁面給 | 同 AC-3 | `TradingStrategyWorkbenchPage.vue` | `TradingStrategyBacktestPane.spec.ts:119` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-2 | 彙總刻度與算式一格都不送 | 同 AC-14 | `backtest-proxy.ts` | `backtest-proxy.spec.ts:254` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-3 | 打架棒數大於零才出現；沒回報時當零 | 同 AC-8／AC-9／AC-10 | `BacktestSummaryCard.vue`、`backtest-proxy.ts` | `backtest-proxy.spec.ts:283` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-4 | 規則改存過就清掉上一次的結果 | 同 AC-11 | `TradingStrategyBacktestPane.vue` | `TradingStrategyBacktestPane.spec.ts:229` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-5 | 出錯的措辭與重演一支腳本完全相同 | 兩條路走同一個分流 | `backtest-proxy.ts` `backtestFailureOf`（兩個公開方法共用） | `backtest-proxy.spec.ts:182,306` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-6 | 結果不留存，每次重新算 | 重新算一次而不是拿出上次的 | 無任何留存路徑（`useLatestRun` 只活在元件裡） | — | no-test | produces-oracle | 🟡 partial |

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| `backtest-initial-capital-domain.ts` | 本金規則抽成自己的模型 | 重構產物，行為與既有規則相同；非新行為 |

## Summary

- Conforms: 20/21 clauses ✅ (95%)
- Violations: 無
- Mis-asserted: 無
- Partial: BR-6（「不留存」是結構性事實——這條路上沒有任何留存機制。
  要直接測它只能斷言「沒有呼叫某個不存在的東西」，那是測實作而非行為）
- Gaps: 無
- Unclear: 無
- Orphans: 0

本次稽核修補的缺口：AC-7 原本只檢查那句話消失，沒有檢查執行鍵真的可以按了，已補上斷言。

> 稽核性質：靜態一致性稽核。它比對測試斷言與程式路徑對上規格的預期結果，
> 不執行自行發明的情境，也不以整份測試套件的綠燈作為判準。
