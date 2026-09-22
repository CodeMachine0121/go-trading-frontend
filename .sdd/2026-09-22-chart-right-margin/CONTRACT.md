# 圖表右側留白 — Contract Verification Matrix

**Contract source:** `.sdd/2026-09-22-chart-right-margin/PRD.md`（Acceptance Criteria 為 oracle）
**Architecture map:** `.sdd/2026-09-22-chart-right-margin/ARCH.md`
**Verified:** 2026-09-23
**Ceiling:** 靜態一致性稽核——逐條先由規格導出應有的結果，再**各自獨立**判斷
「測試有沒有斷言它」與「程式碼有沒有產生它」。**不以整套測試是否全綠作為判準**，
也不自行新增探測用的測試。

---

## 1. Clauses

| ID | Clause（逐字） | Oracle（只由規格導出） | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AC-01 | 一進畫面就有留白 | 最新那一根整根看得見，且它與右緣之間有一段空白 | `drawn-k-candle-range-domain.ts:62-67` | `drawn-k-candle-range-domain.spec.ts:46`、`k-candle-chart-application.spec.ts:109` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02 | 顯示區間的右端正好落在最新那一根 | 留白出現（右端「到了最新那一根」算看得到） | `chart-visible-range-vo.ts:45-51`（判準，沿用既有）＋`drawn-k-candle-range-domain.ts:67` | `drawn-k-candle-range-domain.spec.ts:55` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03 | 留白的寬度隨看的那一段等比例 | 看一年與看一天的留白同為看得見那段寬度的一成 | `drawn-k-candle-range-domain.ts:17,64` | `drawn-k-candle-range-domain.spec.ts:63` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04 | 按下快捷區間之後也有留白 | 那一段的最新一根不貼右緣，右邊有留白 | `k-candle-chart-service.ts:141-143`（快捷區間走同一條載入路徑） | `KCandleChartPanel.spec.ts:171` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05 | 圖上一根都沒有 | 畫面說「查無 K 線」，且沒有留白可談 | `drawn-k-candle-range-domain.ts:42-44`、`KCandleChart.vue:265-270` | `KCandleChartPanel.spec.ts:284`、`KCandleChart.spec.ts:288`、`k-candle-chart-application.spec.ts:125` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06 | 最新那一根已經不在畫面上 | 右邊是接下來的那幾根 K 線，沒有空白 | `drawn-k-candle-range-domain.ts:62-65`（判準為否時加零） | `drawn-k-candle-range-domain.spec.ts:74` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-07 | 拖回來重新碰到最新那一根 | 留白回來了 | 同上 | `KCandleChartPanel.spec.ts:141`（拖離→`{0,1}`，拖回→`{0,2.2}`） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-08 | 連續往回拖十次 | 每一次都停在他拖到的位置；十次之後的長度仍是他拖到的那一段 | `drawn-k-candle-range-domain.ts:49-67`（答案只由這一次的顯示區間決定）＋`KCandleChart.vue:360-380`（回報的是函式庫夾好的那一段） | `drawn-k-candle-range-domain.spec.ts:83`、`KCandleChart.spec.ts:365` | asserts-oracle（**拆成兩半**：領域的冪等 + 元件的原樣回報；沒有一條測試模擬十次連拖） | produces-oracle | ✅ conforms |
| AC-09 | 拉遠到需要重新取資料 | 畫面仍是那五天、右側仍有留白、沒有跳回一天 | `k-candle-chart-service.ts:129-143`（以新取回那批算位置） | `k-candle-chart-application.spec.ts:167`（確有重取）＋`:109`（重取後帶著留白） | shallow（沒有一條測試在**同一次**裡驗「拉遠→重取→畫面是新的那一段」） | produces-oracle | 🟡 partial |
| AC-10 | 拉近到需要重新取資料 | 畫面仍是那兩小時，右側仍有留白 | 同上 | 同上 | shallow | produces-oracle | 🟡 partial |
| AC-11 | 小幅拉動、手上那批還夠用 | 畫面停在他拉到的那一段，看得到最新那一根時仍有留白 | `k-candle-chart-service.ts:138`（不重取時改用手上那批算） | `k-candle-chart-application.spec.ts:133`、`KCandleChartPanel.spec.ts:141` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12 | 拉得比系統一次答得出來的還遠 | 收回到答得出來的最長那一段（結束端不變），右側仍有留白 | `k-candle-chart-viewport-domain.ts:84-88`（既有收回上限）＋`k-candle-chart-service.ts:126`（以收回後的那一段算位置） | `k-candle-chart-application.spec.ts:202`、`KCandleChartPanel.spec.ts:195` | shallow（兩條都只驗收回，沒有一條驗「收回之後那一段仍有留白」） | produces-oracle | 🟡 partial |
| AC-13 | 放手之後的位置只由這一次的動作決定 | 第十次之後看得見的那一段，與一次就拉到同樣位置的結果相同 | `drawn-k-candle-range-domain.ts:49-67` | `drawn-k-candle-range-domain.spec.ts:83` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-14 | 新的一根長進留白裡 | 新的那一根畫在原本的留白裡，畫面位置不變 | `KCandleChartPanel.vue:349`（即時更新只換資料，**不碰** `drawnRange`）＋`KCandleChart.vue:190-193`（重畫後套回同一段） | `KCandleChartPanelLiveUpdates.spec.ts:98` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-15 | 連續進來好幾根之後再動一下圖 | 留白回到看得見那段寬度的一成 | `KCandleChartPanel.vue:258`（下一次載入重算） | `KCandleChartPanel.spec.ts:171`（**間接**：任何一次載入都重算留白） | shallow | produces-oracle | 🟡 partial |
| AC-16 | 看過去的行情時不受影響 | 畫面完全不動，也不會因此出現留白 | 同 AC-14（`drawnRange` 不變，而它當時的留白本來就是零） | `KCandleChartPanelLiveUpdates.spec.ts:98`（同一條：交給圖的那一段不因市場動過而改變，留白是多少都一樣） | asserts-oracle | produces-oracle | ✅ conforms |
| BR-1 | 畫出來的那一段 ＝ 顯示區間 ＋ 右側留白（一成） | 畫出來的那一段比使用者要求的那一段寬一成 | `drawn-k-candle-range-domain.ts:67` | `drawn-k-candle-range-domain.spec.ts:46,63` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-2 | 留白只在「看得到最新那一根」時存在（右端落在最新那一根起始時間之後（含）） | 看不到最新那一根時留白寬度為零 | `drawn-k-candle-range-domain.ts:62-65` | `drawn-k-candle-range-domain.spec.ts:55,74` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-3 | 留白不參與「要不要重新取」的判斷 | 顯示區間、已取回區間、兩成半門檻的答案在這一刀前後逐字相同 | `k-candle-chart-viewport-domain.ts`（**未改動**）；留白在取回計畫**之後**才算（`k-candle-chart-service.ts:129→143`） | `k-candle-chart-application.spec.ts:151,167`（既有的重取規則測試未改一字仍綠） | asserts-oracle | produces-oracle | ✅ conforms |
| BR-4 | 圖表交出去的永遠是顯示區間，不含留白 | 使用者拉出一段之後，回報的是他看得到 K 線的那一段 | `KCandleChart.vue:366-380`（原樣轉述函式庫回報的區間，不自行補回留白） | `KCandleChart.spec.ts:365` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-5 | 留白寬度只在重新對位時重算（新的一根進來時不重新擺位） | 即時更新不改變畫出來的那一段；下一次動圖表才回到一成 | `KCandleChartPanel.vue:349`（即時更新只寫 `chart`） | `KCandleChartPanelLiveUpdates.spec.ts:98` | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-1 | 不增加任何一次取資料 | 取行情的時機與次數與這一刀之前相同 | 留白全程不觸發載入（`k-candle-chart-service.ts:129`） | `KCandleChartPanel.spec.ts:141`（一次平移＋一次快捷區間，仍只取一次） | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-2 | 不增加重畫的次數 | 留白在既有的那一次對位裡一起完成 | `KCandleChart.vue:190-193`（`setData` → 指標 → 對位，仍是一趟） | `KCandleChart.spec.ts:352`（只換要畫的那一段時 `setData` 仍只被呼叫一次） | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-3 | 「等使用者停手才回報」那段等待不變 | 仍是同一段等待，行為不變 | `KCandleChart.vue:39`（`RANGE_SETTLE_MILLISECONDS = 220`，未改動） | `KCandleChart.spec.ts:306` | asserts-oracle | produces-oracle | ✅ conforms |

