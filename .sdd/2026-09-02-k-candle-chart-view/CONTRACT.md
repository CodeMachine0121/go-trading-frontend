# Contract Traceability Matrix — K 線圖表

Contract: `PRD.md`
Design map: `ARCH.md`
Implementation: `app/domain/models/{vo,entities,domains,dto}`、`app/domain/service/k-candle-chart-service.ts`、`app/application/k-candle-chart-application.ts`、`app/infrastructure/proxy/k-candle-proxy.ts`、`app/components/{molecules,organisms}`、`app/pages/k-candles/chart.vue`
Oracle: Acceptance Criteria（27 個情境 + 7 條業務規則 + 5 條非功能需求 = 39 clauses）

## Clauses

`Spec-expected` 欄是只讀規格文字得出的業務可觀察結果；`Impl` / `Test` 欄是把它橋接到程式碼之後查到的位置。

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-1 | 進入畫面就看到最近一天的行情 | 畫出最近一天的 K 線，標示「五分鐘」 | `KCandleChartPanel.vue:125` + `k-candle-chart-range-preset-dto.ts:19` | `KCandleChartPanel.spec.ts:62` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-2 | 一根上漲的 K 線 | 那一根以上漲的顏色呈現 | `k-candle-series-domain.ts:29` + `KCandleChart.vue:71` | `KCandleChart.spec.ts:101`、`k-candle-series-domain.spec.ts:34` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-3 | 一根下跌的 K 線 | 那一根以下跌的顏色呈現 | 同 AC-2 | `KCandleChart.spec.ts:101` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-4 | 一根持平的 K 線 | 那一根以持平的顏色呈現 | 同 AC-2 | `KCandleChart.spec.ts:101` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-5 | 換一個交易標的 | 圖改為畫出 ETHUSDT 同一段時間的行情 | `KCandleChartPanel.vue:119` + `k-candle-chart-viewport-domain.ts:78` | `KCandleChartPanel.spec.ts:125`、`k-candle-chart-application.spec.ts:121` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-6 | 看一天用五分鐘一根 | 每根五分鐘，標示「五分鐘」 | `k-candle-chart-viewport-domain.ts:50` | `k-candle-chart-viewport-domain.spec.ts:56`、`KCandleChartPanel.spec.ts:62` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-7 | 看兩天改用十五分鐘 | 每根十五分鐘 | `k-candle-chart-viewport-domain.ts:50` | `k-candle-chart-viewport-domain.spec.ts:57` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-8 | 看五天改用一小時 | 每根一小時 | `k-candle-chart-viewport-domain.ts:50` | `k-candle-chart-viewport-domain.spec.ts:58` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-9 | 看一年用一天一根 | 每根一天 | `k-candle-chart-viewport-domain.ts:50` | `k-candle-chart-viewport-domain.spec.ts:59` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-10 | 恰好落在看得清楚的上限（四百天） | 每根一天，畫面上恰好四百根，區間不被收回 | `k-candle-chart-viewport-domain.ts:60` | `k-candle-chart-viewport-domain.spec.ts`（表格逐列斷言 `visibleCandleCountOf`，並斷言該看的那一段未被收回） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-11 | 再拉遠就不讓它更遠（五百天） | 收回四百天，結束的那一端不變、開始的那一端往後挪；每根仍一天 | `k-candle-chart-viewport-domain.ts:60`（收回）+ `k-candle-chart-service.ts`（把收回後的那一段交出去）+ `KCandleChartPanel.vue`（照它擺位置） | `k-candle-chart-viewport-domain.spec.ts`（斷言收回後的 visible 兩端與根數）、`k-candle-chart-application.spec.ts`、`KCandleChartPanel.spec.ts`（斷言真的交給圖的是收回後那一段） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12 | 拉到很近也沒有比五分鐘更細的 | 每根五分鐘，畫面上六根 | `k-candle-chart-viewport-domain.ts:50` | `k-candle-chart-viewport-domain.spec.ts`（同一列一併斷言 `visibleCandleCountOf` 為 6） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-13 | 畫面提供固定的幾個長度 | 列出一天、五天、一個月、三個月、六個月、一年 | `k-candle-chart-service.ts:11` | `k-candle-chart-application.spec.ts:154`、`KCandleChartPanel.spec.ts:75` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-14 | 選一個月 | 正在看的區間變成截至目前時間的最近一個月，每根涵蓋的時間隨之改變 | `k-candle-chart-range-preset-dto.ts:19` + `KCandleChart.vue`（`watch` 顯示區間 → 重新擺位置） | `k-candle-chart-application.spec.ts`、`KCandleChartPanel.spec.ts`（含「不必重新取時也要把該看的那一段交給圖」）、`KCandleChart.spec.ts`（換了要看的一段就移動位置） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-15 | 拖動後仍在手上這批資料的範圍內 | 不重新取，直接以手上的資料呈現 | `k-candle-chart-viewport-domain.ts:78` + `k-candle-chart-service.ts:41` | `k-candle-chart-viewport-domain.spec.ts:99`、`k-candle-chart-application.spec.ts:98`、`KCandleChartPanel.spec.ts:96` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-16 | 拖出手上這批資料的範圍 | 重新取 | `k-candle-chart-viewport-domain.ts:78` | `k-candle-chart-viewport-domain.spec.ts:108`（前後兩端各一列）、`KCandleChartPanel.spec.ts:111` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-17 | 每根涵蓋的時間改變 | 重新取 | `k-candle-chart-viewport-domain.ts:78` | `k-candle-chart-viewport-domain.spec.ts:108`（刻度那一列）、`k-candle-chart-application.spec.ts:110` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-18 | 換交易標的（重新取） | 重新取 | `k-candle-chart-viewport-domain.ts:78` | `k-candle-chart-viewport-domain.spec.ts:108`（交易標的那一列） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-19 | 取資料時兩側各多取半段 | 看 10:00–12:00 就取回 09:00–13:00 | `k-candle-chart-viewport-domain.ts:84` | `k-candle-chart-viewport-domain.spec.ts:86`、`k-candle-chart-application.spec.ts:62` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-19b | 先送出的那次晚回來時不蓋掉後送出的結果 | 畫面上仍是後送出的那一次的結果 | `KCandleChartPanel.vue:64`、`:69` | `KCandleChartPanel.spec.ts:294`、`:261` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-20 | 預設是蠟燭 | 每一根都畫得出開高低收 | `KCandleChartPanel.vue:24` + `KCandleChart.vue:67` | `KCandleChart.spec.ts:89` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-21 | 切換到曲線 | 同一批資料改以收盤價連成一條線 | `KCandleChart.vue:67` | `KCandleChart.spec.ts:128` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-22 | 切換畫法不重新取資料 | 不重新取，正在看的區間也不變 | `KCandleChartPanel.vue`（`drawing` 只往下傳，不進 `showViewport`） | `KCandleChartPanel.spec.ts:142` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-23 | 未指定交易標的 | 不取資料，欄位旁提示「請指定交易標的」 | `k-candle-chart-viewport-domain.ts:39` + `KCandleChartPanel.vue:77` | `KCandleChartPanel.spec.ts:154`、`k-candle-chart-application.spec.ts:133` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-24 | 這段區間內沒有任何 K 線 | 顯示「查無 K 線」，不畫出空白的圖，不呈現錯誤 | `KCandleChartPanel.vue:197` | `KCandleChartPanel.spec.ts:165` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-25 | 被系統拒絕 | 如實顯示「時間區間過大，請縮小區間或改用更長的彙總刻度」，不畫出任何 K 線 | `KCandleChartPanel.vue:147` | `KCandleChartPanel.spec.ts:181` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-26 | 連不上後端 | 顯示「連不上後端」與重試方式，不畫出任何 K 線 | `KCandleChartPanel.vue:173` | `KCandleChartPanel.spec.ts:202` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-27 | 取資料進行中 | 呈現載入中 | `KCandleChartPanel.vue:191` | `KCandleChartPanel.spec.ts:181` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-28 | 失敗後再成功 | 只顯示這次的結果，先前的錯誤訊息消失 | `KCandleChartPanel.vue:56-62` | `KCandleChartPanel.spec.ts:214` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-1 | 刻度挑選：最細的、且「區間 ÷ 刻度」不超過 400 | 見 AC-6…AC-12 的七個結果 | `k-candle-chart-viewport-domain.ts:50` | `k-candle-chart-viewport-domain.spec.ts:54`（七列） | asserts-oracle | produces-oracle | ✅ conforms |
| BR-2 | 拉遠上限：收到 400 天，保留較晚的那一端 | 收回後的取回區間與四百天那次完全相同 | `k-candle-chart-viewport-domain.ts:60` | `k-candle-chart-viewport-domain.spec.ts:76` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-3 | 兩側預取：各多取一半 | 見 AC-19 | `k-candle-chart-viewport-domain.ts:84` | `k-candle-chart-viewport-domain.spec.ts:86` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-4 | 重新取的四個條件，任一成立就取 | 沒有資料／換標的／換刻度／跑出範圍 → 取；否則不取 | `k-candle-chart-viewport-domain.ts:78` | `k-candle-chart-viewport-domain.spec.ts:95`、`:99`、`:108`、`:145` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-5 | 漲跌沿用既有規則 | 收盤高於開盤為上漲、低於為下跌、相等為持平 | `k-candle-series-domain.ts:29`（委由既有的 `KCandleDomain.trend`） | `k-candle-series-domain.spec.ts:34` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-6 | 快捷區間為 1／5／30／90／180／365 天，以目前時間為結束 | 六個標籤與其長度；結束時間為目前時間 | `k-candle-chart-service.ts:11` + `k-candle-chart-range-preset-dto.ts:19` | `k-candle-chart-application.spec.ts:154`、`:161` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-7 | 畫法兩種，切換不改變區間、不重新取 | 見 AC-20…AC-22 | `KCandleChart.vue:67`、`KCandleChartPanel.vue` | `KCandleChart.spec.ts:128`、`KCandleChartPanel.spec.ts:142` | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-1 | 小幅拖動不得觸發取資料 | 同 AC-15 | `k-candle-chart-service.ts:41` | `KCandleChartPanel.spec.ts:96` | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-2 | 連續的拉遠拉近只在停下來之後才取一次 | 手還在動時什麼都不送出；停手後只送出最後那一段；**圖自己移動位置不算一次拖曳** | `KCandleChart.vue`（等待時間 + 自發變動抑制 + 手勢解除） | `KCandleChart.spec.ts`（停手才送出／自己移動不送出／自己移動後真的拖曳仍送得出去／對齊回原位時不卡住） | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-3 | 一次取回不得超過單次查詢上限（400 × 2 = 800） | 取回區間切出的根數 ≤ 800 | `k-candle-chart-viewport-domain.ts:50` + `:84`（由 BR-1 與 BR-3 共同保證） | `k-candle-chart-viewport-domain.spec.ts:68`（四百天 → 取回八百天份、一天一根） | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-4 | 價格在領域內一律精確小數，只有畫到圖上那一刻才轉成繪圖用數值 | domain 內全程 `Decimal`；只有 `KCandleChart` 呼叫 `.toNumber()` | `KCandleChart.vue:67-79`（唯一的 `.toNumber()`） | `KCandleChart.spec.ts:89`（斷言送進繪圖函式庫的是數值） | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-5 | 一律世界標準時間，畫面明確標示 | 已取回區間以 UTC 呈現並標示「（UTC）」 | `KCandleChartPanel.vue:214`、`chart.vue` 副標題 | `KCandleChartPanel.spec.ts:174` | asserts-oracle | produces-oracle | ✅ conforms |

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| `KCandleChartPanel.vue:88`（沒認出來的失敗） | 規格沒有列這一種，但「不得留白」是全站既有規則 | 沿用既有畫面的做法，非新行為 |
| `KCandleChart.vue:157`（離開畫面時收掉圖） | 資源回收，不是業務行為 | 技術必需，非未記載的行為 |
| `SymbolField.vue` | 把交易標的輸入從兩個畫面收成一個元件 | 內部重構，行為與先前逐處撰寫相同 |

