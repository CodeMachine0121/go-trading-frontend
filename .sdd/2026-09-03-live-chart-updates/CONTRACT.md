# 圖表跟著眼前這一刻走 — Contract Verification Matrix

**Oracle:** `PRD.md` 第 3 節的 Gherkin 驗收條件（24 條）
**Oracle 紀錄:** 實作前寫於 scratchpad `oracle-live-chart.md`（獨立性關卡的證據）
**判定方式:** 靜態一致性稽核——測試對照 oracle、程式碼對照 oracle，兩邊**各自獨立**判定；
不以「測試跑綠」作為結論。

---

## 1. Clauses

| ID | 條款 | Oracle（實作前寫下） | 實作位置 | 測試 | 測試稽核 | 程式碼稽核 | 狀態 |
|---|---|---|---|---|---|---|---|
| AC-01.1 | 算的是顯示區間，不是手上那一整批 | 起訖是 09:00–12:00、根數是這一段裡的根數；**不是**已取回區間 | `use-chart-indicators.ts:238`（以 `range` 換算根數與結束時間） | `KCandleChartPanelIndicators:算的是使用者正在看的那一段，不是手上那一整批` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.2 | 拖到另一段就跟著重算 | 以新那一段重算，值跟著變 | `KCandleChartPanel.vue:112`（觸發改掛顯示區間） | `拖到另一段就重算，即使手上那批 K 線一根都沒換` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.3 | 拉遠也重算 | 以新的顯示區間與**新的根數**重算 | `chart-visible-range-vo.ts:52`（根數由區間長度除以刻度） | `拉遠時以新的區間與新的根數重算` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.4 | 還在動的時候不算 | 不發生任何計算；停下來之後**只算一次** | `use-chart-indicators.ts:196`（停手等待，期間重新計時） | `使用者還在動的時候一次都不算` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.5 | 一支都沒套用時不發生任何計算 | 不發生任何計算 | `use-chart-indicators.ts:154`（清單為空即無事可做） | `一支都沒套用時，拖動畫面不發生任何計算` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.6 | 顯示區間沒真的變就不重算 | 不重算 | `chart-visible-range-vo.ts:29`（`isSameAs`） | `顯示區間沒真的變就不重算`、`chart-visible-range-vo.spec.ts` 全組 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.1 | 成交價變了，最後那一根跟著變 | 收盤價 = 118 | `live-k-candle-chart-domain.ts:118`（收盤換成這一根的） | `成交價變了，最後那一根的收盤價跟著變` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.2 | 更高的成交價推高最高價 | 最高價 = 125 | `live-k-candle-chart-domain.ts:116`（取較高） | `更高的成交價推高那一根的最高價` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.3 | 較低的成交價不會拉低最高價 | 最高價**仍是 120**；收盤價 = 115 | 同上 | `較低的成交價不會拉低最高價` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.4 | 一根走完，圖上多出一根新的 | 多一根 10:00；09:55 那根不再變動 | `live-k-candle-chart-domain.ts:70`（歸屬的那一格不存在即新增） | `一根走完、下一根開始時，圖上多出一根新的` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.5 | 同一根反覆更新時成交量不重複累加 | 成交量 = **12**，不是 36 | `live-k-candle-chart-domain.ts:44`（**對照表取代，不累加**） | `同一根被反覆更新時，成交量不會被重複累加` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.6 | 換交易標的就換跟的對象 | 跟的對象變 ETHUSDT；不再收到 BTCUSDT 的變動 | `KCandleChartPanel.vue:160`（先停舊的再跟新的） | `換交易標的就換跟的對象` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.7 | 離開畫面就不再跟 | 停止函式被呼叫 | `KCandleChartPanel.vue:190`（`onBeforeUnmount`） | `離開畫面就不再跟`、`離開畫面時，還在等停手的那次重算也一起收掉` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03.1 | 併進所屬的那一根，不自成一根 | 併進 10:00；不會多出 10:25 | `live-k-candle-chart-domain.ts:99`（依彙總刻度歸格） | `併進所屬的那一小時，不自成一根` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03.2 | 併進去時最高價取兩者較高 | 10:00 那根最高 = 125 | 同 AC-02.2 | `併進去時最高價取兩者較高` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03.3 | 跨過邊界才多出新的一根 | 多出 11:00 這一根 | `live-k-candle-chart-domain.ts:105`（新格對齊到格子起點） | `跨過那一小時的邊界才多出新的一根，且對齊到整點` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03.4 | 五分鐘刻度時不需要併 | 它直接就是最後那一根 | 同上（歸屬即自己） | `畫面看五分鐘一根時，它直接就是最後那一根` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04.1 | 進行中那一根的變動不觸發重算 | **不重算任何指標** | `KCandleChartPanel.vue:173`（僅 `hasClosedAKCandle` 才重算） | `還在走的那一根動了，指標不重算` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04.2 | 一根走完時每一支都重算 | 那一支重算一次 | 同上 | `一根走完就重算每一支` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04.3 | 一支都沒套用時，一根走完也不計算 | 不發生任何計算 | `use-chart-indicators.ts:154` | `一支都沒套用時，一根走完也不發生任何計算` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05.1 | 停止時明白說出來 | 畫面明說即時更新已停止 | `KCandleChartPanel.vue:167` + 面板的警示區塊 | `停止時明白說出來` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05.2 | 停止時圖照樣顯示手上有的 | 圖照常；不清空、不跳錯誤畫面 | `KCandleChartPanel.vue:168`（`stalled` 時直接返回，不動 `chart`） | `停止時圖照樣顯示手上有的，不清空也不跳錯誤畫面` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05.3 | 恢復之後說明自己消失 | 說明消失；最後那一根繼續跟著動 | `KCandleChartPanel.vue:167`（每一則都重設該旗標） | `恢復之後那個說明自己消失` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05.4 | 即時完全不能用時圖表其餘照常 | 查詢／換標的／換刻度／套用與移除指標全部可用 | 即時是獨立的一條路徑；失敗只影響那一行說明 | `KCandleChartPanelIndicators` 全 38 條**都在一條什麼都不送的通道下執行**（測試替身的預設），等同「即時不能用」；全數綠燈 | asserts-oracle | produces-oracle | ✅ conforms |

