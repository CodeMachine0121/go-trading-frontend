# Contract Traceability Matrix — 合約訂單流（足跡）畫面

Contract: PRD.md
Design map: ARCH.md
Implementation: `app/`
Oracle: Acceptance Criteria (14 clauses)

> Static conformance audit: oracles written from the PRD first; tests and code judged against them separately. Every listed test was falsified by breaking the behavior it covers.

## Clauses

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-1 | 合約畫面的種類選單有它 | 回看根數、數值、是非、訂單流價位寬度 | `MarketDataKindDomain.declarableParameterKinds` + `listStrategyScriptParameterKindOptions` | `indicator-calculation-service.spec`「合約的選單…」、`IndicatorCalculationPanelContract.spec`「合約行情的種類選單有訂單流價位寬度」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-2 | K 線畫面的種類選單沒有它 | 只有前三種 | 同上 | 「K 線的選單沒有訂單流價位寬度」、「K 線的種類選單沒有」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-3 | 大於零的寬度沒有錯誤 | 10 → 無錯誤 | `StrategyScriptParameterDomain.validationMessage` | `strategy-script-parameters-domain.spec`「寬度 10」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-4 | 小數寬度沒有錯誤 | 0.5 → 無錯誤 | 同上 | 「寬度 0.5」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-5 | 寬度為零 | 「訂單流價位寬度必須大於零」 | 同上 | 「寬度 0」「寬度 -5」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-6 | 宣告兩個 | 「訂單流價位寬度至多宣告一個」 | `StrategyScriptParametersDomain.validationMessage` | 「一支策略腳本至多一個」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-7 | 輸入框 | 可小數、步進 1 | `inputMode`、`step` | 「輸入框可以打小數、上下箭頭一次跳 1…」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-8 | 不讓系統多拿 K 線 | 零 | `lookbackCount` | 同上 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-9 | 自己的策略腳本讀回來 | 種類仍是訂單流價位寬度 | `STRATEGY_PARAMETER_KINDS`（`StrategyScriptProxy`） | `strategy-script-proxy.spec`「$kind 這一種存進去讀回來還是同一種」（逐一 range 真正的清單） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-10 | 市集上的策略腳本 | 同上 | 同上（`StrategyScriptMarketplaceProxy`） | `strategy-script-marketplace-proxy.spec`「讀回來還是訂單流價位寬度」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-11 | 合約畫面列出足跡 | Footprint（`indicator.Footprint`）、四個子項、PriceLevel 四項、宣告了才有 | `CONTRACT_K_CANDLE_FIELDS` + 合約那一列的說明 | `market-data-kind-domain.spec`「合約行情的說明列出 Footprint…」「說明講清楚宣告了才有…」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12 | K 線畫面沒有足跡 | 沒有 Footprint | `K_CANDLE_FIELDS` | 「K 線的說明沒有 Footprint」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-13 | 參數讀法說明 | 合約多一則訂單流價位寬度、K 線沒有 | `SCRIPT_PARAMETER_ACCESSES` 依行情篩 | 「訂單流價位寬度的說明指向每一格的 Footprint」「K 線畫面的讀法說明沒有…」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-14 | 訂單流超出範圍而停擺 | 標為停擺，原因說「它要的訂單流超過一次能給的範圍（天數或價位數）」 | `STRATEGY_BOT_HALT_REASONS` + 標籤 | `strategy-bot-run-state-domain.spec`「每一種停擺原因…（orderFlowRefused）」 | asserts-oracle | produces-oracle | ✅ conforms |

## Orphans

| Code | Description | Verdict |
|------|-------------|---------|
| — | — | — |

## Summary

- Conforms: 14/14 ✅ (100%)
- Violations / Mis-asserted / Partial / Gaps / Unclear: —
- Noted, out of scope: the halt reason `deliveryNotConfigured` (from an earlier backend slice) is still missing from the screen's list, so a bot halted for it shows as plainly stopped.
