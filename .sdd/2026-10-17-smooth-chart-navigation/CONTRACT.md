# Contract Verification — 圖表拖動與縮放跟手

**Oracle:** `PRD.md` Acceptance Criteria（Section 3）＋ Core Business Rules / Edge Cases（Section 4）＋ NFR（Section 6）
**Method:** 靜態對照——每一條先只從 PRD 推出預期結果，再分別判斷測試有沒有斷言它、程式有沒有產生它。不執行自創的情境。
**Date:** 2026-10-17

## Clauses

| ID | Clause | Oracle（只取自 PRD） | Implementation | Test | Test audit | Code audit | Status |
|---|---|---|---|---|---|---|---|
| AC-01 | 只有六種粗細、預設一小時 | 六顆：一分鐘…一天；一小時亮著；沒有自動 | `k-candle-chart-service.ts` `AGGREGATION_INTERVAL_CHOICES`、`DEFAULT_AGGREGATION_INTERVAL_CHOICE` | `KCandleChartPanelCoarseness.spec.ts`「選單上列的是領域說的那六種」「一進畫面選著一小時」 | asserts-oracle | produces-oracle | ✅ |
| AC-02 | 換一種粗細 | 一小時→按四小時：每根四小時、四小時亮著 | `KCandleChartPanel.vue` `selectAggregationIntervalChoice` | 同上「按四小時：圖換成每根四小時…」 | asserts-oracle | produces-oracle | ✅ |
| AC-03 | 縮放不換粗細 | 每根五分鐘、拉遠到好幾天：仍是五分鐘 | 面板 `showRange` 只讀 `aggregationIntervalChoice`；`KCandleChartViewportDomain` 不改選擇 | Coarseness「每根五分鐘時拉遠到看得到好幾天」 | asserts-oracle（原本只測一小時拉近，屬 shallow，已補） | produces-oracle | ✅ |
| AC-04 | 按一天 | 看最近一天、每根五分鐘、五分鐘亮著 | `K_CANDLE_CHART_RANGE_PRESETS`、面板 `selectPreset` | `KCandleChartPanel.spec.ts`「按「一天」一併換成每根五分鐘」；合約同名 | asserts-oracle | produces-oracle | ✅ |
| AC-05 | 按一年 | 看最近一年、每根一天 | 同上 | Coarseness「按快捷區間換到那個長度配的粗細」（已補一年的起點斷言）；application `it.each` 對照表 | asserts-oracle | produces-oracle | ✅ |
| AC-06 | 按過快捷區間後自己換粗細 | 每根十五分鐘、看的那一段不變、沒有快捷區間亮著 | `selectAggregationIntervalChoice` 清 `activePreset`、`showLatest()` 保留長度 | Coarseness「按四小時…沒有任何一個快捷區間亮著」「換一種粗細時看的那一段不變」 | asserts-oracle | produces-oracle | ✅ |
| AC-07 | 手上的夠畫就不去要 | 拉遠、拉近、左右拖：不跟後端要、粗細不變 | `KCandleChartViewportDomain.toLoadPlan` → `none` | viewport spec「手上的夠畫就不去要」`it.each`；application 同名 `it.each` | asserts-oracle | produces-oracle | ✅ |
| AC-08 | 往左接上更早的一段 | 離最早那一根不到半個畫面寬：左邊接上；看的那幾根在原位 | `toLoadPlan` → `extendEarlier`；`KCandleChartMergeDomain`；`KCandleChart.drawChartChange` 平移 | application「拖到離最早那一根不到半個畫面寬時…」；chart spec「左邊接上了兩根…平移兩根」 | asserts-oracle | produces-oracle | ✅ |
| AC-09 | 離最早那一根還遠時不去要 | 一個畫面寬以上：不去要 | `toLoadPlan` 門檻 | application「往左拖一點，離最早那一根還有一個畫面寬」 | asserts-oracle | produces-oracle | ✅ |
| AC-10 | 那一頭已經沒有更早的資料 | 接連空了滿兩週：不再去要 | `KCandleChartMergeDomain` 累積 `emptyEarlierSpanMilliseconds`、記 `reachedEarliest`；`toLoadPlan` 檢查 | merge spec「接連空了十三天又空一天」；application「…到底了，再往左拖不再去要」（以已到底的一批驗不再去要） | asserts-oracle | produces-oracle | ✅ |
| AC-10b | 空的一段只是剛好落在休市裡 | 空了不到兩週：再往左接上更早的一段 | 同上 | merge spec「左邊接上來的一天一根都沒有…還不算到底」「…還不到兩週」 | asserts-oracle | produces-oracle | ✅ |
| AC-11 | 往右接上更晚的一段 | 手上最新那一根早於現在、拖到不到半個畫面寬：右邊接上 | `toLoadPlan` → `extendLater` | application「看過一段過去、往右拖到快沒資料時…」；viewport spec | asserts-oracle | produces-oracle | ✅ |
| AC-12 | 放手之後畫面停在原地 | 沒有被加上右側留白或擺回去 | 面板 `showViewport(…, false)` 不寫 `drawnRange` | `KCandleChartPanel.spec.ts`「拖動放手之後畫面停在原地…」（同一個物件）；合約「在圖上拖到…畫面不被擺回去」 | asserts-oracle | produces-oracle | ✅ |
| AC-13 | 一次接上的一段不超過九百根 | 每根一分鐘：至多九百根 | `MAXIMUM_FETCHED_CANDLE_COUNT` | application「每根一分鐘時，往左接上的一段至多九百分鐘」；viewport spec 右邊同 | asserts-oracle | produces-oracle | ✅ |
| AC-14 | 還在走的那一根變了 | 只更新那一根、其他不重畫、位置不變 | `drawChartChange` → `series.update` | chart spec「還在走的那一根價格變了…」 | asserts-oracle | produces-oracle | ✅ |
| AC-15 | 最新那一根收完 | 右邊多一根、其他不重畫 | 同上 | chart spec「最新那一根收完、下一根開始…」 | asserts-oracle | produces-oracle | ✅ |
| AC-16 | 接上更早一段之後畫面不動 | 看的那幾根仍在原位 | `drawChartChange` 平移序位 | chart spec「左邊接上了兩根…」「…說不出正在看哪幾根時，只重畫、不平移」 | asserts-oracle | produces-oracle | ✅ |
| AC-17 | 換標的、換粗細、按快捷區間、跳到最新時擺回最新那一根 | 往回拖到過去後換一檔：擺回看得到最新那一根，右側留白 | `showLatest()`（換標的、換粗細、跳到最新）、`selectPreset` | 面板「往回拖到一段過去之後換一檔…」「按跳到最新…」；合約「往回拖…換合約…」；Coarseness「往回拖…換粗細…」 | asserts-oracle | produces-oracle（**原為 diverges，已修**） | ✅ |
| BR-01 | 粗細規則 | 六種、預設一小時、換粗細＝整批換並擺回最新 | 同 AC-01／AC-17 | 同上 | asserts-oracle | produces-oracle（擺回最新原為 diverges，已修） | ✅ |
| BR-02 | 一進畫面 | 一個月、每根一小時、兩顆都亮 | `DEFAULT_K_CANDLE_CHART_RANGE_PRESET` | 面板「列出快捷區間…」（一個月亮）＋ Coarseness「一進畫面選著一小時」 | asserts-oracle | produces-oracle | ✅ |
| BR-03 | 快捷區間的粗細 | 對照表九列 | `K_CANDLE_CHART_RANGE_PRESETS` | application `it.each`「按「%s」一併換成每根 %s」 | asserts-oracle | produces-oracle | ✅ |
| BR-04 | 整批取 | 五種情形整批換；兩側各多半段、至多九百根、保留較晚一端 | `toLoadPlan` replace 分支 | viewport spec「整批換一批」各例 | asserts-oracle | produces-oracle | ✅ |
| BR-05 | 接上一段 | 左右門檻、至多九百根、零根記為到底 | `toLoadPlan`、`KCandleChartMergeDomain` | viewport／merge／application spec | asserts-oracle | produces-oracle | ✅ |
| BR-06 | 擺位置的時機 | 只在一進畫面、換標的、換粗細、按快捷區間、跳到最新時擺；拖動縮放之後不擺 | 面板 `repositions`；`KCandleChart.applyDrawnRange` 只在換一張圖與 `drawnRange` 改變時 | 同 AC-12／AC-17；chart spec「換畫法／換時區只重畫，不把畫面擺回去」 | asserts-oracle | produces-oracle | ✅ |
| BR-07 | 即時更新 | 還在走的那一根更新那一根；收完接一根；不重畫其他 | `drawChartChange` | 同 AC-14／AC-15 | asserts-oracle | produces-oracle | ✅ |
| EC-01 | 接上一段時又拖到別處 | 只採用最後一次的結果 | 面板 `latestRequestNumber` | 面板「慢回來的那一次不覆蓋後送出的結果」「慢回來的那一次失敗時…」 | asserts-oracle | produces-oracle | ✅ |
| EC-02 | 接上失敗 | 照既有方式說明，手上這批照樣畫著 | 面板 catch：`repositions` 為否時不 `forgetTheChart()` | 面板「拖到快沒資料、接上一段卻失敗時…」；合約同名；反例「換一檔卻取不到時…」 | asserts-oracle | produces-oracle（**原為 diverges：一律清掉圖，已修**） | ✅ |
| NFR-01 | 效能 | 即時更新一則只更新一根；縮放拖動不送請求，除非到了門檻 | 同 AC-07／AC-14 | 同上 | asserts-oracle | produces-oracle | ✅ |