---

## 2. Orphans（對不到任何條款的行為）

| # | 行為 | 位置 | 判斷 |
| :--- | :--- | :--- | :--- |
| 1 | **兩端往內對齊到真正存在的那幾根**（起點取第一根不早於它的、終點取最後一根不晚於它的、整段落在資料某一側時退到最靠近的那一根） | `drawn-k-candle-range-domain.ts:52-60` | **良性**：它是「以序位定位」這個表達方式帶來的機械面，PRD 談不到它（PRD 只說顯示區間加留白）。`ARCH.md` §3 已逐條記下，並說明取捨與繪圖函式庫拿時刻定位時一致。**不建議補進 PRD**——那是實作層的等價保證，不是使用者說得出口的需求 |
| 2 | **資料稀疏時起點收回終點**（顯示區間整段落在兩根之間） | `drawn-k-candle-range-domain.ts:59-60` | 同上。有測試釘著（`drawn-k-candle-range-domain.spec.ts:101`） |
| 3 | **一次載入的答案改帶整段顯示區間**（`ChartVisibleRangeVo`）而非兩個散開的時刻 | `k-candle-chart-view-dto.ts:26`、`k-candle-chart-service.ts:126` | **良性**：`/improve-codebase` 階段的內部形狀整併，使用者看不見。它同時消掉了畫面自己組領域物件的那一處 |

