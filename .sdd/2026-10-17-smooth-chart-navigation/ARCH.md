# 圖表拖動與縮放跟手 — Architecture Design

**Status:** Confirmed
**Source PRD:** `.sdd/2026-10-17-smooth-chart-navigation/PRD.md`
**Tech context:** Nuxt · Vue 3 · Clean/Onion · lightweight-charts 5 · Vitest

---

## 1. Design Goal & Guiding Principle

- **In one sentence:** 取回計畫從「要不要整批重取」改成四種結論（不取／整批換／往左接／往右接），接上來的一段由領域併進手上這批；圖表元件依「這一批跟上一批是什麼關係」決定整批重畫、只更新最後一根，或接上之後把畫面平移回原處。
- **Guiding principle:** 「該不該取、取哪一段、怎麼併」全在 domain（`KCandleChartViewportDomain`、新的 `KCandleChartMergeDomain`）；「怎麼畫才不跳」全在 `KCandleChart.vue`。面板只多一個判斷：這一次是使用者拖的（不擺位置）還是要求跳過去的（擺位置）。

---

## 2. Change Scope

| Area | Action | What / Why |
| :--- | :--- | :--- |
| `KCandleChartLoadPlanVo` | **Modify** | `needsReload: boolean` 換成 `kind: 'none' \| 'replace' \| 'extendEarlier' \| 'extendLater'`；保留 `needsReload` getter（`kind !== 'none'`） |
| `KCandleChartViewportDomain` | **Modify** | 依 PRD 四條規則排出計畫；拿掉兩成半與五百天上限；一次至多九百根 |
| `KCandleChartMergeDomain` | **Add** | 手上這批＋接上來的一段 → 一批（依起始時間去重排序、涵蓋範圍合併、合約價取較晚那一批、往左接到零根時記 `reachedEarliest`） |
| `KCandleChartDto` | **Modify** | 多 `reachedEarliest`（預設 false） |
| `LiveKCandleChartDomain` | **Modify** | 併即時更新時帶著 `reachedEarliest` |
| `KCandleChartService.loadChartFrom` | **Modify** | `replace` 取來就是新的一批；`extend*` 取來交給 `KCandleChartMergeDomain` |
| `KCandleChartService` 常數 | **Modify** | 粗細六種、預設一小時、沒有「自動」；快捷區間帶粗細；預設快捷區間改為「一個月」（對應一小時，與「一進來一小時」一致） |
| `KCandleChartRangePresetDto` | **Modify** | 多 `aggregationIntervalChoice`；`toViewportDto(symbol, loadedChart)` 用自己的粗細 |
| `KCandleChartPanel` / `KCandleContractChartPanel` | **Modify** | `showViewport(dto, repositions)`：拖動縮放來的不擺位置；按快捷區間時一併換粗細；拿掉「粗細一變就 reload」的 watch，改在換粗細那一處明確重取 |
| `KCandleChart.vue` | **Modify** | `drawKCandles` 依關係分四種畫法；`applyDrawnRange` 只在換一批（換檔、換粗細、第一次）與 `drawnRange` 改變時擺 |
| `AggregationIntervalChoiceDto` 的「自動」 | **Remove** | 不再有沒有刻度的選擇 |
| 指標、繪圖、跟盤通道 | **Not touched** | 規則照舊 |

---

## 3. New / Modified Units

| Name | Kind | Responsibility | Satisfies |
| :--- | :--- | :--- | :--- |
| `KCandleChartViewportDomain.toLoadPlan` | Domain Model | `replace`：沒有手上這批、換標的、換粗細、涵蓋為零、看的那一段整個在手上這批之外；取「看的那一段兩側各多半段」，超過九百根時保留較晚那一端。`extendEarlier`：還沒到底、且看的最早那一刻比涵蓋開始晚不到半個畫面寬；取 `[涵蓋開始 − 九百根, 涵蓋開始]`。`extendLater`：涵蓋結束早於現在、且看的最晚那一刻離涵蓋結束不到半個畫面寬；取 `[涵蓋結束, min(涵蓋結束 + 九百根, 現在)]`。其餘 `none` | US-03 |
| `KCandleChartMergeDomain` | Domain Model | 併兩批 | US-03、US-04 第三例 |
| `KCandleChart.drawKCandles` | Component | 換一批→`setData`＋擺位置；往左接上 k 根→`setData`＋可見序位平移 k；同一批只多（或變了）最後一根→`series.update`；其他→`setData` 不擺位置 | US-04、US-05 |

---

## 4. Extensibility & Handoff Notes

- **Most likely next requirement:** 記住上次挑的粗細；或新增後端的新粗細。
- **Where it lands:** `CHOOSABLE_AGGREGATION_INTERVAL_VALUES` 與 `defaultAggregationIntervalChoice()`（已是單一入口）。
- **Do not hardcode:** 九百根、半個畫面寬——都是 `KCandleChartViewportDomain` 的具名常數。
- **Known debt:** 手上這批只增不減；一直往左拖到很久以前會累積很多根。圖表本身撐得住數萬根，真的成為問題時再加「離畫面太遠的那一頭丟掉」。

---

## 5. Traceability

| PRD Scenario | Fulfilled by |
| :--- | :--- |
| US-01 全部 | 粗細常數、`KCandleChartToolbar`（照清單排）、`KCandleChartViewportDomain`（縮放不換粗細） |
| US-02 全部 | `KCandleChartRangePresetDto.aggregationIntervalChoice`、面板 `selectPreset` |
| US-03 全部 | `KCandleChartViewportDomain.toLoadPlan`、`KCandleChartMergeDomain`、面板 `repositions=false` |
| US-04 全部 | `KCandleChart.drawKCandles`（update／平移） |
| US-05 | 面板 `repositions=true` 的那幾條路、`KCandleChart.applyDrawnRange` |