## Orphans

| Behavior | Site | Classification |
|---|---|---|
| 交易紀錄的價格走勢自己挑粗細（塞得進九百根的最細那一種） | `fitting-aggregation-interval-domain.ts` | 拿掉「自動」的連帶影響；PRD 沒有這一條，已記進 ARCH 與 UL-MAP。不屬於 Out of Scope 的任何一項 |
| 右邊「缺一整根以上才接」 | `toLoadPlan` extendLater 條件 | PRD「手上最新那一根早於現在」的落實細節（不到一根由即時更新補上）；已記進程式註解，未違反任何條款 |

## Summary

28 條：✅ 28 · 🔴 0 · 🟠 0 · 🟡 0 · ❌ 0 · ❔ 0 · ⚠️ 2 orphans（皆已說明）
Conformance：100%（修正後）

第一次對照時的發現與處置：
- 🔴 EC-02：拖動來的那一次失敗時把手上那張圖清掉了 → 改成只有要求擺位置的那幾種失敗才放掉。
- 🔴 AC-17／BR-01：換標的、換粗細時看的仍是拖過去的那一段 → 三者共用「長度不變、結束在現在」。
- 🟠 AC-03：測試只驗一小時拉近 → 補五分鐘拉遠到好幾天。
- 🟠 AC-05：沒有斷言「最近一年」的起點 → 補上。

> 這是靜態對照：判斷的依據是測試斷言與程式路徑對照 PRD 推出的預期，不是整套測試綠不綠。
