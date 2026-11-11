# Contract Traceability Matrix — 交易方向搬到機器人與回測、每種結論的通知（操作台）

Contract: PRD.md
Design map: ARCH.md
Implementation: app/ (Nuxt console), tests/
Oracle: Acceptance Criteria + Core Business Rules (28 clauses)

> Static conformance audit: test assertions and code paths are judged against each clause's spec-derived oracle; no invented scenarios were executed. Audits run on 2026-11-12 at the branch tip before the contract fixes listed below.

## Clauses

The `Spec-expected` column holds the business-observable oracle from Phase 2; the
concrete artifact it bridges to (via UL-MAP/ARCH) is what the audit columns check.

`Test audit` / `Code audit` are Claude's shadow verdict. `Jev test` / `Jev code` are
Jev's pick with its confidence. `Status` and `Route` come from `jev_audit.py`.

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Jev test | Jev code | Status | Route |
|----|--------|------------------------|------|------|------------|------------|----------|----------|--------|-------|
| AC-1 | 拼合約交易策略時沒有交易模式 | 拼合約交易策略的表單上沒有交易模式那一格，也沒有它的說明 | TradingStrategyWorkbench.vue | TradingStrategyWorkbenchMarketDataKind.spec.ts 拼一份合約交易策略時沒有交易模式那一格 | asserts-oracle | produces-oracle | asserts-oracle 0.97 | produces-oracle 0.61 | ✅ conforms | recheck (mid confidence) |
| AC-2 | 存合約交易策略不帶交易模式 | 存合約交易策略時送給交易服務的內容沒有交易模式 | trading-strategy-proxy.ts toBody | trading-strategy-proxy.spec.ts 新增一份合約交易策略時送出行情種類，不送交易模式 | asserts-oracle | produces-oracle | asserts-oracle 0.99 | produces-oracle 0.99 | ✅ conforms | accept |
| AC-3 | 清單不再標交易模式 | 交易策略清單那一列沒有多空反手、只做多、只做空任何一個標記 | TradingStrategyListPanel.vue | TradingStrategyListPanel.spec.ts 標出每一份吃的行情，不標交易模式 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.25 | ✅ conforms | escalate (low confidence) |
| AC-4 | 挑只做空回測 | 合約交易策略回測挑只做空後，送出的這一次回測帶著只做空，那一格下方說明「賣出：空手開空。買入：持空倉就平掉，空手時什麼都不做。」 | TradingStrategyBacktestPane.vue runBacktest; backtest-proxy.ts contractTermsBody | TradingStrategyBacktestPaneContract.spec.ts 挑只做空時…; backtest-proxy-contract.spec.ts 帶著這一次挑的交易模式 | asserts-oracle | produces-oracle | asserts-oracle 0.99 | produces-oracle 0.37 | ✅ conforms | escalate (low confidence) |
| AC-5 | 沒動交易模式 | 合約交易策略回測沒動交易模式時，送出的這一次帶著多空反手 | TradingStrategyBacktestPane.vue tradingMode ref | TradingStrategyBacktestPaneContract.spec.ts 交易模式沒動就是多空反手 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.49 | ✅ conforms | escalate (low confidence) |
| AC-6 | 現貨交易策略沒有交易模式 | 現貨交易策略的回測條件沒有交易模式那一格，送出的回測沒有交易模式 | BacktestConditionFields.vue v-if replaysOnContractAccount; TradingStrategyBacktestPane.runBacktest | TradingStrategyBacktestPaneContract.spec.ts 一份 K 線交易策略沒有交易模式那一格 | asserts-oracle | produces-oracle | asserts-oracle 0.29 | produces-oracle 0.83 | ✅ conforms | escalate (low confidence) |
| AC-7 | 新拼一台合約機器人 | 新拼合約機器人時做多與做空都勾著，說明寫兩個都勾＝多空反手的意思 | use-strategy-bot-form.ts reset; StrategyBotTradingDirectionsDomain.description | StrategyBotFormDirectionsAndNotifications.spec.ts 新拼一台合約機器人 | asserts-oracle | produces-oracle | asserts-oracle 0.99 | produces-oracle 0.77 | ✅ conforms | recheck (mid confidence) |
| AC-8 | 只勾做多 | 只勾做多時說明寫「買入＝做多、賣出＝平多」 | StrategyBotTradingDirectionsDomain.description | StrategyBotFormDirectionsAndNotifications.spec.ts 取消 bot-trades-short 後… | asserts-oracle | produces-oracle | asserts-oracle 0.24 | produces-oracle 1.00 | ✅ conforms | escalate (low confidence) |
| AC-9 | 只勾做空 | 只勾做空時說明寫「賣出＝做空、買入＝平空」 | StrategyBotTradingDirectionsDomain.description | StrategyBotFormDirectionsAndNotifications.spec.ts 取消 bot-trades-long 後… | asserts-oracle | produces-oracle | asserts-oracle 0.36 | produces-oracle 1.00 | ✅ conforms | escalate (low confidence) |
| AC-10 | 兩個都不勾 | 兩個方向都沒勾時不讓送出，顯示「至少要選一個交易方向」 | StrategyBotWriteDomain.rejection | StrategyBotFormDirectionsAndNotifications.spec.ts 兩個都不勾 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.60 | ✅ conforms | recheck (mid confidence) |
| AC-11 | 現貨機器人沒有交易方向 | 現貨機器人表單上沒有交易方向，送出的內容沒有交易方向 | StrategyBotForm.vue v-if takesTradingDirections; use-strategy-bot-form buildWriteDto; proxy toBody | StrategyBotFormDirectionsAndNotifications 現貨機器人沒有交易方向那一組; strategy-bot-proxy-directions 現貨機器人不送交易方向 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.96 | ✅ conforms | accept |
| AC-12 | 打開既有的合約機器人 | 打開交易方向是做空的合約機器人時只有做空勾著 | use-strategy-bot-form reset | StrategyBotFormDirectionsAndNotifications 打開一台只做空的合約機器人 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.53 | ✅ conforms | escalate (low confidence) |
| AC-13 | 送出時帶著勾選的方向 | 只勾做多送出時，送出的交易方向是做多 | use-strategy-bot-form buildWriteDto; proxy toBody | StrategyBotFormDirectionsAndNotifications 只勾做多送出; proxy 合約機器人送出勾著的交易方向 | asserts-oracle | produces-oracle | asserts-oracle 0.99 | unclear 0.17 | ❔ unclear | escalate (disagree) |
| AC-14 | 自動下單開著時改方向 | 自動下單開著時改方向被交易服務拒絕：頁面留著、勾選不變，顯示「自動下單開著時不能改交易方向：請先在這台機器人的詳細頁關掉自動下單，再改交易方向」 | strategy-bot-proxy strategyBotFailureOf; StrategyBotTradingDirectionLockedError; use-strategy-bot-workbench save | strategy-bot-proxy-directions 自動下單開著; use-strategy-bot-workbench 自動下單開著時改交易方向 + StrategyBotForm 擋下時勾選不變 (added after audit) | asserts-oracle | produces-oracle | asserts-oracle 0.97 | produces-oracle 0.92 | ✅ conforms | accept |
| AC-15 | 監聽標的還有機器人持倉時改方向 | 監聽標的還有機器人持倉時改方向被拒絕：頁面留著，顯示監聽標的還有機器人持倉、要先讓它空手才能改交易方向或移除它 | strategy-bot-watched-symbol-not-removable-error.ts | use-strategy-bot-workbench 移除還沒空手的監聽標的 watchedSymbolHoldsPosition | asserts-oracle | produces-oracle | asserts-oracle 0.91 | produces-oracle 0.60 | ✅ conforms | recheck (mid confidence) |
| AC-16 | 監聽標的還有沒做完的自動下單時改方向 | 監聽標的還有沒做完的自動下單時改方向被拒絕：頁面留著，顯示還有沒做完的自動下單、要等它做完才能改交易方向或移除它 | strategy-bot-watched-symbol-not-removable-error.ts | use-strategy-bot-workbench 移除還沒空手的監聽標的 watchedSymbolAutoOrderOutstanding | asserts-oracle | produces-oracle | asserts-oracle 0.93 | produces-oracle 0.75 | ✅ conforms | recheck (mid confidence) |
| AC-17 | 新拼一台機器人的預設通知 | 新拼機器人時買入與賣出通知勾著、持有沒勾，說明寫持有通知只在回到持有時通知一次 | use-strategy-bot-form reset + StrategyBotNotificationsDto defaults | StrategyBotFormDirectionsAndNotifications 新拼一台：買入與賣出通知勾著 | asserts-oracle | produces-oracle | asserts-oracle 0.99 | produces-oracle 0.52 | ✅ conforms | escalate (low confidence) |
| AC-18 | 勾持有通知送出 | 三個通知都勾著送出時，送出的通知是買入開、賣出開、持有開 | use-strategy-bot-form buildWriteDto; proxy toBody | StrategyBotFormDirectionsAndNotifications 勾持有通知送出; proxy-directions | asserts-oracle | produces-oracle | asserts-oracle 0.92 | produces-oracle 0.99 | ✅ conforms | accept |
| AC-19 | 三個都不勾 | 三個通知都沒勾時照樣送得出去，送出的通知三個都關 | StrategyBotWriteDomain (no rejection for notifications) | StrategyBotFormDirectionsAndNotifications 三個都不勾照樣送得出去 | asserts-oracle | produces-oracle | asserts-oracle 0.48 | produces-oracle 0.73 | ✅ conforms | escalate (low confidence) |
| AC-20 | 打開既有的機器人 | 打開只開賣出通知的機器人時只有賣出通知勾著 | use-strategy-bot-form reset | StrategyBotFormDirectionsAndNotifications 打開一台只開賣出通知的機器人 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.52 | ✅ conforms | escalate (low confidence) |
| AC-21 | 合約機器人的詳細區 | 合約機器人詳細區顯示交易方向「做多＋做空（多空反手）」與通知「買入、賣出」 | StrategyBotDomain.toDto + StrategyBotSettingsSummary | StrategyBotListPanel 合約機器人的詳細區寫出交易方向 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | unclear 0.64 | ❔ unclear | escalate (disagree) |
| AC-22 | 現貨機器人通知全關 | 三個通知都關的現貨機器人詳細區沒有交易方向那一行，通知寫「全部關閉」 | StrategyBotNotificationsDomain.label; summary v-if | StrategyBotListPanel 現貨機器人通知全關 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.91 | ✅ conforms | accept |
| AC-23 | 清單那一列標出方向 | 交易方向為做空的合約機器人在清單那一列標出「只做空」 | StrategyBotListPanel row meta + shortLabel | StrategyBotListPanel 清單那一列標出合約機器人的交易方向 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | unclear 0.33 | ❔ unclear | escalate (disagree) |
| BR-1 | 交易方向 ↔ 交易模式：只有做多＝只做多；只有做空＝只做空；兩者＝多空反手。畫面上的說明、清單上的標記都用這三個名字。 | 交易方向對照交易模式：只有做多＝只做多、只有做空＝只做空、兩者＝多空反手；說明與標記用這三個名字 | strategy-bot-trading-directions-domain.ts | strategy-bot-trading-directions-domain.spec.ts | asserts-oracle | produces-oracle | shallow 0.17 | produces-oracle 0.51 | 🟠 mis-asserted | escalate (disagree) |
| BR-2 | 合約機器人至少要勾一個交易方向；現貨機器人沒有交易方向。 | 合約機器人至少要勾一個交易方向；現貨機器人沒有交易方向 | StrategyBotWriteDomain; StrategyBotDomain | directions domain spec; strategy-bot-domain-settings spec | asserts-oracle | produces-oracle | asserts-oracle 0.84 | diverges 0.13 | 🔴 violation | escalate (violation) |
| BR-3 | 每次送出都帶畫面上的方向（合約）與通知（全部機器人）——使用者看得到的就是他要送的。 | 每次送出都帶畫面上的方向（合約）與通知（全部機器人） | strategy-bot-proxy toBody | strategy-bot-proxy-directions 送出 | asserts-oracle | produces-oracle | asserts-oracle 0.96 | produces-oracle 0.85 | ✅ conforms | accept |
| BR-4 | 交易服務沒說某台機器人的方向時讀作兩者；沒說通知時讀作買入開、賣出開、持有關。 | 交易服務沒說方向時讀作兩者；沒說通知時讀作買入開、賣出開、持有關 | strategy-bot-proxy toTradingDirections/toNotifications | strategy-bot-proxy-directions 交易服務沒說時 | asserts-oracle | produces-oracle | asserts-oracle 0.93 | produces-oracle 0.37 | ✅ conforms | escalate (low confidence) |
| BR-5 | 改方向被擋下的三種原因各有一句說法；其餘拒絕照交易服務原句。 | 改方向被擋下的三種原因各有一句說法；其餘拒絕照交易服務原句 | strategy-bot-proxy strategyBotFailureOf | proxy-directions + strategy-bot-proxy.spec watched symbol reasons | asserts-oracle | produces-oracle | asserts-oracle 0.63 | produces-oracle 0.56 | ✅ conforms | escalate (low confidence) |

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| app/locales/*/strategy-bot.ts `tradingDirectionsHelp` | 表單說明多一句「只有在機器人已停止、自動下單關著、每個監聽標的都空手時才改得動」 | undocumented（說明文字，無行為；與交易服務規則一致） |

## Summary

- Conforms: 23/28 clauses ✅ (82%)
- Violations: BR-2
- Mis-asserted: BR-1
- Partial: —
- Gaps: —
- Unclear: AC-13, AC-21, AC-23
- Orphans: 1 (undocumented)
- Jev: ran on 28 clauses
- Needs James: AC-3 (low confidence), AC-4 (low confidence), AC-5 (low confidence), AC-6 (low confidence), AC-8 (low confidence), AC-9 (low confidence), AC-12 (low confidence), AC-13 (disagree), AC-17 (low confidence), AC-19 (low confidence), AC-20 (low confidence), AC-21 (disagree), AC-23 (disagree), BR-1 (disagree), BR-2 (violation), BR-4 (low confidence), BR-5 (low confidence)

## Recheck notes and fixes

- **AC-14（fixed）**：首輪我的影子判斷是 `shallow`——「勾選不變」沒有任何測試釘住。已補 `StrategyBotFormDirectionsAndNotifications.spec.ts`「擋下的那一句出現時頁面留著、勾選不變」，重新稽核為 conforms/accept。
- **AC-13、AC-21、AC-23（unclear, escalate: disagree）**：Jev 只看到我給的窄範圍程式行而判 unclear。重讀：`use-strategy-bot-form.ts` buildWriteDto → `strategy-bot-proxy.ts` toBody；`StrategyBotDomain.toDto` → `StrategyBotSettingsSummary` / 清單列 `tradingDirectionsShortLabel`。對應測試單獨執行皆綠且斷言 oracle 原文。狀態照腳本保留。
- **BR-1（mis-asserted, Jev shallow 0.17）**：低信心。測試對三種組合各斷言詳細區與清單用語，並另有說明文字測試；我維持 asserts-oracle 的影子判斷，狀態照腳本保留。
- **BR-2（violation, Jev diverges 0.13）**：低信心。現貨「沒有交易方向」由 `StrategyBotDomain.toDto`（page.takesTradingDirections）、`use-strategy-bot-form` 送 null、proxy 不讀不送三處成立，皆有測試（含現貨帶方向仍不顯示）。重讀未見偏差，狀態照腳本保留，列入 Needs James。
- 其餘 escalate（low confidence）皆為 Jev 對程式判斷信心不足、與影子判斷一致；對應測試單獨執行皆綠。
