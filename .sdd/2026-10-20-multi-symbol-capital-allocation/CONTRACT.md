# Contract Traceability Matrix — 多標的機器人的資金分配（操作台）

Contract: PRD.md
Design map: ARCH.md
Implementation: `app/`（`domain/models/domains/strategy-bot-capital-allocation-domain.ts`、`composables/use-strategy-bot-form.ts`、`components/molecules/StrategyBotCapitalAllocationField.vue`、`infrastructure/proxy/strategy-bot-proxy.ts` 等）
Oracle: Acceptance Criteria（27 clauses）

> 靜態符合度稽核：依 PRD 的驗收條件判斷測試斷言與程式路徑，不執行自創的情境。第一輪稽核後依回饋補了三個測試（AC-10、AC-20、AC-26），下表為補完後重跑的結果；第一輪結果記在最後。

## Clauses

縮寫：F＝`tests/components/organisms/StrategyBotForm.spec.ts`、D＝`tests/domain/models/domains/strategy-bot-capital-allocation-domain.spec.ts`、AD＝`app/domain/models/domains/strategy-bot-capital-allocation-domain.ts`、C＝`app/composables/use-strategy-bot-form.ts`、V＝`app/components/molecules/StrategyBotCapitalAllocationField.vue`。

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Jev test | Jev code | Status | Route |
|----|--------|------------------------|------|------|------------|------------|----------|----------|--------|-------|
| AC-1 | 現貨機器人的總金額 | 那一格叫「總金額」，說明每個監聽標的只用分到的那一份 | market-data-kind-domain.ts:89、StrategyBotForm.vue:194 | F:646、market-data-kind-domain.spec.ts | asserts-oracle | produces-oracle | asserts-oracle 0.97 | produces-oracle 1.00 | ✅ conforms | accept |
| AC-2 | 合約機器人的總金額是保證金 | 叫「總金額（保證金）」，說明「名目＝保證金 × 槓桿」 | market-data-kind-domain.ts:170 | 同上 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 1.00 | ✅ conforms | accept |
| AC-3 | 只有一個標的 | BTCUSDT 100 | AD `equallySplit`、C `changeSymbols` | F:664 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.83 | ✅ conforms | recheck |
| AC-4 | 加入第二個標的時自動平均 | 各 50 | AD `reallocatedTo` | F:664、D:37 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.48 | ✅ conforms | escalate (low confidence) |
| AC-5 | 三個標的的平均分配捨去零頭 | 各 33.33，合計 99.99%、未動用 0.01% | AD、V | F:676 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.47 | ✅ conforms | escalate (low confidence) |
| AC-6 | 七個標的 | 各 14.28，未動用 0.04% | AD | D:23、D:143 | asserts-oracle | produces-oracle | asserts-oracle 0.92 | produces-oracle 0.25 | ✅ conforms | escalate (low confidence) |
| AC-7 | 改過之後加入標的不再自動重算 | 70、30、空白；擋下說「SOLUSDT 沒有分配比例——…」 | AD `reallocatedTo`/`rejection` | F:689 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.92 | ✅ conforms | accept |
| AC-8 | 改過之後拿掉標的 | BTCUSDT 70，未動用 30% | AD、C | F:721 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.52 | ✅ conforms | escalate (low confidence) |
| AC-9 | 一鍵回到平均分配 | 各 50 | C `splitEqually` | F:731 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.59 | ✅ conforms | escalate (low confidence) |
| AC-10 | 打開既有機器人看到它的分配 | 兩格是 60、40 | C `reset` | F:705 | asserts-oracle | produces-oracle | asserts-oracle 0.99 | produces-oracle 0.73 | ✅ conforms | recheck |
| AC-11 | 既有機器人原本就是平均分配 | 加入 SOLUSDT 後各 33.33 | AD `isEqualSplit` | F:676 | asserts-oracle | produces-oracle | asserts-oracle 0.92 | produces-oracle 0.36 | ✅ conforms | escalate (low confidence) |
| AC-12 | 合計正好 100 | 合計 100%、未動用 0%，可送出 | AD `toSummaryDto`、V | F:740 | asserts-oracle | produces-oracle | asserts-oracle 0.96 | produces-oracle 0.95 | ✅ conforms | accept |
| AC-13 | 合計少於 100 | 合計 60%、未動用 40%，可送出 | 同上 | F:740 | asserts-oracle | produces-oracle | asserts-oracle 0.79 | produces-oracle 0.32 | ✅ conforms | escalate (low confidence) |
| AC-14 | 合計超過 100 | 合計 110% 警示；擋下說「分配比例加起來是 110%，不得超過 100%」 | AD `rejection`、V `--over` | F:740、D:119 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.95 | ✅ conforms | accept |
| AC-15 | 分配比例為零 | 擋下說「BTCUSDT 的分配比例必須大於 0、不超過 100（單位：%）」 | AD `rejection` | F:740、D:98 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.84 | ✅ conforms | recheck |
| AC-16 | 分配比例超過 100 | 同上 | AD `rejection` | D:98 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.87 | ✅ conforms | accept |
| AC-17 | 超過兩位小數 | 擋下說「BTCUSDT 的分配比例最多到小數點後兩位」 | AD `rejection` | F:740、D:98 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.92 | ✅ conforms | accept |
| AC-18 | 送出每個標的的分配 | 交易服務收到 BTCUSDT 60、ETHUSDT 40 | C `buildPositionPlan`、strategy-bot-proxy.ts `toBody` | F:760、proxy spec:779 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.41 | ✅ conforms | escalate (low confidence) |
| AC-19 | 部位規劃收著不送分配 | 沒有收到任何分配比例 | 同上 | F:771、proxy spec:796 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.93 | ✅ conforms | accept |
| AC-20 | 交易服務仍拒絕 | 留在頁面、顯示那一句、填的還在 | use-strategy-bot-workbench.ts:114、StrategyBotForm.vue | workbench spec:170、F:712 | asserts-oracle | produces-oracle | asserts-oracle 0.96 | produces-oracle 0.91 | ✅ conforms | accept |
| AC-21 | 分到的資金不取整 | 「分到 333.3」 | AD `allocatedCapitalOf` | D:152 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.28 | ✅ conforms | escalate (low confidence) |
| AC-22 | 總金額空白 | 不顯示分到多少 | AD、V | F:795、D:152 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.84 | ✅ conforms | recheck |
| AC-23 | 分到的資金押不下固定金額 | 各「分到 25」並提醒「分到的資金不足，押不下 50」，仍可送出 | AD、`PositionSizingDomain.shortfallLabelWithin` | F:781 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.48 | ✅ conforms | escalate (low confidence) |
| AC-24 | 正好押得下 | 「分到 50」，不提醒 | 同上 | D:152、position-sizing-domain.spec | asserts-oracle | produces-oracle | asserts-oracle 0.89 | produces-oracle 0.84 | ✅ conforms | recheck |
| AC-25 | 全押永遠押得下 | 各「分到 25」，不提醒 | 同上 | D:152 | asserts-oracle | produces-oracle | asserts-oracle 0.99 | produces-oracle 0.57 | ✅ conforms | escalate (low confidence) |
| AC-26 | 有部位規劃的機器人（詳細區） | 「分配 60% · 分到 600」、「分配 40% · 分到 400」 | strategy-bot-domain.ts、strategy-bot-watched-symbol-domain.ts、StrategyBotWatchedSymbolList.vue | strategy-bot-domain.spec、StrategyBotWatchedSymbolList.spec | asserts-oracle | produces-oracle | asserts-oracle 0.91 | produces-oracle 0.95 | ✅ conforms | accept |
| AC-27 | 沒有部位規劃的機器人（詳細區） | 「分配 100%」，不寫分到多少 | 同上 | 同上 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.39 | ✅ conforms | escalate (low confidence) |

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| AD `rejection`（allocations 為空回 `null`） | 每一格都留空視為不給，交給交易服務的預設 | 已補進 PRD §4 Edge Cases（與交易服務「要嘛都給、要嘛都不給」一致） |
| strategy-bot-proxy.ts（讀 `allocationPercentage`，缺即 100） | 舊後端沒回分配時讀作 100 | undocumented 相容處理（與交易服務升級規則一致：單一標的 100） |

未發現實作 Out of Scope 項目的程式。

## Summary

- Conforms: 27/27 clauses ✅（100%）
- Violations / Mis-asserted / Partial / Gaps / Unclear: 無
- Orphans: 2（皆已說明）
- Jev: ran on 27 clauses
- Needs James: AC-4、5、6、8、9、11、13、18、21、23、25、27 — 皆為 Jev 對程式路徑「低信心」但同意結論（agree）；這幾條另由實作階段的突變測試佐證（平均分配捨去、自動重算、範圍、小數、合計、押不下、送出分配、詳細區分到多少的突變都被對應測試抓到）
- 第一輪結果（補測試前）：AC-10 🟠 mis-asserted（只測了 70/30，沒測 60/40）、AC-20 🟠（只用一般錯誤，沒測交易服務的拒絕原句與保留填寫）、AC-26 🔴/🟠（只測 domain 說法，沒測畫面上「 · 」接起來的那一行）；三者皆已補測試並重跑為 ✅
