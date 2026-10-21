# Contract Traceability Matrix — concurrent-chart-indicator-calculation

Contract: PRD.md
Design map: ARCH.md
Implementation: `app/composables/use-chart-indicators.ts`、`app/utilities/concurrency-limiter.ts`、`app/domain/models/domains/chart-line-color-arrangement-domain.ts`、`ChartIndicatorService` / `ChartIndicatorApplication.arrangeChartLineColors`
Oracle: Acceptance Criteria（15 scenarios）+ Core Business Rules（5）+ NFR（1）

T = `tests/components/organisms/KCandleChartPanelConcurrentIndicators.spec.ts`、C = `app/composables/use-chart-indicators.ts`、L = `app/utilities/concurrency-limiter.ts`、A = `app/domain/models/domains/chart-line-color-arrangement-domain.ts`

## Clauses

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Jev test | Jev code | Status | Route |
|----|--------|------------------------|------|------|------------|------------|----------|----------|--------|-------|
| AC-1 | 三支同時送去算 | 三支在任一支回來前都已送出 | C:474、L:9 | T:183 | asserts-oracle | produces-oracle | asserts-oracle 0.68 | produces-oracle 0.69 | ✅ conforms | recheck |
| AC-2 | 第四支起排隊 | 先送三支；任一支算好後才送第四支 | C:517、L:9-30 | T:189 | asserts-oracle | produces-oracle | asserts-oracle 0.96 | diverges 0.29 | 🔴 violation | escalate (violation) |
| AC-3 | 只掛一支時與現在一樣 | 只送那一支一次 | C:474 | T:225 | asserts-oracle | produces-oracle | shallow 0.28 | produces-oracle 0.67 | 🟠 mis-asserted | escalate (disagree) |
| AC-4 | 排隊中的也顯示正在算 | 四支都顯示「正在算」 | C:512 | T:231 | asserts-oracle | produces-oracle | asserts-oracle 0.92 | produces-oracle 0.80 | ✅ conforms | recheck |
| AC-5 | 單獨加一支也受上限管 | 新加的那支等前面任一支算好才送出 | C:400-412→C:517 | T:237 | asserts-oracle | produces-oracle | asserts-oracle 0.87 | diverges 0.37 | 🔴 violation | escalate (violation) |
| AC-6 | 先算好的先畫上 | 第二支的線立刻畫上，另兩支仍「正在算」 | C:545-558 | T:253 | asserts-oracle | produces-oracle | asserts-oracle 0.99 | produces-oracle 0.36 | ✅ conforms | escalate (low confidence) |
| AC-7 | 一支失敗不影響其他支 | 第一支旁有失敗說明且無線；另兩支畫上 | C:559-569 | T:263 | asserts-oracle | produces-oracle | asserts-oracle 0.99 | produces-oracle 0.87 | ✅ conforms | accept |
| AC-8 | 換標的後舊標的晚回來 | 圖上是以太幣的線 | C:545 | T:278 | asserts-oracle | produces-oracle | asserts-oracle 0.88 | produces-oracle 0.65 | ✅ conforms | recheck |
| AC-9 | 被取代的排隊那一次不送出 | 第四支舊的那一次不送，只為新那一段送一次 | C:519 | T:292 | asserts-oracle | produces-oracle | asserts-oracle 0.61 | produces-oracle 0.79 | ✅ conforms | recheck |
| AC-10 | 移除之後才回來的不畫回去 | 圖上沒有它的線 | C:545（序號由 `removeAppliedIndicator` 推進） | T:319 | asserts-oracle | produces-oracle | asserts-oracle 0.97 | produces-oracle 0.83 | ✅ conforms | recheck |
| AC-11 | 後面那支先算好，顏色仍照清單順序 | 均線第一色、布林不是第一色 | C:552-558、A:18-38 | T:333 | asserts-oracle | produces-oracle | asserts-oracle 0.91 | produces-oracle 0.61 | ✅ conforms | recheck |
| AC-12 | 挑過的顏色照舊 | 均線用挑過的顏色 | A:28-31 | T:345 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.76 | ✅ conforms | recheck |
| AC-13 | 同一支擺兩筆，第二筆先算好 | 第一筆用挑過的、第二筆另一個沒用掉的 | A:24-35 | T:361 | asserts-oracle | produces-oracle | asserts-oracle 0.99 | produces-oracle 0.73 | ✅ conforms | recheck |
| AC-14 | 一根走完時同時重算且不亮進度條 | 三支同時重算；頂端進度條不亮 | C:465-477（`recalculateChartIndicator` → proxy `background: true`） | T:377 | asserts-oracle | produces-oracle | shallow 0.41 | produces-oracle 0.87 | 🟠 mis-asserted | escalate (disagree) |
| AC-15 | 使用者的操作照舊亮進度條 | 換標的時頂端進度條會亮 | C:526-528（`calculateChartIndicator` → proxy `background: false`） | T:391 | asserts-oracle | produces-oracle | shallow 0.28 | produces-oracle 0.56 | 🟠 mis-asserted | escalate (disagree) |
| BR-1 | 上限三支，只有一處決定 | 同時在算的最多三支 | C:18、C:109 | T:189 | asserts-oracle | produces-oracle | not run | not run | ✅ conforms | — |
| BR-2 | 任何讓一支去算的事件都經過同一個上限 | 重算、還原、加一支、改值都排隊 | C:517（`calculateOne` 是唯一送出點） | T:189、T:209、T:237 | asserts-oracle | produces-oracle | not run | not run | ✅ conforms | — |
| BR-3 | 只採用最新要求；排隊中被取代的不送出 | 舊結果丟棄、被取代的不送 | C:519、C:545 | T:278、T:292 | asserts-oracle | produces-oracle | not run | not run | ✅ conforms | — |
| BR-4 | 顏色依清單順序 | 「被用掉」與「已在圖上」只看清單前面的 | A:18-38 | `tests/domain/models/domains/chart-line-color-arrangement-domain.spec.ts` | asserts-oracle | produces-oracle | not run | not run | ✅ conforms | — |
| BR-5 | 「正在算」涵蓋排隊與送出中，舊的那一次結束不讓新的停止顯示 | 舊的回來後仍顯示「正在算」 | C:572-574 | T:308 | asserts-oracle | produces-oracle | not run | not run | ✅ conforms | — |
| NFR-1 | 一次重算等待約 ⌈N/3⌉ 支計算時間 | 三支一組並行 | L:9-30 | T:189 | asserts-oracle | produces-oracle | not run | not run | ✅ conforms | — |

