# Contract Traceability Matrix — 策略腳本的用途（操作台）

Contract: PRD.md
Design map: ARCH.md
Implementation: app/ (Nuxt console), tests/
Oracle: Acceptance Criteria + Core Business Rules (26 clauses)

> Static conformance audit: test assertions and code paths are judged against each clause's spec-derived oracle; no invented scenarios were executed. Audits run on 2026-11-12 at the branch tip before the contract fixes listed below.

## Clauses

The `Spec-expected` column holds the business-observable oracle from Phase 2; the
concrete artifact it bridges to (via UL-MAP/ARCH) is what the audit columns check.

`Test audit` / `Code audit` are Claude's shadow verdict. `Jev test` / `Jev code` are
Jev's pick with its confidence. `Status` and `Route` come from `jev_audit.py`.

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Jev test | Jev code | Status | Route |
|----|--------|------------------------|------|------|------------|------------|----------|----------|--------|-------|
| AC-1 | 另存成圖表用 | 另存新腳本時用途選圖表用，送給交易服務的新腳本用途是圖表用 | IndicatorCalculationPanel usage-options wiring; StrategyScriptNameDialog; use-strategy-script-library.createStrategyScript; strategy-script-proxy writeStrategyScript | NameDialog 選圖表用; library 另存新腳本時帶著選的用途; proxy 另存一支 chart + IndicatorCalculationPanelStrategyScript 用途 (added after audit) | asserts-oracle | produces-oracle | asserts-oracle 0.85 | diverges 0.23 | 🔴 violation | escalate (violation) |
| AC-2 | 沒動用途 | 另存新腳本沒動用途時，對話框預選計算用，送給交易服務的新腳本用途是計算用 | StrategyScriptNameDialog usage ref default; service.listUsageOptions order | NameDialog 預選計算用 + IndicatorCalculationPanelStrategyScript 用途 (added after audit) | asserts-oracle | produces-oracle | asserts-oracle 1.00 | unclear 0.51 | ❔ unclear | escalate (disagree) |
| AC-3 | 改名時不問用途 | 改名一支既有腳本時對話框沒有用途那一格，送出的內容沒有用途 | IndicatorCalculationPanel rename dialog (no usage-options); write domain usage null for id; proxy | NameDialog 改名時沒給用途選項; library 改名時不帶用途; proxy 改寫不送 | asserts-oracle | produces-oracle | asserts-oracle 0.93 | produces-oracle 0.80 | ✅ conforms | recheck (mid confidence) |
| AC-4 | 自己的腳本改成圖表用 | 自己的計算用腳本「均線」按改成圖表用後，那一列標成圖表用，並顯示「已把「均線」改成圖表用」 | StrategyScriptLibraryList; IndicatorCalculationPanel @switch-usage; use-strategy-script-library.switchStrategyScriptUsage | LibraryDialog 自己的每一列標出用途; library 切換 + IndicatorCalculationPanelStrategyScript 用途 (added after audit) | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.84 | ✅ conforms | recheck (mid confidence) |
| AC-5 | 市集副本改成圖表用 | 計算用的市集副本按改成圖表用後，那一列標成圖表用 | StrategyScriptLibraryList adopted row; composable | LibraryDialog 市集副本也標出用途、也能切換; library 切換 id 9 + IndicatorCalculationPanelStrategyScript 用途 (added after audit) | asserts-oracle | produces-oracle | asserts-oracle 0.96 | produces-oracle 0.32 | ✅ conforms | escalate (low confidence) |
| AC-6 | 圖表用改回計算用 | 自己的圖表用腳本按改成計算用後，那一列標成計算用 | composable switchStrategyScriptUsage | library 切換 chart→calculation | asserts-oracle | produces-oracle | asserts-oracle 0.96 | produces-oracle 0.63 | ✅ conforms | recheck (mid confidence) |
| AC-7 | 被交易策略用著 | 交易策略「4H 趨勢」在用時切成圖表用被拒絕：顯示交易服務那一句（點名「4H 趨勢」），那一列仍標計算用 | strategy-script-proxy strategyScriptFailureOf; composable catch | proxy 被交易策略用著; library 被交易策略用著時 | asserts-oracle | produces-oracle | asserts-oracle 0.96 | produces-oracle 0.53 | ✅ conforms | escalate (low confidence) |
| AC-8 | 圖表用、畫得成線 | 圖表用、畫得成線的腳本出現在圖表的指標選單裡而且挑得到 | AvailableStrategyScriptsDto.toChartApplicable | KCandleChartPanelIndicators 只列圖表用的腳本 | asserts-oracle | produces-oracle | asserts-oracle 0.95 | produces-oracle 0.67 | ✅ conforms | recheck (mid confidence) |
| AC-9 | 計算用、畫得成線 | 計算用、畫得成線的腳本不在圖表的指標選單裡 | AvailableStrategyScriptsDto.toChartApplicable | KCandleChartPanelIndicators 只列圖表用的腳本 | asserts-oracle | produces-oracle | asserts-oracle 0.99 | produces-oracle 0.47 | ✅ conforms | escalate (low confidence) |
| AC-10 | 圖表用、畫不成線 | 圖表用、畫不成線的腳本列在選單裡但挑不到 | ChartIndicatorPanel disabled by drawableOnChart | KCandleChartPanelIndicators $kind 類型的策略腳本列得出來但挑不到 | asserts-oracle | produces-oracle | asserts-oracle 0.92 | produces-oracle 0.76 | ✅ conforms | recheck (mid confidence) |
| AC-11 | 一支圖表用的都沒有 | 只有計算用腳本時，圖表指標選單顯示「沒有圖表用的策略腳本」並說明到策略腳本頁新增一支或把既有的改成圖表用 | ChartIndicatorPanel empty slot + locales | KCandleChartPanelIndicators 一支策略腳本都還沒存過時明說; KCandleContractChartPanelIndicators 明說並指路 (strengthened) | asserts-oracle | produces-oracle | asserts-oracle 0.99 | produces-oracle 0.59 | ✅ conforms | escalate (low confidence) |
| AC-12 | 上次擺著的指標現在是計算用 | 上次擺在圖上、現在是計算用的那一支不還原回圖上 | toChartApplicable filter feeding restore | KCandleChartPanelRestore 現在是計算用的那一筆不回來 | asserts-oracle | produces-oracle | asserts-oracle 0.97 | produces-oracle 0.68 | ✅ conforms | recheck (mid confidence) |
| AC-13 | 計算用、吐訊號 | 計算用、吐訊號的腳本挑得到當訊號來源 | SignalSourceCandidateDomain.feedsSignalSource | signal-source-choices-domain 計算用而且吐訊號的才列 | asserts-oracle | produces-oracle | asserts-oracle 0.99 | produces-oracle 0.80 | ✅ conforms | recheck (mid confidence) |
| AC-14 | 圖表用、吐訊號 | 圖表用、吐訊號的腳本「突破線」不在訊號來源選項裡，已指著它的來源顯示「突破線（這支是圖表用，當不了訊號來源）」 | SignalSourceCandidateDomain.unusableReason | signal-source-choices-domain 當不了的那幾支各說原因; workbench 訊號來源只列計算用 | asserts-oracle | produces-oracle | asserts-oracle 0.99 | produces-oracle 0.75 | ✅ conforms | recheck (mid confidence) |
| AC-15 | 吐訊號的全是圖表用 | 吐訊號的腳本全是圖表用時，訊號來源卡說明要到策略腳本庫把要用的改成計算用 | SignalSourceChoicesDomain shortage; TradingStrategySignalSourceCard | signal-source-choices-domain 吐訊號的全是圖表用; TradingStrategyWorkbench 吐訊號的全是圖表用 | asserts-oracle | produces-oracle | asserts-oracle 0.91 | produces-oracle 0.52 | ✅ conforms | escalate (low confidence) |
| AC-16 | 計算用但吐數字 | 計算用但吐一串數字的腳本照舊不在訊號來源選項裡 | SignalSourceCandidateDomain.emitsSignal | workbench 計算用但吐數字的照舊不列 | asserts-oracle | produces-oracle | asserts-oracle 0.92 | produces-oracle 0.55 | ✅ conforms | escalate (low confidence) |
| AC-17 | 篩選不列圖表用 | 合約、吐訊號、圖表用的腳本不在篩選設定的腳本選項裡 | StrategyScriptDomain.screensSymbols | symbol-screening-application does not list chart-usage scripts | asserts-oracle | produces-oracle | asserts-oracle 0.92 | produces-oracle 0.25 | ✅ conforms | escalate (low confidence) |
| AC-18 | 市集卡標圖表用 | 市集上圖表用的腳本，卡上標「圖表用」 | MarketplaceStrategyScriptCard usage fact | StrategyScriptMarketplacePanel 每張卡標出用途 | asserts-oracle | produces-oracle | asserts-oracle 0.95 | produces-oracle 0.45 | ✅ conforms | escalate (low confidence) |
| AC-19 | 市集卡標計算用 | 市集上計算用的腳本，卡上標「計算用」 | MarketplaceStrategyScriptCard usage fact | StrategyScriptMarketplacePanel 每張卡標出用途 | asserts-oracle | produces-oracle | asserts-oracle 0.87 | produces-oracle 0.44 | ✅ conforms | escalate (low confidence) |
| AC-20 | 副本留著加入當下的用途 | 加入過圖表用副本、發佈者之後切成計算用時，自己腳本庫裡那份副本仍標「圖表用」 | strategy-script-proxy listAvailableStrategyScripts adopted usage | proxy 自己的與市集副本各讀它們自己的用途 | asserts-oracle | produces-oracle | asserts-oracle 0.89 | produces-oracle 0.84 | ✅ conforms | recheck (mid confidence) |
| AC-21 | 交易服務沒說用途 | 交易服務沒說某一支的用途時，在市集或腳本庫標「計算用」 | StrategyScriptUsageDomain default | usage domain spec; proxy specs; marketplace panel usage '' | asserts-oracle | produces-oracle | asserts-oracle 0.40 | unclear 0.33 | ❔ unclear | escalate (disagree) |
| BR-1 | 用途二選一：圖表用、計算用；沒說、說了不認得的一律讀作計算用。 | 用途二選一；沒說或不認得一律讀作計算用 | StrategyScriptUsageDomain | usage domain spec | asserts-oracle | produces-oracle | asserts-oracle 0.96 | produces-oracle 0.57 | ✅ conforms | escalate (low confidence) |
| BR-2 | 圖表選單：只列圖表用；圖表用之中畫不成線的照舊列出但挑不到。 | 圖表選單只列圖表用；其中畫不成線的列出但挑不到 | AvailableStrategyScriptsDto; ChartIndicatorPanel | chart indicator tests | asserts-oracle | produces-oracle | shallow 0.35 | not-implemented 0.21 | ❌ gap | escalate (disagree) |
| BR-3 | 訊號來源：計算用而且吐訊號；篩選：計算用而且原有規則成立。 | 訊號來源：計算用而且吐訊號；篩選：計算用而且原有規則成立 | signal-source-candidate-domain; strategy-script-domain | signal-source-choices spec; screening application spec | asserts-oracle | produces-oracle | asserts-oracle 0.95 | produces-oracle 0.64 | ✅ conforms | recheck (mid confidence) |
| BR-4 | 用途只在新增時送；改寫與改名不送；切換是獨立的動作。 | 用途只在新增時送；改寫與改名不送；切換是獨立的動作 | write domain; proxy | proxy usage spec | asserts-oracle | produces-oracle | asserts-oracle 0.89 | produces-oracle 0.68 | ✅ conforms | recheck (mid confidence) |
| BR-5 | 存交易策略、存篩選設定、回測市集副本被交易服務以用途拒絕時，照交易服務那一句顯示。 | 存交易策略、存篩選設定、回測市集副本被交易服務以用途拒絕時，照交易服務那一句顯示 | use-trading-strategy-workbench messageOf; symbol screening failure message; backtest requestRejected | (none specific to usage refusals)use-trading-strategy-workbench 交易服務以用途拒絕 (added after audit) | asserts-oracle | produces-oracle | asserts-oracle 0.92 | produces-oracle 0.61 | ✅ conforms | recheck (mid confidence) |

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| app/composables/use-strategy-script-library.ts `switchStrategyScriptUsage` 早退 | 清單上已經沒有那一支時什麼都不做、不打交易服務 | undocumented（防禦行為，有測試） |
| app/locales/*/strategy-script.ts `usageSwitchFailed` | 切換失敗而交易服務沒給話時的備用句 | undocumented（沿用腳本庫既有失敗處理） |

## Summary

- Conforms: 22/26 clauses ✅ (85%)
- Violations: AC-1
- Mis-asserted: —
- Partial: —
- Gaps: BR-2
- Unclear: AC-2, AC-21
- Orphans: 2 (undocumented)
- Jev: ran on 26 clauses
- Needs James: AC-1 (violation), AC-2 (disagree), AC-5 (low confidence), AC-7 (low confidence), AC-9 (low confidence), AC-11 (low confidence), AC-15 (low confidence), AC-16 (low confidence), AC-17 (low confidence), AC-18 (low confidence), AC-19 (low confidence), AC-21 (disagree), BR-1 (low confidence), BR-2 (disagree)

## Recheck notes and fixes

- **AC-1、AC-2、AC-4、AC-5（fixed）**：首輪影子判斷 `shallow`——單元（對話框、清單、composable、proxy）各自有測試，但策略腳本畫面把用途選項交給另存對話框、把切換事件接到 composable 的那兩條線沒有測試：拿掉 `:usage-options` 或 `@switch-usage` 時全套測試仍綠（手動突變存活）。已在 `IndicatorCalculationPanelStrategyScript.spec.ts` 補四個畫面層測試，三個接線突變皆被抓到。重新稽核：AC-4 conforms；AC-5、AC-2 conforms/unclear（escalate）；AC-1 被 Jev 判 violation（diverges 0.23，低信心）——重讀程式路徑（單選 → 對話框 emit → library → write DTO → POST body `usage: 'chart'`）且單獨執行該測試為綠、斷言 oracle，我判 produces-oracle；狀態照腳本保留，列入 Needs James。
- **AC-11（fixed）**：現貨圖表空清單的測試只檢查開頭「沒有圖表用的策略腳本」，說明下一步的部分缺了也會綠。已改成斷言整句。
- **BR-5（fixed）**：首輪 partial——以用途拒絕存交易策略沒有測試。已補 `use-trading-strategy-workbench.spec.ts`「交易服務以用途拒絕…照它那一句說」；篩選設定的同一條路已有既有測試（`use-symbol-screening-profiles.spec.ts` 照後端原句）。回測市集副本被拒走既有 `requestRejected`。
- **BR-2（gap, Jev not-implemented 0.21）**：低信心。`AvailableStrategyScriptsDto.toChartApplicable` 只留圖表用、`ChartIndicatorPanel` 依 drawableOnChart 停用，皆有測試；狀態照腳本保留，列入 Needs James。
- **AC-21（unclear）**：`StrategyScriptUsageDomain` 建構子把空白與不認得的值讀成計算用，`strategy-script-usage-domain.spec.ts` 與市集卡 `usage: ''` 測試皆斷言「計算用」。