---

## 2. Business Rules / NFR

| ID | 條款 | 覆蓋情形 |
|---|---|---|
| BR-1 | 指標的計算範圍是顯示區間 | AC-01.1 ✅ |
| BR-2 | 重算的觸發是顯示區間變了；取資料的規則完全沿用 | AC-01.2；`KCandleChartViewportDomain` 一行未改 ✅ |
| BR-3 | 停下來 300 毫秒才算一次 | AC-01.4 ✅ |
| BR-4 | 顯示區間沒真的變就不算 | AC-01.6 ✅ |
| BR-5 | 最高取較高、最低取較低、收盤換最新、成交量加新增的 | AC-02.2／02.3／03.2 ✅ |
| BR-6 | 同一根反覆更新不重複累加 | AC-02.5 ✅（由結構保證） |
| BR-7 | 五分鐘的變動併進所屬的那一根 | AC-03.\* ✅ |
| BR-8 | 進行中 K 線只給人看，變動不觸發重算 | AC-04.1 ✅ |
| BR-9 | 一根走完要重算 | AC-04.2 ✅ |
| BR-10 | 即時停掉時圖不清空但必須明說 | AC-05.1／05.2 ✅ |
| BR-11 | 較新的那一次勝出 | `慢回來的舊標的不會蓋掉比它新的那一次`、`慢回來的失敗也不會蓋掉比它新的那一次`、`過期的那一次跟盤照樣改畫面`（突變被擋）✅ |
| NFR-1 | 拖動期間不發計算，停手 300 毫秒後才發一次 | AC-01.4 ✅ |
| NFR-2 | 即時更新每則只改最後那一根，不重算指標 | AC-04.1 ✅ |

---

## 3. Orphans

| 行為 | 對應條款 | 判定 |
|---|---|---|
| 認不得的狀態一律當成「即時已停止」 | 無對應條款 | ⚠️ 未載明。認不得就是不知道它是不是活的，而「假裝還活著」是這裡唯一不能犯的錯——最保守的解讀 |
| 讀不懂的一則就當作沒發生 | 無對應條款 | ⚠️ 未載明。把半根 K 線往內傳比少一則更糟 |
| 不屬於這張圖的交易標的不採用 | 無對應條款 | ⚠️ 未載明，但它是 AC-02.6「不再收到另一檔的變動」的同一件事在領域這一側的保險 |
| **取行情失敗時停止跟盤** | 無對應條款 | ⚠️ 未載明——**這是稽核前的深模組檢視抓到的真 bug**（見 ARCH 的實作後檢視）。留著跟盤，上一檔的下一則更新會把圖復活在一個顯示著錯誤的畫面上 |

四項都**不落在 Out of Scope 清單內**，不構成範圍蔓延。建議日後補進 PRD。

---

## 4. Summary

```
✅ 24 conforms · 🔴 0 violations · 🟠 0 mis-asserted · 🟡 0 partial · ❌ 0 gaps · ❔ 0 unclear · ⚠️ 4 orphans
Conformance: 100%（24/24）
```

**稽核過程中補上的兩處**（程式碼本來就對，是測試沒真的釘住 oracle）：

| # | 問題 | 處置 |
|---|---|---|
| 1 | AC-01.3「拉遠也重算」沒有專屬測試——沒有任何測試驗證**根數**會跟著區間長度變 | 補上一條驗證同一刻度下、兩段不同長度的區間各自換算出 12 根與 36 根 |
| 2 | AC-01.5 只驗了「換標的時不算」，沒驗「拖動時不算」——兩者是不同的觸發 | 補上一條在沒有任何策略時拖動畫面的案例 |

**覆蓋率（實測，`@vitest/coverage-v8`）：** 本切片新增／動過的檔案陳述式 99.6%（249/250）、
分支 98.3%（118/120）。未覆蓋的是兩處無法構造的型別收窄防衛，逐一檢視過。

**突變測試：** 19 個突變逐一確認會被對應測試擋下，無存活者。

**Ceiling:** 這是靜態一致性稽核——逐條比對測試斷言與程式碼路徑對規格的預期結果，
不執行自己發明的情境。AC-05.4 講的是「既有行為不得因本切片而改變」，
判定依據是「即時那條路徑完全獨立」加上「既有 38 條指標測試在一條什麼都不送的通道下全數綠燈」。
