# 使用者自己挑一根 K 線涵蓋多久 — Contract Verification

**Contract source:** `.sdd/2026-09-10-chart-candle-coarseness-picker/PRD.md`（Section 3 驗收情境為 oracle）
**Design map:** `ARCH.md`
**Glossary:** `.sdd/UL-MAP.md`
**Method:** 靜態一致性稽核——先只讀規格寫下每一條的預期結果，再**各自獨立**判斷
「測試有沒有斷言它」與「程式有沒有產出它」。不以整套測試綠燈為判準。

---

## Clauses

| ID | 驗收情境（verbatim 摘要） | Oracle（只從規格導出的預期結果） | 實作位置 | 測試位置 | 測試稽核 | 程式稽核 | Status |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| AC-01 | 選單列出五項，預設是自動 | 由細到粗出現 自動／一分鐘／五分鐘／十五分鐘／一小時，選著自動 | `k-candle-chart-service.ts` `AGGREGATION_INTERVAL_CHOICES`、`AUTOMATIC_AGGREGATION_INTERVAL_CHOICE` | `k-candle-chart-application.spec.ts`「列出五種可挑的粗細」「一進畫面由系統挑」；`KCandleChartPanelCoarseness.spec.ts`「選單上列的是領域說的那五項」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02 | 選著自動時取行情的內容與改動前一模一樣 | 送出的條件不含任何粗細 | `k-candle-proxy.ts` `findKCandleSeries` 的條件展開 | `k-candle-proxy.spec.ts`「不送彙總刻度」；`KCandleChartPanelCoarseness.spec.ts`「一進畫面選著自動」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03 | 挑了五分鐘就照五分鐘取 | 送出的條件說出五分鐘，圖換成五分鐘一根 | `aggregation-interval-choice-dto.ts` `declaredInterval` → `k-candle-proxy.ts` | `k-candle-proxy.spec.ts`「挑了一種粗細時把那一種說出去」；`KCandleChartPanelCoarseness.spec.ts`「挑一種粗細就重新取」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04 | 挑回自動就不再說粗細 | 送出的條件回到不含粗細 | 同 AC-02 | `KCandleChartPanelCoarseness.spec.ts`「挑回自動就不再說粗細」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05 | 同一段時間換粗細，看的那一段不變 | 顯示區間兩端與換之前完全相同 | `k-candle-chart-viewport-domain.ts`——選擇不參與收上限、不改兩端 | `k-candle-chart-viewport-domain.spec.ts`「換粗細不改變該看的那一段」；`k-candle-chart-application.spec.ts`；`KCandleChartPanelCoarseness.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06 | 系統照做時兩者一樣 | 標題列顯示一小時 | `k-candle-series-domain.ts` `toDto()` 的 `interval` 取自回覆 | `KCandleChartPanel.spec.ts`「照系統回報的標示每根涵蓋多久」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-07 | 系統沒照做時標題列說實話 | 挑一分鐘、系統回十五分鐘 → 標題列顯示十五分鐘 | 同 AC-06 | `KCandleChartPanelCoarseness.spec.ts`「標題列說的是系統實際用的那一種」；`k-candle-proxy.spec.ts`「畫面標的仍然是系統回報的」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-08 | 選著自動時標題列說系統挑了哪一種 | 系統回五分鐘 → 標題列顯示五分鐘 | 同 AC-06 | `KCandleChartPanel.spec.ts`；`k-candle-series-domain.spec.ts`「沒挑時記下的就是沒挑」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-09 | 系統回報一個畫面認不得的粗細 | 標題列退回一分鐘，圖照樣畫得出來 | `aggregation-interval-vo.ts` `aggregationIntervalOf()`（未改動） | `k-candle-proxy.spec.ts`「認不得的刻度退回最細的那一種」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-10 | 換了粗細一定重新取 | 手上這批涵蓋得再廣也重新取 | `k-candle-chart-viewport-domain.ts` `needsReload` 第六條 | `k-candle-chart-viewport-domain.spec.ts`「換一種就重新取」；application／panel 各一 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-11 | 挑同一個不重新取 | 不觸發任何請求 | 同 AC-10（比對 `choice.value`）；panel 端 `watch` 不醒 | `k-candle-chart-viewport-domain.spec.ts`「挑到同一個就不重新取」；`KCandleChartPanelCoarseness.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12 | 換了粗細，已套用的指標各重算一次 | 圖上每一支指標重算，線跟著換 | `use-chart-indicators.ts` `recalculateForRange` 的 `isUnchanged` 三項比對 | `KCandleChartPanelCoarseness.spec.ts`「換一種粗細時，圖上已套用的指標跟著重算」 | asserts-oracle | produces-oracle | ✅ conforms（**初次稽核為 🔴 violation，已修**，見下） |
| AC-13 | 小幅平移仍然不重新取 | 不觸發請求 | `k-candle-chart-viewport-domain.ts`（既有五條理由未動） | `KCandleChartPanel.spec.ts`「仍落在手上這批之內時不再去取」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-14 | 換交易標的不改變挑好的粗細 | 選單仍選著十五分鐘，新標的以十五分鐘取回 | `KCandleChartPanel.vue`——選擇住在獨立 ref，換標的只讀不寫 | `KCandleChartPanelCoarseness.spec.ts`「換交易標的不改變挑好的那一種」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-15 | 按快捷區間不改變挑好的粗細 | 同上 | `k-candle-chart-range-preset-dto.ts` `toViewportDto` 原樣帶過去 | `KCandleChartPanelCoarseness.spec.ts`「按快捷區間不改變挑好的那一種」；`k-candle-chart-application.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-16 | 在圖上拉遠不改變挑好的粗細 | 同上 | 同 AC-14 | `KCandleChartPanelCoarseness.spec.ts`「在圖上拉遠不改變挑好的那一種」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-17 | 換畫法不改變挑好的粗細，也不重新取 | 選單不變且請求次數不變 | 同 AC-14（換畫法本來就不進 `showViewport`） | `KCandleChartPanelCoarseness.spec.ts`「換一種畫法不改變挑好的那一種，也不重新取」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-18 | 台股看一天一分鐘一根照樣畫得出來 | 送得出去且畫面沒有預先擋下 | **刻意無程式碼**——畫面不做任何前置檢查（BR-6） | `k-candle-proxy.spec.ts`（條件確實送出）；`KCandleChartPanelCoarseness.spec.ts`（挑了就取） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-19 | 全天候市場看一年一分鐘一根被系統拒絕 | 呈現系統說的原因，含兩條出路 | `KCandleChartPanel.vue` 既有 `BackendRequestRejectedError` 分流 | `KCandleChartPanelCoarseness.spec.ts`「把系統說的原因原樣轉達」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-20 | 改用更粗的一種就畫得出來 | 重新取**他要求的那一段**、圖畫出、拒絕消失 | 選擇 `watch` → `reload()`（讀 `requestedStartTime/EndTime`）；`showViewport()` 進場清掉訊息 | `KCandleChartPanelCoarseness.spec.ts`「改用更粗的一種之後，那句拒絕就消失」＋「重試的是他要求的那一段」 | asserts-oracle | produces-oracle | ✅ conforms（**code review 判為 🟠 mis-asserted，已補強並修程式**，見下） |
| AC-21 | 縮短看的那一段也畫得出來 | 同上 | 同 AC-20 | `KCandleChartPanelCoarseness.spec.ts`「改看短一點的一段之後，那句拒絕也會消失」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-22 | 選著自動的人看不到那句話 | 拉出十年 → 收回五百天、保留較晚那一端、圖畫得出來 | `k-candle-chart-viewport-domain.ts` `MAXIMUM_VISIBLE_DAYS`（未動） | `k-candle-chart-application.spec.ts`「拉得比五百天還遠」；`k-candle-chart-viewport-domain.spec.ts`「挑了固定的一種也不改變上限」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-23 | 還沒指定交易標的時挑粗細不取行情 | 不送出任何請求 | `KCandleChartPanel.vue` `showViewport()` 開頭的空標的早退（未動） | `KCandleChartPanelCoarseness.spec.ts`「還沒指定交易標的時，挑一種粗細也不去取」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-24 | 那一段真的沒有行情時說查無 K 線 | 呈現「查無 K 線」而非錯誤 | 既有空集合呈現（未動） | `KCandleChartPanel.spec.ts`「沒有任何 K 線時說查無 K 線」 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-1 | 挑的與用的分開，刻意不互相同步 | 標題列永遠讀系統回報的；送出讀使用者挑的 | 型別上分家：`AggregationIntervalChoiceDto`（往外）vs `AggregationIntervalVo`（往內） | AC-07 + AC-08 的測試 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-2 | 「自動」是「不挑」，不是第七種粗細 | 選著它時送出內容與改動前完全相同 | `aggregation-interval-choice-dto.ts` `interval: null` | `aggregation-interval-choice-dto.spec.ts`「與任何一種固定的粗細都不是同一個選擇」等 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-3 | 換了粗細一定重新取；挑同一個不算換 | 見 AC-10 / AC-11 | 同 AC-10 | 同 AC-10 / AC-11 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-4 | 其餘重新取的規則不變 | 五條既有理由行為不變 | `k-candle-chart-viewport-domain.ts` 前五條未動 | `k-candle-chart-viewport-domain.spec.ts` 既有整組 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-5 | 挑好的那一種活得比一次取行情久 | 見 AC-14〜AC-17 | 同 AC-14 | 同 AC-14〜AC-17 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-6 | 畫面不預先擋 | 不存在任何前置的「會不會超過」檢查 | 全域無此程式碼 | AC-18 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-7 | 看最遠五百天那個上限照舊 | 見 AC-22 | 同 AC-22 | 同 AC-22 | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-1 | 換一次粗細只觸發一次取行情；挑同一個不觸發 | 請求次數各為 1 與 0 | 選擇 `watch` 只在值變時醒 | `KCandleChartPanelCoarseness.spec.ts`「挑一種粗細就重新取」（2 次＝進場 1＋這次 1）與「挑到同一個不重新取」 | asserts-oracle | produces-oracle | ✅ conforms |

### 稽核過程中找到並修掉的一條

**AC-12（換粗細時已套用的指標要重算）初次判為 🔴 violation。**

- **oracle：** 圖上每一支指標各重算一次，線跟著換。
- **當時的程式：** `use-chart-indicators.ts` 的 `recalculateForRange` 以
  「顯示區間相同 **且** 交易標的相同」判定為沒事發生。換粗細時**這兩者都沒變**，
  於是整批 K 線換掉了、線卻還是上一批算出來的——而它畫得出來、圖上看不出異狀。
- **為什麼以前沒被發現：** 這個切片之前，粗細只會隨顯示區間長度一起變，
  而長度變了本來就會重算，缺的那一項因此永遠被另一項蓋過去。
  通用語地圖第 156 列早就寫著「換彙總刻度時要重算」——是程式沒跟上文件，不是文件錯。
- **修法：** 判定多比一項「系統實際用的粗細」。比實際用的而不是使用者挑的，
  是因為算式吃的是那一批 K 線：兩次挑法不同而系統給了同一種粗細時，答案本來就一樣。

### Code review 之後補的兩條

**AC-20 的斷言不夠強（🟠 mis-asserted），且底下的程式真的錯。**

- 原本的測試只驗「拒絕消失」，而製造那次拒絕的正是換粗細本身——
  那一次「上一次成功的範圍」與「他要求的範圍」剛好相同，於是測試綠燈、bug 藏著。
- 真正的路徑是：看一天 → 挑一分鐘 → 按「一年」被拒絕 → 挑一小時救回來。
  重試時沿用的是**上一次成功**的一天，使用者拿回一天的圖，而「一年」還亮著。
- 修法：`KCandleChartPanel` 另記一對「使用者最後**要求**的那一段」，
  在送出之前就寫（成功與失敗都留得下來），重試一律讀它。

**補齊之後指標不重算（AC-12 的同一條規則、另一個觸發點）。**

- 補齊填的是涵蓋範圍**之內**的洞：交易標的、粗細、看的那一段全都沒變，
  只有那批 K 線多了幾根。原本靠比對這三個欄位判斷「有沒有換一批」，看不出來。
- 修法：改由呼叫端直接說出「這一次有沒有換一批」——那是取資料那一側本來就
  知道的事實。順帶把三個比對縮成一個，那份「還有哪些欄位會變」的清單也不必再維護。

---

## Orphans

| 行為 | 位置 | 判定 |
| :-- | :-- | :-- |
| 選單上的值認不得時不當成一次選擇（不 emit） | `KCandleChartToolbar.vue` `selectedAggregationIntervalValue` setter | 防禦性程式碼，非契約條款。它守的是「清單與選單對不起來」這個內部矛盾，硬送一個「自動」會讓那個 bug 看起來像使用者自己選的。已有測試釘住，保留 |
| 併進即時更新後保留原本的選擇 | `live-k-candle-chart-domain.ts` `toChartDto()` | 為 AC-10/AC-11 服務的必要條件（改寫它會讓每一則即時更新都誤判成換了粗細而重取），非獨立行為。已有測試釘住 |

**Out of Scope 檢查（無違規）：** 十分鐘一根、四小時／一天進選單、記住使用者挑的那一種、
畫面自行預檢上限、指標計算面板的刻度選單、「長度變化兩成半」那條規則——
六項在程式中皆無對應實作。

---

## Summary

- **Clauses:** 32（AC 24 · BR 7 · NFR 1）
- ✅ conforms **32** · 🔴 violations 0 · 🟠 mis-asserted 0 · 🟡 partial 0 · ❌ gaps 0 · ❔ unclear 0 · ⚠️ orphans 2（皆已判定為合理，非違規）
- **Conformance: 100%**

初次稽核為 27 conforms · 1 violation（AC-12）· 4 partial（AC-16／AC-17／AC-21／AC-23 有實作、無測試）。
違規已修（含一條會失敗的測試釘住它），四條 partial 已補上斷言 oracle 的測試。

**Ceiling:** 這是靜態一致性稽核——它比對測試斷言與程式路徑對上規格的預期結果，
不執行自行發明的情境。AC-18（台股看一天答得出來）在前端只驗得到
「送得出去且畫面沒有預先擋下」，「後端答不答得出來」屬於後端契約。
