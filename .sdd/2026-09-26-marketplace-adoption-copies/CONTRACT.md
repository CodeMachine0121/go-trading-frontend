# Contract Traceability Matrix — marketplace-adoption-copies

Contract: PRD.md
Design map: ARCH.md
Implementation: `app/` on branch `feat/marketplace-adoption-copies` (`git diff main...HEAD`)
Oracle: Acceptance Criteria + Business Flow + NFR (10 clauses)
Backend context (read-only): go-trading `.sdd/2026-09-26-marketplace-adoption-copies/PRD.md`

## Clauses

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-1 | 別人的策略腳本只有加入 | 別人的卡有「加入」；沒有「已加入」標示，也沒有取消加入/移除的動作 | MarketplaceStrategyScriptCard.vue:96 | StrategyScriptMarketplacePanel.spec.ts:84, :90 | shallow — asserts「加入」present and「已加入」badge absent, but the former `marketplace-abandon-*` absence checks were deleted, so nothing asserts「沒有取消加入」 | produces-oracle | 🟠 mis-asserted |
| AC-2 | 自己的照舊標明 | 自己的卡標明是自己的，沒有「加入」 | MarketplaceStrategyScriptCard.vue:50, :96, :108 | StrategyScriptMarketplacePanel.spec.ts:102 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-3 | 加入成功 | 顯示「已複製一份到你的策略腳本；之後作者怎麼改都不會影響你」且我的策略腳本重讀 | StrategyScriptMarketplacePanel.vue:72-73; strategy-script-marketplace-application.ts:27-31 | StrategyScriptMarketplacePanel.spec.ts:115 | shallow — exact message pinned, but the re-read is asserted only via `browseMarketplace` call count; it would still pass if my strategy scripts were not re-read | produces-oracle (`listMarketplace` re-reads both in one `Promise.all`) | 🟠 mis-asserted |
| AC-4 | 加入被拒 | 顯示「策略腳本名稱「動能」已被使用」 | strategy-script-marketplace-proxy.ts:40 (rejection passed through); StrategyScriptMarketplacePanel.vue:93 | StrategyScriptMarketplacePanel.spec.ts:129 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-5 | 副本標示從市集加入 | 採用來的那一組有「動能」，標示「從市集加入」，不顯示分享者 | strategy-script-proxy.ts:73-82; StrategyScriptLibraryList.vue:162 | StrategyScriptLibraryDialog.spec.ts:138; strategy-script-proxy.spec.ts:68 | shallow — dialog test asserts「從市集加入」but no longer asserts the sharer is absent (fixture still carries `someone@example.com`); proxy test pins blank publisher only at the data layer | produces-oracle | 🟠 mis-asserted |
| AC-6 | 移除副本就是刪掉它 | 系統刪除那一支副本，且清單上不再有它 | use-strategy-script-library.ts:375, :388 | use-strategy-script-library.spec.ts:130; IndicatorCalculationPanelStrategyScript.spec.ts:1235 | shallow — asserts `deleteStrategyScript(9)` and notice; the list mock still returns the copy after refresh, so「清單上不再有它」is never asserted | produces-oracle | 🟠 mis-asserted |
| AC-7 | 副本仍然唯讀 | 打開副本時看不到算式、改不動 | IndicatorCalculationPanel.vue:385, :411, :462 etc.; published-strategy-script-dto.ts:43 | IndicatorCalculationPanelStrategyScript.spec.ts:1070, :1105, :1120 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-1 | 市集卡只分「自己的」與「別人的」兩種 | 每張卡只有兩種狀態：自己的（無加入）/別人的（加入），不因曾加入過而不同 | marketplace-listing-domain.ts:25-31; marketplace-listing-row-dto.ts:14-17 | marketplace-listing-domain.spec.ts:20; StrategyScriptMarketplacePanel.spec.ts:90 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-2 | 採用來的那一組識別碼就是副本自己的；刪除走一般刪除策略腳本 | 採用來的那一支以副本的識別碼出現；刪掉它就是一般的刪除策略腳本 | strategy-script-proxy.ts:74; use-strategy-script-library.ts:375 | strategy-script-proxy.spec.ts:68 (id 20); use-strategy-script-library.spec.ts:130 | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-1 | 後端不再有取消加入的路徑；畫面不得再呼叫它 | 畫面上沒有任何動作會呼叫取消加入 | i-strategy-script-marketplace-proxy.ts:17-24 (method removed); strategy-script-marketplace-proxy.ts:38 (POST only); `grep -i abandon app tests` = 0 hits | — | no-test (enforced structurally by the interface/types; no spec asserts no `DELETE …/adoption`) | produces-oracle | 🟡 partial |

