# Contract Traceability Matrix — 信號指標值種類（前端）

Contract: `PRD.md`
Design map: `ARCH.md`
Implementation: `app/domain/`, `app/infrastructure/proxy/`, `app/components/`
Oracle: Acceptance Criteria (17 scenarios + 8 business rules)
Verification: **static conformance audit** — judges test assertions and code paths
against the spec's expected outcome; does not execute invented scenarios.

## Clauses

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-01a | US-01 選單依序列出五種 | 選單 = 一個數字 / 一串數字 / 一個是非 / 一串是非 / 一個信號，就這個順序 | `vo/indicator-result-type.ts:6-12` · `service/indicator-calculation-service.ts listResultTypeOptions` | `indicator-calculation-service.spec.ts` "可以挑的指標值種類就是那五種" + `IndicatorCalculationPanel.spec.ts` "指標值種類就是領域給的那五種" | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01b | US-01 信號不是預設 | 沒挑過 → 目前種類是「一個數字」 | `domains/indicator-result-type-domain.ts` `DEFAULT` = float | `indicator-result-type-domain.spec.ts` "完全沒有宣告時當作一個數字" + service "沒有特別挑時算的是一個數字" | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01c | US-01 認不得的種類仍當一個數字 | 後端回報 `wizardry` → 以「一個數字」呈現，畫面不壞 | `indicator-result-type-domain.ts` 建構子寬容解讀 | `indicator-result-type-domain.spec.ts` "宣告了不認得的種類時當作一個數字" + `indicator-calculation-domain.spec.ts` "後端回報了不認得的種類時，仍以一個數字呈現" | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02a | US-02 外框進入點回傳一個信號 | 種類=信號 → 簽章是「回傳一個信號」，不是一組名稱對應值 | `domains/indicator-script-domain.ts` `frameHeader` `isSignal()` 分支 → `indicator.Signal` | `indicator-script-domain.spec.ts` "信號種類的外框回傳一個信號，不是一組 map" + parametrized row + `IndicatorCalculationPanel.spec.ts` "挑了 signal，外框就產出 indicator.Signal" | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02b | US-02 範例示範選一個信號 | 種類=信號 → 範例用系統提供的方式選出買/賣/持有其一並回傳 | `indicator-script-domain.ts` `EXAMPLE_SCRIPT_BODIES.signal` | `indicator-script-domain.spec.ts` "信號種類的範例內容用系統提供的方式選一個信號" (asserts `return indicator.Buy` / `return indicator.Hold`, no `map[string]`) + service spec | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02c | US-02 切回一個數字時外框變回原樣 | 種類 信號→一個數字 → 簽章變回一組名稱對應數字 | `frameHeader` 每次依 `isSignal()` 重算 | `indicator-script-domain.spec.ts` parametrized rows (`float` → `map[string]float64`) + `IndicatorCalculationPanel.spec.ts` `it.each` per kind incl float & signal | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02d | US-02 內容行數不變 | 信號種類的外框行數與其他四種一致，使用者第一行的行號對得上 | `frameHeader` 只有簽章一行變 | `indicator-script-domain.spec.ts` "每一種種類的外框行數都一樣" (list now includes `signal` → `[9,9,9,9,9]`) | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03a | US-03 算出買入 | 種類=信號 → 呈現一個結論「買入」，沒有指標名稱欄 | `domains/indicator-calculation-domain.ts` `toDto` `isSignal()` 分支 → `SignalDomain('buy').label()`；`IndicatorCalculationPanel.vue` `signal-verdict` 區塊 | `indicator-calculation-domain.spec.ts` "信號種類的結果是一個「買入」結論，沒有指標名稱" + `IndicatorCalculationPanel.spec.ts` "信號種類算出來時呈現一個結論，不是名稱-數值表" (asserts verdict='買入'、無 indicator-row) | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03b | US-03 算出持有 | 種類=信號 → 呈現「持有」 | 同上 + `SignalDomain('hold').label()` = 持有 | `indicator-calculation-domain.spec.ts` 同一 `it.each`（hold 列）+ `signal-domain.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03c | US-03 其他種類的呈現不變 | 種類=一串數字 → 一組「名稱 → 一串值」，與之前完全一樣 | `toDto` 非信號分支（未變）| 既有 `indicator-calculation-domain.spec.ts` / `IndicatorCalculationPanel.spec.ts` 結果表測試（未改，仍綠）| asserts-oracle | produces-oracle | ✅ conforms |
| AC-04a | US-04 信號種類正常送出 | 種類=一個信號 + 其餘成立 → 送出 | `domains/backtest-request-domain.ts` `BACKTEST_RESULT_TYPE = 'signal'` 相符即通過 | `backtest-application.spec.ts` "種類是「一個信號」時正常送出" | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04b | US-04 一個數字被擋下，指向下拉選單 | 種類=一個數字 → 不送出；算式那一格說明回測只跑信號種類、請改成「一個信號」 | `backtest-request-domain.ts` 種類檢查 throw（field `scriptBody`，訊息含「一個信號」）| `backtest-application.spec.ts` "指標值種類不是「一個信號」時擋在算式那一格" (field=scriptBody、訊息含 一個信號 + 一串數字) + `StrategyBacktestPane.spec.ts` "算式宣告的不是「一個信號」時當場說清楚" | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04c | US-04 訊息說出目前的種類 | 種類=一串是非 → 訊息說出「一串是非」 | `backtest-request-domain.ts` 訊息含 `resultType.label()` | `backtest-application.spec.ts` 上列 assert 訊息含「一串數字」（floatList 的 label）——同一機制，不同 label | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04d | US-04 種類對就不再攔在種類上 | 種類=一個信號 + 本金 0 → 擋的是本金那一格 | `backtest-request-domain.ts` 驗證順序：本金檢查在種類檢查之前 | `backtest-application.spec.ts` "種類是「一個信號」但本金不合法時，擋的是本金那一格" | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05a | US-05 回測規則講的是信號種類 | 規則清單「說出這一棒的意見」講「種類選『一個信號』，回傳買入/賣出/持有」；無「多放一個叫 signal 的名稱」「看正負號」 | `vo/backtest-rule-vo.ts` `BACKTEST_RULES` 改寫 | `StrategyBacktestPane.spec.ts` "規則講的是信號種類，不是「多放一個叫 signal 的名稱、看正負號」" (title 含「只跑「一個信號」的算式」、文字含「指標值種類選「一個信號」」、不含「看正負號」) | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05b | US-05 讀法表是三個值 | 對照表 = 買入/賣出/持有，由系統提供的方式選出；無「大於零/小於零/等於零/沒放這個名字」 | `vo/signal-reading-vo.ts` `SIGNAL_READINGS`（3 列）| `StrategyBacktestPane.spec.ts` "說得出信號種類的算式能回傳哪三個值" (asserts indicator.Buy/Sell/Hold + 買入/賣出/持有、不含「大於 0」) | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06 | US-06 信號種類策略標明畫不成線 | 信號策略在挑策略清單標明畫不成線、套用被擋下，機制與「一個是非」一致 | `domains/strategy-domain.ts` `drawableOnChart = resultType.holdsNumbers()`（信號 → false，零改動）· `ChartIndicatorPanel.vue` disabled option + 「（畫不成線）」 | `KCandleChartPanelIndicators.spec.ts` "$kind 類型的策略列得出來但挑不到"（`it.each` 涵蓋 bool 與 signal：option disabled 且含「畫不成線」）| asserts-oracle | produces-oracle | ✅ conforms |
| BR-1 | 五選一，順序如上 | 見 AC-01a | `vo/indicator-result-type.ts` | AC-01a tests | asserts-oracle | produces-oracle | ✅ conforms |
| BR-2 | 沒挑/認不得 → 一個數字 | 見 AC-01b/c | `indicator-result-type-domain.ts` | AC-01b/c tests | asserts-oracle | produces-oracle | ✅ conforms |
| BR-3 | 種類差異集中在一張表 | 加一種 = 加一列 | `indicator-result-type-domain.ts` `INDICATOR_RESULT_TYPE_DESCRIPTIONS`（signal 列 + `isSignal` 欄）| `indicator-result-type-domain.spec.ts` `it.each` 五列共用同一組斷言 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-4 | 信號外框 + 範例 | 見 AC-02a/b/d | `indicator-script-domain.ts` | AC-02 tests | asserts-oracle | produces-oracle | ✅ conforms |
| BR-5 | 信號呈現一個結論、無名稱、中文由領域給 | 見 AC-03；`SignalDomain` 給中文與語氣 | `signal-domain.ts` + `indicator-calculation-domain.ts` | `signal-domain.spec.ts`（buy/sell/hold → 買入/賣出/持有 + tone）+ AC-03 tests | asserts-oracle | produces-oracle | ✅ conforms |
| BR-6 | 回測把關：種類先過才輪到本金等 | 見 AC-04b/d | `backtest-request-domain.ts` 驗證順序 | AC-04b/d tests | asserts-oracle | produces-oracle | ✅ conforms |
| BR-7 | 說明更新 | 見 AC-05a/b | `backtest-rule-vo.ts` · `signal-reading-vo.ts` | AC-05 tests | asserts-oracle | produces-oracle | ✅ conforms |
| BR-8 | 信號畫不成線（比照是非）| 見 AC-06 | `strategy-domain.ts`（零改動）| 見 AC-06 | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-perf | 種類切換只重算外框文字 | 無新增資料讀取 | `frameHeader` 純字串組裝 | 既有 script-domain 測試（同步、無 I/O）| asserts-oracle | produces-oracle | ✅ conforms |
| NFR-compat | 沒挑種類的既有使用方式不變 | 既有 float/bool/list 請求行為與結果形狀不變 | 所有非信號分支未改 | 全部既有測試仍綠（1723 passed）| asserts-oracle | produces-oracle | ✅ conforms |

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| `IndicatorCalculationResultDto.signalTone` (`indicator-calculation-result-dto.ts`) | 供畫面決定結論顏色（positive/negative/neutral）| 支援 PRD §5 Open Decision #2（持有中性色），非 orphan——ARCH 定案 |
| `SignalDomain` (`domains/signal-domain.ts`) | buy/sell/hold → 中文 + 語氣 + 認不得正規化為 hold | 支援 BR-5（領域給中文）；目前單一 consumer（`indicator-calculation-domain`），ARCH 預期 `SIGNAL_READINGS` 亦借用但未實作——見 improve-codebase（已評估不做，3 個中文詞不值得 vo→domain 依賴）|
| `ChartIndicatorPanel.vue` 標籤去掉「是非，」→「（畫不成線）」 | 原本硬寫「是非」會把信號策略標成是非 | 修正一個既有小謊，落在 AC-06 範圍內；`KCandleChartPanelIndicators.spec.ts` "畫不成線" 仍通過 |

Out-of-scope 邊界檢查，**未違反**：回測結果呈現未動、信號無方向以外資訊、圖上不畫買賣標記、不做既有算式的自動遷移。

## Summary

- Conforms: 26/26 clauses ✅ (100%)
- Violations: none 🔴
- Mis-asserted: none 🟠
- Partial: none 🟡
- Gaps: none ❌
- Unclear: none ❔
- Orphans: 0（3 項支援型細節，均已說明）

### 第一次審計後修正（test-only + 一處無害 UI 字串）

1. `indicator-script-domain.spec.ts` 行數檢查納入 `signal`（closes AC-02d）。
2. `StrategyBacktestPane.spec.ts` 新增「規則講的是信號種類」斷言（closes AC-05a）。
3. `KCandleChartPanelIndicators.spec.ts` 「列得出來但挑不到」擴成 `it.each` 涵蓋 signal（closes AC-06 / BR-8）。
4. `ChartIndicatorPanel.vue` 去掉硬寫的「是非，」——信號策略不再被標成是非（AC-06 範圍內；程式碼路徑本來就對）。

沒有行為缺陷；程式碼路徑第一次審計時就已正確，補的是測試覆蓋。
