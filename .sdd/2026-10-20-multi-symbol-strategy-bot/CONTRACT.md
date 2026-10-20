# Contract Traceability Matrix — 2026-10-20-multi-symbol-strategy-bot

Contract: PRD.md
Design map: ARCH.md
Implementation: `app/` (branch feature/multi-symbol-strategy-bot)
Oracle: Acceptance Criteria (22 clauses)

> Static conformance audit: test assertions and code paths were judged against the spec-derived oracle; no invented scenarios were executed. Only the mapped spec files were re-run as corroboration.

## Clauses

`Test audit` / `Code audit` are Claude's shadow verdict. `Jev test` / `Jev code` are Jev's pick with its confidence. `Status` and `Route` come from `jev_audit.py`.

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Jev test | Jev code | Status | Route |
|----|--------|------------------------|------|------|------------|------------|----------|----------|--------|-------|
| AC-01 | 加入第二個標的 | 監聽標的依序 BTCUSDT、ETHUSDT；送出的是這兩個 | strategy-bot-watched-symbol-list-domain.ts:35 · use-strategy-bot-form.ts:30 · strategy-bot-proxy.ts:347 | StrategyBotForm.spec.ts:345 | asserts-oracle | produces-oracle | asserts-oracle 0.96 | produces-oracle 0.43 | ✅ conforms | escalate (low confidence) |
| AC-02 | 只有一個標的也存得下去 | 存得下去 | strategy-bot-watched-symbol-list-domain.ts:15 | StrategyBotForm.spec.ts:119 · strategy-bot-watched-symbol-list-domain.spec.ts:7 | asserts-oracle | produces-oracle | asserts-oracle 0.89 | produces-oracle 0.95 | ✅ conforms | accept |
| AC-03 | 已滿 10 個不能再加 | 加不進去，畫面說「一台機器人最多盯 10 個交易標的」 | StrategyBotWatchedSymbolsField.vue:33,72 · strategy-bot-watched-symbol-list-domain.ts:11 | StrategyBotForm.spec.ts:388 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.91 | ✅ conforms | accept |
| AC-04 | 一個都沒挑 | 被擋下，說「必須指定這台機器人要盯哪些交易標的」 | strategy-bot-watched-symbol-list-domain.ts:17 · strategy-bot-write-domain.ts:49 | StrategyBotForm.spec.ts:378 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.96 | ✅ conforms | accept |
| AC-05 | 同一個標的不重複加入 | 監聽標的仍只有一個 BTCUSDT | strategy-bot-watched-symbol-list-domain.ts:37 | StrategyBotForm.spec.ts:357 · strategy-bot-watched-symbol-list-domain.spec.ts:24 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.71 | ✅ conforms | recheck |
| AC-06 | 拿掉一個標的 | 送出的監聽標的只有 BTCUSDT | strategy-bot-watched-symbol-list-domain.ts:44 | StrategyBotForm.spec.ts:367 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.73 | ✅ conforms | recheck |
| AC-07 | 打開既有機器人看到它的監聽標的 | 表單上的監聽標的是 BTCUSDT 與 ETHUSDT | use-strategy-bot-form.ts（reset） | StrategyBotForm.spec.ts:338 | asserts-oracle | produces-oracle | asserts-oracle 0.97 | produces-oracle 0.61 | ✅ conforms | recheck |
| AC-08 | 移除還有機器人持倉的標的 | 留在編輯頁，顯示持倉那一句並說監聽標的沒有改變 | strategy-bot-proxy.ts:315 · strategy-bot-watched-symbol-not-removable-error.ts | strategy-bot-proxy.spec.ts:536 · use-strategy-bot-workbench.spec.ts:173 | asserts-oracle | produces-oracle | asserts-oracle 0.97 | produces-oracle 0.85 | ✅ conforms | accept |
| AC-09 | 移除還有沒做完的自動下單的標的 | 留在編輯頁，顯示自動下單那一句 | 同上 | 同上 | asserts-oracle | produces-oracle | asserts-oracle 0.97 | produces-oracle 0.96 | ✅ conforms | accept |
| AC-10 | 移除空手的標的 | 存好，回到清單並顯示「更改成功」 | use-strategy-bot-workbench.ts:114 | use-strategy-bot-workbench.spec.ts:127 | asserts-oracle | produces-oracle | asserts-oracle 0.79 | produces-oracle 0.48 | ✅ conforms | escalate (low confidence) |
| AC-11 | 上次送出買入 | 「BTCUSDT · 買入」 | strategy-bot-watched-symbol-domain.ts:42 · StrategyBotListPanel.vue:241 | strategy-bot-watched-symbol-domain.spec.ts:33 · StrategyBotListPanel.spec.ts:471 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.68 | ✅ conforms | recheck |
| AC-12 | 還沒送出過 | 「SOLUSDT · 還沒送出過」 | strategy-bot-watched-symbol-domain.ts:60 | strategy-bot-watched-symbol-domain.spec.ts:33 · StrategyBotListPanel.spec.ts:109 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.96 | ✅ conforms | accept |
| AC-13 | 一個標的規則打架 | 「ETHUSDT · 規則打架了」警示語氣；機器人旁也標「規則打架了」 | strategy-bot-watched-symbol-domain.ts:42-58 · strategy-bot-run-state-domain.ts:61 | strategy-bot-watched-symbol-domain.spec.ts:33 · strategy-bot-run-state-domain.spec.ts:83 · StrategyBotListPanel.spec.ts:481 | asserts-oracle | produces-oracle | asserts-oracle 0.92 | produces-oracle 0.88 | ✅ conforms | accept |
| AC-14 | 只有部分標的停擺 | 「執行中」＋「1 個標的停擺」；「ETHUSDT · 停擺」；詳細區寫出原因 | strategy-bot-run-state-domain.ts:66 · StrategyBotStatusBadge.vue · StrategyBotWatchedSymbolList.vue | strategy-bot-run-state-domain.spec.ts:93 · StrategyBotListPanel.spec.ts:471-502 | asserts-oracle | produces-oracle | asserts-oracle 0.93 | produces-oracle 0.15 | ✅ conforms | escalate (low confidence) |
| AC-15 | 整台停擺 | 「停擺」＋原因，不另標幾個標的停擺 | strategy-bot-run-state-domain.ts:66-70 | strategy-bot-run-state-domain.spec.ts:103 | asserts-oracle | produces-oracle | asserts-oracle 0.99 | produces-oracle 0.96 | ✅ conforms | accept |
| AC-16 | 合約機器人每個標的的機器人持倉 | 「機器人持倉：多 0.01」「機器人持倉：空手」 | strategy-bot-watched-symbol-domain.ts:36 · StrategyBotWatchedSymbolList.vue | StrategyBotWorkbenchPage.spec.ts:185 · StrategyBotListPanel.spec.ts:627 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | unclear 0.35 | ❔ unclear | escalate (disagree) |
| AC-17 | 現貨機器人沒有機器人持倉 | 每個監聽標的都不出現持倉 | strategy-bot-proxy.ts（spot 不回持倉 → null）· strategy-bot-watched-symbol-domain.ts:36 | StrategyBotWorkbenchPage.spec.ts:203 | asserts-oracle | produces-oracle | asserts-oracle 0.97 | produces-oracle 0.85 | ✅ conforms | accept |
| AC-18 | 自動下單開關旁不再只講一份持倉 | 開關旁無持倉；每個標的各自顯示 | StrategyBotWorkbenchPage.vue:100-122 · StrategyBotAutoOrderSwitch.vue | StrategyBotWorkbenchPage.spec.ts:185 · StrategyBotAutoOrderSwitch.spec.ts | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.65 | ✅ conforms | recheck |
| AC-19 | 每一輪標出標的 | Run 102 寫 ETHUSDT、Run 101 寫 BTCUSDT | strategy-bot-proxy.ts:222 · StrategyBotRunHistory.vue | StrategyBotRunHistory.spec.ts:222 · strategy-bot-proxy.spec.ts:326 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | unclear 0.33 | ❔ unclear | escalate (disagree) |
| AC-20 | 只看某一個標的 | 只列 ETHUSDT 的那幾輪，由新到舊 | use-strategy-bots.ts:88 · strategy-bot-proxy.ts:218 | StrategyBotListPanel.spec.ts:503 · use-strategy-bots.spec.ts:278 · strategy-bot-proxy.spec.ts:317 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.39 | ✅ conforms | escalate (low confidence) |
| AC-21 | 回到全部標的 | 兩個標的的紀錄都列出 | use-strategy-bots.ts:88 · StrategyBotRunHistory.vue（全部 → null） | use-strategy-bots.spec.ts:278 · StrategyBotRunHistory.spec.ts:252 | asserts-oracle | produces-oracle | asserts-oracle 0.45 | produces-oracle 0.43 | ✅ conforms | escalate (low confidence) |
| AC-22 | 只盯一個標的時不給挑 | 無標的選單，每列仍寫 BTCUSDT | StrategyBotRunHistory.vue（`symbolOptions.length > 1`） | StrategyBotRunHistory.spec.ts:235 | asserts-oracle | produces-oracle | asserts-oracle 0.44 | produces-oracle 0.67 | ✅ conforms | escalate (low confidence) |