## Remaining-caller / identity sweep

- Abandon route / old adopted state: no remaining caller. `grep -rni "abandon\|已加入\|取消加入" app tests` returns only a doc comment (marketplace-listing-row-dto.ts:7). `/adoption` is only used by POST (strategy-script-marketplace-proxy.ts:38).
- Trading strategy workbench (use-trading-strategy-workbench.ts:190, :205) and K-candle chart panel (KCandleChartPanel.vue:437), plus IndicatorCalculationPanel.vue:266, all take ids from `listAvailableStrategyScripts().adopted`. That list now carries the copy's own id (strategy-script-proxy.ts:74). None of them looks up by marketplace id, so a signal source will name the copy, which is what the backend requires.
- `browseMarketplace` ids are used only by the marketplace panel (strategy-script-marketplace-application.ts:28).

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| IndicatorCalculationPanel.vue:389 (pinned by IndicatorCalculationPanelStrategyScript.spec.ts:1066) | Read-only notice still says「從市集加入的，**不是你的**」. Under the backend contract the copy belongs to the adopter | undocumented; wording is stale against backend §4 |
| StrategyScriptLibraryList.vue:158, :162 | Adopted row shows both a「市集取得」badge and the「從市集加入」detail. Comment at :167 still says「也不是我的東西」 | undocumented (redundant label, stale comment) |
| use-strategy-script-library.ts:370-395 | Deleting a copy is **not confirmed** (own scripts are). ARCH §2 mentions「移除的確認文案」, but there is none | undocumented; reconcile ARCH/PRD |
| use-chart-indicators.ts:205 | Applied chart indicators saved against a pre-migration marketplace id are silently dropped on restore, because the copy has a new id | undocumented one-time migration effect |

## Summary

- Conforms: 5/10 clauses ✅ (50%): AC-2, AC-4, AC-7, BR-1, BR-2
- Violations: none
- Mis-asserted: AC-1, AC-3, AC-5, AC-6 (code is right; the tests are shallow)
- Partial: NFR-1
- Gaps: none
- Unclear: none
- Orphans: 4

Ceiling: static conformance audit. Test assertions and code paths were judged against the PRD oracle. Only `StrategyScriptMarketplacePanel.spec.ts` was run (27/27 green) as corroboration. No invented scenarios were executed.


---

## Resolution (after this audit)

| Finding | Resolution |
| :--- | :--- |
| AC-1 沒驗沒有「取消加入」 | 斷言那張卡能按的只有「加入」 |
| AC-3 沒驗重讀我的策略腳本 | 斷言加入之後自己的清單也重讀 |
| AC-5 沒驗不顯示分享者 | 斷言那一列不含「分享」 |
| AC-6 沒驗副本離開清單 | 刪除之後清單不再有它 |
| NFR-1 只靠型別 | 維持：方法已從介面移除，編譯期就寫不出呼叫 |
| Orphan：唯讀提示說「不是你的」 | 改為「這份是從市集加入的副本：算式是作者寫的，看不到也改不動——可以拿來試跑、回測與組交易策略。」 |
| Orphan：列上的註解 | 更新為副本的說法；「市集取得」徽章保留 |
| Orphan：刪除副本不先問 | 決定維持並寫進 BRIEF／ARCH／PRD：隨時可再加入 |
| Orphan：舊圖表指標指向原本那一支 | 寫進 PRD：還原時略過，重新套一次即可 |