未發現實作到 Out of Scope 項目的程式碼：既有的 K 線瀏覽畫面（查詢表單、表格、新增／修改／刪除）
除了改用 `SymbolField` 之外一行未動；沒有圖上編輯、沒有指標疊圖、沒有十字準星、沒有推播、
沒有把區間或畫法記下來的程式碼，也沒有一天以外更粗的刻度。

## Summary

- Conforms: 39/39 clauses ✅（100%）
- Violations: 無
- Mis-asserted: 無
  （初次稽核時 **AC-27**（載入中）為 🟠——程式碼會呈現載入中，卻沒有任何測試直接斷言那個區塊出現過。
  已補上一個把請求擋在半路、斷言載入中出現、放行後斷言它收起來的測試。）
- Partial: 無
- Gaps: 無
- Unclear: 無
- Orphans: 3（皆為技術必需或既有的全站規則，非未記載的業務行為）
  （初次稽核時另有一個 orphan：「慢回來的那次不覆蓋新結果」原本只寫在 PRD 的 Edge Case 裡，
  沒有正式情境。已補成 AC-19b。）

### Code review 之後的修正

一位 reviewer 讀了繪圖函式庫的實際事件語意，指出本表的「39/39、100%」撐不住：
`KCandleChart` 與 `KCandleChartPanel` 之間那條接縫**兩邊的測試都沒有涵蓋**——
panel 測試把圖整個 stub 掉，而圖的測試裡替身的 `setVisibleRange` 什麼都不做、
永遠不會回頭呼叫註冊的 handler。真正的函式庫對**任何**區間變動都會通知，
包含 `setData` 與元件自己發出的 `setVisibleRange`，而且回報的區間會被對齊到真實資料上。