### Notes on escalated clauses

- **AC-2 / AC-5（Jev: diverges 0.29 / 0.37，接近擲硬幣、`produces-oracle` 0.40）**：重讀路徑——`calculateOne` 先同步取序號並標正在算，再 `calculationLimiter.run`；`ConcurrencyLimiter` 在 `runningCount < limit` 時直接執行，否則排入 `waitingStarts`，任一工作 `finally` 時把名額直接交給下一個。單獨加一支走 `addToChart → calculateOne`，同一個 limiter。佐證：對應測試為綠；突變「上限改 99」、「不交棒」、「`<=` 取代 `<`」皆讓 T:189 / T:237 轉紅。影子判定維持 produces-oracle。
- **AC-3（Jev: shallow 0.28）**：T:225 斷言送出的恰為 `[7]`（一次），即 oracle 本身。
- **AC-14 / AC-15（Jev: shallow）**：元件測試以 proxy mock 觀察「走哪一條」——背景那一條（`recalculateIndicator`）不計入等待進度條、前景那一條（`calculateIndicator`）計入，這個對應由 `tests/infrastructure/proxy/indicator-calculation-proxy.spec.ts` 的背景旗標測試釘住，與既有 `KCandleChartPanelLiveEdge.spec.ts` 同一個慣例。進度條本身不在元件測試中掛載。
- **AC-6（low confidence）**：T:253 斷言圖上只有「布林」且兩列仍「計算中」，即 oracle。

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| C:519 `unmounted` 檢查 | 畫面收掉後排隊中的那一支不再送出（T:215） | undocumented — 對應 PRD Edge Cases「畫面收掉：排隊的那幾支不再送出」，非 Gherkin 但有明文 |

## Summary

- Conforms: 15/21 clauses ✅（71%）
- Violations: AC-2、AC-5（Jev 低信心 diverges；影子判定與突變佐證為 conforms）
- Mis-asserted: AC-3、AC-14、AC-15（Jev 低信心 shallow）
- Partial: —
- Gaps: —
- Unclear: —
- Orphans: 1（有 PRD 邊界情境明文）
- Jev: ran on 15 AC clauses（BR/NFR 未跑）
- Needs James: AC-2、AC-5（violation, Jev 0.29/0.37）、AC-3、AC-14、AC-15（disagree）、AC-6（low confidence）