### Recheck / escalation notes (Claude)

- **AC-03** — first audit (before fix) found a violation: when full, the screen said 「已經盯滿 10 個交易標的」 instead of the PRD's 「一台機器人最多盯 10 個交易標的」, and the test asserted the wrong text. Fixed the wording (zh-TW and en) and the test; re-audited as conforms.
- **AC-20** — Jev first judged the panel test shallow (it only asserted the query). The test now also asserts the rendered rows are only the returned ETHUSDT rounds, newest first; re-audited as conforms.
- **AC-16 / AC-19** (Jev `unclear`) — re-read: proxy maps each `watchedSymbols[].autoOrderPosition` to a VO, `StrategyBotWatchedSymbolDomain` turns it into 「多 0.01」/「空手」 via `AutoOrderPositionDomain`, and `StrategyBotWatchedSymbolList.vue` renders 「機器人持倉：」+ label; each run record's `symbol` flows proxy → entity → DTO → `run-history-symbol`. Both are pinned by mutation tests (removing the position row or the symbol mapping turns their tests red). Status kept as Jev returned.
- Low-confidence escalations are Jev seeing only partial code paths (e.g. the trading service does the symbol filtering); every clause's mapped spec passes and survived falsification.

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| strategy-bot-run-state-domain.ts:66 (`'2 個標的停擺'` plural English) | English pluralisation of the partial-halt label | undocumented detail of AC-14, benign |
| use-strategy-bots.ts:84 | Run-history filter resets to all symbols when another bot is expanded or after run-now | documented in PRD §4 business rules (BR), benign |

No code implements an Out-of-Scope item (no position cap, no per-symbol overrides, no mixed spot/contract bots, trade journal untouched).

## Summary

- Conforms: 20/22 clauses ✅ (91%)
- Violations: none (AC-03 found and fixed during this audit)
- Mis-asserted: none (AC-20 test strengthened during this audit)
- Partial: none
- Gaps: none
- Unclear: AC-16, AC-19 (Jev unclear; Claude reads both as produces-oracle, see notes)
- Orphans: 2 (benign)
- Jev: ran on 22 clauses (+2 re-runs after fixes)
- Needs James: AC-16, AC-19 (disagree); AC-01, AC-10, AC-14, AC-20, AC-21, AC-22 (low Jev confidence on partial code view)