因此有兩個使用者一分鐘內就會撞到的缺陷躲在 100% 覆蓋率底下：

1. **不必重新取時，圖從來沒有被告知要移動**——`visibleStartTime` / `visibleEndTime`
   沒有被 watch，所以按下快捷區間若資料剛好夠用，畫面完全不動。
2. **圖自己移動位置會被當成使用者拖曳**——剛按下的快捷區間 220 ms 後自己失去反白；
   資料稀疏時「看一年」會被對齊成「看一天」，於是又推導出五分鐘刻度、再取一次。

另外 AC-11「收回四百天」只驗在取回窗上（那個值與四百天那次完全相同），
**規則在使用者看得到的地方從來沒有被驗過**。

修正：把該看的那一段（可能已被收回）一路交到畫面（`KCandleChartViewDto`）、
在圖上 watch 它、抑制圖自己造成的區間變動（真實手勢會解除抑制），
並讓測試替身照真的那樣回呼——上述每一條都各有一個會紅的 mutation 守著。

> 本表是**靜態一致性稽核**：它把測試斷言與程式碼路徑分別對照規格推導出的預期結果，
> 而不是以「跑起來是綠的」作為判準。作為佐證，本切片新增／變更的每一個檔案
> 在 `bun run test:coverage` 下的敘述、分支、函式、行覆蓋率均為 100%。
