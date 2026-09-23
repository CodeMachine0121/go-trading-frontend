# Contract Conformance — 短線回測畫面

**Oracle:** `PRD.md` Section 3 Acceptance Criteria (Gherkin) · **Mode:** static audit（對照 oracle 判讀測試斷言與程式路徑，不以整套測試的通過與否為依據）

## Clauses

| ID | Clause | Oracle | Test (asserts?) | Code (produces?) | Status |
|---|---|---|---|---|---|
| AC-01 | 選下一格開盤成交 | 送出的重演要求下一格開盤成交 | `StrategyScriptBacktestPaneShortTerm.spec`「兩格一起送出」+ `backtest-proxy-short-term.spec` body `fillTiming: nextOpen` — asserts | 窗格 → `FillTimingDomain` → `replayTimingBody` — produces | ✅ |
| AC-02 | 成交時點沒動 | 不帶成交時點 | proxy「沒動…不上線」+ pane「照今天一樣」— asserts | `fillTiming.isDefault` — produces | ✅ |
| AC-03 | 給驗證起點 | 帶著 1/21 | pane + proxy（ISO 字串）— asserts | `replayTimingBody` — produces | ✅ |
| AC-04 | 驗證起點留白 | 不帶驗證起點 | proxy「不上線」+ pane `validationStartTime` 為 null — asserts | 同上 — produces | ✅ |
| AC-05 | 驗證起點等於期間起點 | 不送出＋那一格寫出規則 | domain spec it.each + pane it.each — asserts | `BacktestValidationStartDomain`（經 `BacktestConditionsDomain`）— produces | ✅ |
| AC-06 | 驗證起點晚於期間終點 | 同上 | 同上 — asserts | 同上 — produces | ✅ |
| AC-07 | 交易服務指名驗證起點 | 那句話在驗證起點那一格 | proxy it.each（`BacktestFieldError.field`）+ pane「落在驗證起點那一格旁邊」— asserts | `BACKTEST_FIELD_TRANSLATIONS.validationStartTime` + `validationStartTimeError` — produces | ✅ |
| AC-08 | 合約交易策略的回測也有兩格 | 兩格存在且一起送出 | pane「重演一份合約交易策略」— asserts | `TradingStrategyBacktestPane` — produces | ✅ |
| AC-09 | 五格都有值 | 2.50、75.00、1 筆、25.00%、2 小時 30 分 | statistics domain spec + pane 成績單 — asserts | `BacktestTradeStatisticsDomain` + SummaryCard — produces | ✅ |
| AC-10 | 不適用 | 四格「不適用」、「0 筆」 | statistics domain spec — asserts | 同上 — produces | ✅ |
| AC-11 | 持倉不到一分鐘 | 「45 秒」 | it.each — asserts | `holdingTime` — produces | ✅ |
| AC-12 | 持倉超過一天 | 「3 天 4 小時」 | it.each — asserts | 同上 — produces | ✅ |
| AC-13 | 成績單說出成交時點 | 「下一格開盤成交」 | sections domain spec + pane — asserts | `FillTimingDomain.label` — produces | ✅ |
| AC-14 | 三塊依序呈現 | 驗證段、調參段、整段，各有成績單／曲線／明細／起訖 | sections domain spec（順序、起訖）+ pane（順序）— asserts | `BacktestDomain.sectionDtos` + `BacktestResultSections` — produces | ✅ |
| AC-15 | 驗證段以它為準 | 醒目＋那句話 | domain（emphasized、note）+ pane（note）— asserts | 同上 — produces | ✅ |
| AC-16 | 調參段說明 | 那句話 | domain + pane — asserts | 同上 — produces | ✅ |
| AC-17 | 沒給驗證起點 | 一塊、沒有分段字樣 | domain（title null）+ pane（一塊、無字樣）— asserts | 同上 — produces | ✅ |
| AC-18 | 長曲線取樣 | ≤2000 點，頭尾與最低點都在 | sampling domain spec + sections spec（畫取樣、成績單照完整）— asserts | `EquityCurveSamplingDomain` — produces | ✅ |
| AC-19 | 短曲線全畫 | 300 點全畫 | sampling spec — asserts | 同上 — produces | ✅ |
| AC-20 | 交易明細分批 | 200 筆＋「顯示 200 筆，共 1000 筆」；按一下 400 | `BacktestTradeTableBatches.spec` — asserts | `BacktestTradeTable` — produces | ✅ |
| AC-21 | 超過允許時間 | 沒有成績單＋縮短期間／粗一點的刻度；不說成算式的問題 | proxy（422＋標記→逾時錯誤）+ pane（警示內容、無算式警示）— asserts | `backtestFailureOf` → `useLatestRun.timeAllowanceSpentMessage` → 窗格 — produces | ✅ |

## Orphans

| Behavior | Note |
|---|---|
| 換了一次結果時明細回到第一批 | 畫面狀態的合理延伸，由 `BacktestTradeTableBatches.spec` 釘住 |
| 回測中提示說出九十秒上限 | PRD §1 預期結果（長重演）之延伸，文案 |

## Summary

21 clauses · ✅ 21 · 🔴 0 · 🟠 0 · 🟡 0 · ❌ 0 · ❔ 0 · ⚠️ 2（皆為文件化延伸，非範圍外）

**Ceiling：** 靜態對照。逾時的辨認依賴交易服務在 422 回覆帶 `timeAllowanceSpent`；合併前核對交易服務最終回覆形狀。
