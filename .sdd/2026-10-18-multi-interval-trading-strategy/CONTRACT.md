# Contract Traceability Matrix — 交易策略編輯畫面接受多種粗細（前端）

Contract: PRD.md
Design map: ARCH.md
Implementation: go-trading-frontend `feature/multi-interval-trading-strategy`
Oracle: Acceptance Criteria (6 clauses) + Business Rules (2)

## Clauses

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Jev test | Jev code | Status | Route |
|----|--------|------------------------|------|------|------------|------------|----------|----------|--------|-------|
| AC-1 | 一小時與五分鐘的組合不再被擋 | 沒有擋下、儲存鍵按得下去 | trading-strategy-write-domain.ts:128 | TradingStrategyWorkbench.spec.ts:710 | asserts-oracle | produces-oracle | asserts-oracle 0.97 | produces-oracle 0.67 | ✅ conforms | recheck |
| AC-2 | 把第二個來源改成一天之後照樣存得下去 | 存出十五分鐘與一天 | trading-strategy-write-domain.ts:60 | TradingStrategyWorkbench.spec.ts:721 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.31 | ✅ conforms | escalate (low confidence) |
| AC-3 | 刻度相同時照舊存得下去 | 儲存鍵按得下去 | trading-strategy-write-domain.ts:35 | TradingStrategyWorkbench.spec.ts:702 | asserts-oracle | produces-oracle | asserts-oracle 0.73 | produces-oracle 0.40 | ✅ conforms | escalate (low confidence) |
| AC-4 | 三種刻度時說出最細的那一個是步調 | 顯示那一句中文說明 | trading-strategy-write-domain.ts:60 | trading-strategy-write-domain.spec.ts:139 | asserts-oracle | produces-oracle | asserts-oracle 0.79 | produces-oracle 0.40 | ✅ conforms | escalate (low confidence) |
| AC-5 | 刻度都相同時不顯示說明 | 不顯示說明 | trading-strategy-write-domain.ts:65、TradingStrategyWorkbench.vue:251 | trading-strategy-write-domain.spec.ts:168、TradingStrategyWorkbench.spec.ts:702 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.99 | ✅ conforms | accept |
| AC-6 | 英文畫面說英文 | 英文說明指出步調與較粗那一路 | trading-strategy-write-domain.ts:69 | trading-strategy-write-domain.spec.ts:139 | asserts-oracle | produces-oracle | asserts-oracle 0.85 | produces-oracle 0.68 | ✅ conforms | recheck |
| BR-1 | 步調是最細的；較粗的由細到粗列出、不重複 | 依序、去重 | trading-strategy-write-domain.ts:61 | trading-strategy-write-domain.spec.ts:139 | asserts-oracle | produces-oracle | asserts-oracle 0.93 | produces-oracle 0.88 | ✅ conforms | accept |
| BR-2 | 刻度只有一種時沒有說明 | null | trading-strategy-write-domain.ts:65 | trading-strategy-write-domain.spec.ts:168 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.96 | ✅ conforms | accept |

## Orphans (code with no clause)

無。

## Summary

- Conforms: 8/8 clauses ✅（100%）
- Violations / Mis-asserted / Partial / Gaps / Unclear: 無
- Orphans: 0
- Jev: ran on 8 clauses
- Needs James: AC-2、AC-3、AC-4（Jev 程式碼判讀低信心，影子判斷與 Jev 一致）