**Out of Scope 檢查：** PRD 明列的四項（不動重取規則、不動快捷區間／粗細／指標／跟盤／時區、不加十字準星等互動、不做留白寬度的設定）
**逐項未被觸犯**——沒有任何一段新程式碼實作它們。無 scope creep。

---

## 3. Summary

| 指標 | 數 |
| :--- | :--- |
| 條款總數 | 22（AC 16 · BR 5 · NFR 3 — 其中 BR-5 與 AC-14 同源） |
| ✅ conforms | 19 |
| 🟡 partial（程式碼對、測試沒把那一條釘死） | 3 |
| 🔴 violation | 0 |
| 🟠 mis-asserted | 0 |
| ❌ gap | 0 |
| ❔ unclear | 0 |
| ⚠️ orphan | 3（全為良性） |
| **Conformance** | **86% 完全一致；100% 的條款由程式碼產生應有的結果** |

### 待補（依風險排序）

1. ~~**AC-14 / AC-16 / BR-5 — 即時更新不重新擺位，一條測試都沒有。**~~
   **已補**（`KCandleChartPanelLiveUpdates.spec.ts:98`）：它是這幾條裡唯一
   **改壞了也不會有任何東西變紅**的——哪天有人在即時更新那條路上順手更新
   `drawnRange`，畫面就會每分鐘跳一下，而整套測試仍然全綠。
   補上的那一條驗「市場動過之後，交給圖的那一段逐字相同」，
   並以突變確認過：在即時更新那條路上動 `drawnRange`，它就紅。

2. **AC-09 / AC-10 — 「拉遠拉近到需要重新取」沒有端到端的那一條。**
   兩半各自有測試（確有重取、重取後帶著留白），中間那一步沒有人站著。

3. **AC-12 — 收回上限之後仍有留白**，收回本身有測試，留白那一半沒有。

### Code review 之後補的兩條

`/code-review`（high）在合併前抓到兩件事，都已修掉並以突變確認過：

1. **一根都沒有而市場先動起來時，圖會把自己畫的第一批當成使用者拖曳**
   （`KCandleChart.vue:265`）。抑制標記原本立在「沒有位置可擺」那道門**之後**，
   但**光是 `setData` 函式庫就會回頭通知一次**（已在真瀏覽器裡確認）。
   後果是送回一段兩端相同的區間（只有一根時函式庫就是那樣回報），
   快捷區間失去反白，畫面還去取了一段寬度為零的行情，而且每一根新的都再來一次。
   **這是這一刀造成的迴歸**，因為舊的擺位函式無條件立那個標記。
   修法：標記移到門之前。釘它的測試：`KCandleChart.spec.ts:338`。
   替身也一併補上「setData 自己會通知」這個行為——少了它，這條路在測試裡走不到。

2. **只剩一根時留白歸零**（`drawn-k-candle-range-domain.ts:62`）。
   留白原本算的是「終點−起點」，也就是**間隔**而不是**根數**。
   休市日按下「一小時」時兩端會一起退到最後一根，相減得零——
   那唯一的一根又貼回右緣，正是這一刀要修掉的樣子。
   改成「終點−起點＋1」，同時也更貼合 PRD 說的「看得見的那段寬度的一成」。
   非迴歸（舊的拿時刻定位也是這樣塌），但規則現在住在這裡，就在這裡修。
   釘它的測試：`drawn-k-candle-range-domain.spec.ts:117`。

### 一句話

**沒有任何一條的行為是錯的**，partial 全部是「測試沒把它釘死」而非「程式碼做錯」。
風險最高的那一條（即時更新不重新擺位）已補；剩下兩條屬於組合場景，
既有測試已把兩半分別釘住，補與不補都說得過去。
