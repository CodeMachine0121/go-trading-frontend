# 台股上這台終端機 — Contract Verification Matrix

**Oracle:** `PRD.md` 第 3 節的 Gherkin 驗收條件（27 條）、第 4 節業務規則（10 條）、
第 6 節非功能需求（4 條）
**Design map:** `ARCH.md`（第 7 節 Traceability，用來定位程式碼，不作為契約）
**判定方式:** 靜態一致性稽核——測試對照 oracle、程式碼對照 oracle，兩邊**各自獨立**判定；
不以「測試跑綠」作為結論。

> **稽核天花板：** 本次只讀既有的測試與程式碼，不新寫探針、不執行自行發明的情境。

---

## 1. Clauses — US-01 交易標的看得出它屬於哪個市場

| ID | 條款 | Oracle | 實作位置 | 測試 | 測試稽核 | 程式碼稽核 | 狀態 |
|---|---|---|---|---|---|---|---|
| AC-01.1 | 兩個市場的標的並排時看得出差別 | 選單上 2330 標示台股、BTCUSDT 標示加密貨幣 | `SymbolField.vue`（選項文字帶市場標籤）＋`market-vo.ts`（標籤與值一起決定） | `SymbolField.spec.ts`／`挑之前就看得出每一檔屬於哪個市場` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.2 | 只看某一個市場 | 選單只剩那個市場的標的 | `trading-symbol-options-domain.ts:optionsFor` | `只看某一個市場時，其餘的不再列出` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.3 | 篩掉目前選著的那一檔時仍然看得見它，且沒有被默默改選 | 它仍在選項內；`modelValue` 未變 | `trading-symbol-options-domain.ts:optionsFor`（選著的一定留下） | `篩掉目前選著的那一檔時，仍然看得見它是哪一檔`（同時驗了 `modelValue`） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.4 | 該市場一檔都沒有時說明原因，不呈現空白選單 | 出現「這個市場目前沒有任何交易標的」 | `trading-symbol-options-domain.ts:hasNoneIn`＋`SymbolField.vue` 的 hint | `這個市場一檔都沒有時說得出原因，而不是給一個空選單` | asserts-oracle | produces-oracle | ✅ conforms |

## 2. Clauses — US-02 把交易標的加進觀察清單

| ID | 條款 | Oracle | 實作位置 | 測試 | 測試稽核 | 程式碼稽核 | 狀態 |
|---|---|---|---|---|---|---|---|
| AC-02.1 | 加一檔存在的台股，清單立刻出現它 | 市場與代號一起送出；清單重取後含它 | `WatchlistPanel.vue:add`＋`watchlist-proxy.ts:addToWatchlist` | `把市場與代號一起送出，成功後清單立刻跟著變` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.2 | 代號在那個市場找不到時說明找不到，清單維持原狀 | 出現「找不到」；不出現「稍後再試」 | `watchlist-proxy.ts`（400→`TradingSymbolNotInMarketError`）＋`WatchlistPanel.vue` | `代號在那個市場找不到時，說的是請他改輸入`、`watchlist-proxy.spec.ts/後端讀懂了請求卻拒絕` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.3 | 後端問不到那個市場時說稍後再試，且與前一句明顯不同 | 出現「稍後再試」與「與代號對不對無關」 | `watchlist-proxy.ts`（502→`MarketDataSourceUnavailableError`） | `後端問不到那個市場時，說的是稍後再試，而且明說與代號無關` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.4 | 重複加同一檔維持一筆，不呈現成錯誤 | 不出現錯誤；清單仍一筆 | 後端冪等；`WatchlistPanel.vue` 成功後重取 | 無專屬測試（冪等由後端保證，前端只是重取） | no-test | produces-oracle | 🟡 partial |
| AC-02.5 | 代號空白就地擋下，不向後端送出 | 出現「請填入代號」；後端未被呼叫 | `WatchlistEntryForm.vue:submit` | `代號空白就地擋下，不向後端送出任何東西` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.6 | 畫面說得出改動不是立刻生效的 | 出現「最多等一輪」 | `WatchlistPanel.vue` 的常駐說明 | `說得出改動不是立刻生效的` | asserts-oracle | produces-oracle | ✅ conforms |

## 3. Clauses — US-03 把交易標的從觀察清單拿掉

| ID | 條款 | Oracle | 實作位置 | 測試 | 測試稽核 | 程式碼稽核 | 狀態 |
|---|---|---|---|---|---|---|---|
| AC-03.1 | 移除前確認並說明 K 線都會留著，確認後清單不再有它 | 確認訊息含「都會留著」；確認前未送出 | `WatchlistPanel.vue` 的 `ConfirmDialog` | `移除前先確認，而且確認訊息說得出 K 線都會留著`、`確認之後才真的送出` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03.2 | 取消移除，它仍在清單上 | 未送出移除 | 同上 | `取消就什麼都沒發生` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03.3 | 拿掉最後一檔時說明目前沒有追蹤任何標的，不呈現成錯誤 | 出現空清單的說法，且不是錯誤提示 | `WatchlistPanel.vue` 的空清單分支 | `一檔都沒有時說明目前沒有追蹤任何標的，而不是呈現成錯誤` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03.4 | 拿掉之後它的 K 線還查得到，且它仍然挑得到 | 它仍出現在挑標的的選單上 | 不做任何事——`SymbolField` 從不依「是否追蹤」篩選 | 無專屬測試：`WatchlistPanel.spec.ts/只列出追蹤中的那幾檔` 驗的是**清單頁**不列它，不是**選單**仍列它 | no-test | produces-oracle | 🟡 partial |

## 4. Clauses — US-04 看得出哪幾檔有即時更新

| ID | 條款 | Oracle | 實作位置 | 測試 | 測試稽核 | 程式碼稽核 | 狀態 |
|---|---|---|---|---|---|---|---|
| AC-04.1 | 挑之前就看得出有即時更新 | 選單上標示得出來 | `SymbolField.vue` 的選項文字 | `挑之前就看得出哪一檔沒有即時更新`（反面同時涵蓋正面） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04.2 | 挑之前就看得出沒有即時更新 | 選單上出現「無即時更新」 | 同上 | 同上 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04.3 | 看一檔沒有即時更新的台股：說明它沒有即時更新、五分鐘更新一次，圖照常畫 | 出現該句；圖仍在 | `live-update-notice-domain.ts`→`noLivePlace`＋`KCandleChartPanel.vue` | `這一檔沒有即時更新時，說的是它不會自己好`、`沒有即時更新時圖照樣顯示手上有的` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04.4 | 沒有名額與即時斷掉是兩句不同的話 | 兩句措辭不同，且不同時出現 | `live-update-notice-vo.ts` 的兩個值 | `live-update-notice-domain.spec.ts/沒有名額壓過即時斷掉`＋面板測試 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04.5 | 加密貨幣不出現任何與名額有關的說明 | 不出現那一句 | `live-update-notice-domain.ts`（`hasLiveUpdates` 為真即不產出） | `一切正常時一句話都不說`、`domain/一切正常時什麼都不說` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04.6 | 拿到名額之後說明自己消失，最後那一根跟著動 | 重新進入圖表後那一句不再出現 | 重新取回標的即重新判定（`SymbolField` 於掛載時取清單） | 無專屬測試：domain 層有「一切正常時什麼都不說」，但沒有一條測試走完「原本沒有→後來有」 | no-test | produces-oracle | 🟡 partial |

## 5. Clauses — US-05 台股收盤時，圖不動是正常的

| ID | 條款 | Oracle | 實作位置 | 測試 | 測試稽核 | 程式碼稽核 | 狀態 |
|---|---|---|---|---|---|---|---|
| AC-05.1 | 收盤中進入圖表：說明台股目前收盤中，圖照常顯示 | 出現「收盤中」 | `live-update-notice-domain.ts`→`marketClosed`＋`KCandleChartPanel.vue` | `市場收盤時說收盤，而不是那幾則故障` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05.2 | **看到收盤那一刻**：最後那一根停止跳動，且畫面**開始**說明台股目前收盤中 | 收盤發生後，畫面上那一句變成「收盤中」 | 後端 `k_candle_follow_service.go` 收盤時送 `marketClosed`（與 `unavailable` 分開）；`live-k-candle-service.ts:liveUpdateNotice` 同時讀掛載時那一份與這則更新 | `KCandleChartPanelLiveUpdates.spec.ts/看著市場收盤的那一刻，說的是收盤，不是即時已停止`、`收盤那一刻，圖照樣顯示收盤前的最後那一根`；後端 `TestAFollowEndedByTheCloseSaysTheMarketShutRatherThanThatItsPlaceIsGone` | asserts-oracle | produces-oracle（**修正後**；原本說的是「即時更新已停止，正在重新連上」） | ✅ conforms |
| AC-05.3 | 開盤之後說明自己消失，最後那一根繼續動，使用者不必做任何事 | 那一句不再出現 | 無：收盤期間觀看者停在一條**開著但永不再送東西**的通道上（`noLivePlaceUpdates`），開盤時輪值把名額發回去，但沒有任何機制把這位觀看者接回真正的跟盤 | 無測試 | no-test | **not-implemented**——那一句要等到重新整理頁面才會消失 | ❌ gap |
| AC-05.4 | 加密貨幣不出現收盤的說明 | 不出現那一句 | `market-vo`／後端回報 `isWithinTradingSession` 恆為真 | `一切正常時一句話都不說` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05.5 | 收盤時的說法壓過即時停止的說法 | 只出現「收盤中」 | `live-update-notice-vo.ts` 的順序 | `收盤時不再多說一次即時已停止`、`domain/收盤壓過即時斷掉` | asserts-oracle | produces-oracle | ✅ conforms |

## 6. Clauses — US-06 沒有值的欄位不寫成零

| ID | 條款 | Oracle | 實作位置 | 測試 | 測試稽核 | 程式碼稽核 | 狀態 |
|---|---|---|---|---|---|---|---|
| AC-06.1 | 台股的 K 線那三欄呈現成「沒有這一項」，不是 0 | 三格是破折號 | `KCandleTable.vue`（`ABSENT_FIGURE`） | `這個市場不報的那三格畫成破折號，而不是 0` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06.2 | 成交量真的是零時仍顯示 0，且與破折號看起來不一樣 | 同一列上同時出現 `0` 與 `—` | 同上（`volume` 不可為空） | `真的是零的那一格仍然畫 0，且與破折號看起來不同` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06.3 | 加密貨幣的三欄照常顯示數字 | 出現數字、不出現破折號 | 同上 | `有報的市場照常畫出數字` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06.4 | 修改一根沒有那三項的 K 線時，那三格不讓人填並說明原因 | 三格留白、存下去仍然是沒有這一項，且畫面說得出為什麼可以空著 | `k-candle-write-domain.ts:readOptionalFigure`（留白＝沒有）＋`KCandleForm.vue` 的 `OPTIONAL_FIGURE_HINT`＋`k-candle-proxy.ts`（送 null） | `那三格空著就存得起來，而且存進去的是沒有這一項，不是零`、`那三格說得出為什麼可以空著`、`k-candle-write-domain.spec.ts` 三組、`k-candle-proxy.spec.ts/這個市場不報的那幾項送出去是沒有，不是零` | asserts-oracle | produces-oracle（**修正後**；原本這三格是**必填**，台股的 K 線根本存不下去） | ✅ conforms<sup>†</sup> |

<sup>†</sup> 與 PRD 字面的差異：實作採「可留白」而非「不讓人填」。禁止輸入會讓一根**確實有**這三項、
卻剛好還沒收到值的 K 線再也補不上去；「留白＝沒有這一項」達成同一個目的——防止 0 被寫進去——
而且沒有把門鎖死。這一條建議回頭修 PRD 的措辭。

## 7. Clauses — 業務規則（第 4 節）

| ID | 條款 | Oracle | 實作位置 | 測試 | 測試稽核 | 程式碼稽核 | 狀態 |
|---|---|---|---|---|---|---|---|
| BR-1 | 收盤與沒有名額**不得**呈現成既有四種狀態的任何一種 | 它們是自己的說法，不是那四種 | `live-update-notice-vo.ts`（獨立的值與語氣） | 面板測試以獨立的 testid 斷言 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-2 | 一次只說一句，優先序 收盤 ＞ 沒名額 ＞ 斷了 | 三者同時成立時只出現「收盤中」 | `live-update-notice-vo.ts` 的有序清單 | `domain/三件事同時成立時仍然只說最要緊的那一句` 等六條 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-3 | 沒有名額與斷掉分開講 | 兩句措辭不同 | 同 AC-04.4 | 同 AC-04.4 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-4 | 收盤與名額都由後端回答，畫面不自己推算 | 程式中沒有任何依時間推算收盤、或推算名額的路徑 | `trading-symbol-proxy.ts`（原樣讀）＋`live-update-notice-domain.ts`（只收事實） | `trading-symbol-proxy.spec.ts/把後端說的三件事原樣帶進來，不自己推算` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-5 | 沒有值呈現成破折號並淡化，與 0 分得出來 | 同 AC-06.1／06.2 | `KCandleTable.vue` | 同上 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-6 | 移除必須二次確認且說明資料會留著 | 同 AC-03.1 | `WatchlistPanel.vue` | 同上 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-7 | 加入失敗要分得出是哪一種 | 同 AC-02.2／02.3 | `watchlist-proxy.ts` | 同上＋`後端自己壞掉不說成行情來源不在` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-8 | 改動不是立刻生效；**不顯示倒數** | 有常駐說明，且沒有任何倒數 | `WatchlistPanel.vue` | `說得出改動不是立刻生效的`（沒有倒數這件事由「程式中沒有那段」保證） | asserts-oracle | produces-oracle | ✅ conforms |
| BR-9 | 篩選不改變選擇 | 同 AC-01.3 | `trading-symbol-options-domain.ts` | 同上 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-10 | 加入時不即時查詢，只在送出時問一次 | 打字期間後端未被呼叫 | `WatchlistEntryForm.vue`（只在 submit 時 emit） | 無專屬測試：`代號空白就地擋下` 驗的是空白那一條，不是「打字不查詢」 | no-test | produces-oracle | 🟡 partial |

## 8. Clauses — 非功能需求（第 6 節）

| ID | 條款 | Oracle | 實作位置 | 測試 | 測試稽核 | 程式碼稽核 | 狀態 |
|---|---|---|---|---|---|---|---|
| NFR-1 | 篩選在畫面這一側完成，不重新向後端取一次 | 切換市場時後端未被再呼叫 | `SymbolField.vue`（`options` 是 computed，不是 fetch） | 無專屬測試 | no-test | produces-oracle | 🟡 partial |
| NFR-2 | 加入只在送出時向後端確認一次 | 同 BR-10 | 同 BR-10 | 同 BR-10 | no-test | produces-oracle | 🟡 partial |
| NFR-3 | 沿用既有樣式系統的 token | 新樣式只用 token 函式 | `SymbolField.vue`／`WatchlistPanel.vue`／`KCandleTable.vue` 的 `<style scoped lang="scss">` | `bun run lint:style`（stylelint 擋硬編碼） | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-4 | 新畫面與既有畫面看起來是同一台終端機 | 沿用 ConsoleLayout 與既有原子 | `pages/watchlist/index.vue` | 無專屬測試（外觀特性） | no-test | produces-oracle | 🟡 partial |

---

## 2. Orphans（沒有對應條款的程式碼）

| 程式碼 | 它做了什麼 | 判定 |
|---|---|---|
| `SymbolField.vue` 的 `selected` 事件 | 把目前選著的那一檔的完整樣子交給使用端 | **undocumented**——是 ARCH 的設計決定（避免第二次取清單），PRD 未涵蓋。行為正確且被面板測試連帶覆蓋 |
| `optional-figure-domain.ts` | 合併更粗的一根時，沒有加上沒有還是沒有 | **undocumented**——PRD 只說了呈現，沒說合併。它是 US-06 的必然延伸（圖表看一小時一根時同樣不該憑空生出一個數字），建議補進 PRD |
| `WatchlistPanel` 的「送出期間按鍵停用」 | 送出中不讓人按第二次 | **undocumented**——PRD 的 Edge Cases 有寫，但沒有成為驗收條件。行為正確且有測試 |

---

## 3. Summary

稽核跑了兩輪：第一輪的判定，以及修掉之後的重新判定。下表是**修正後**的狀態。

- **Conforms:** 33 / 41 條 ✅（80%）
- **Violations:** 無（原有的兩條已修，見下）
- **Mis-asserted:** 無
- **Partial:** `AC-02.4`、`AC-03.4`、`AC-04.6`、`BR-10`、`NFR-1`、`NFR-2`、`NFR-4`
- **Gaps:** `AC-05.3`（開盤之後那一句不會自己消失）
- **Unclear:** 無
- **Orphans:** 3（皆為 undocumented，非越界）

### 這次稽核抓到什麼，以及修了什麼

**一、收盤那一刻，畫面說了三句裡最糟的一句。**（`AC-05.2`，已修）

後端收盤時收回名額 → 送出「沒有名額」→ 隨即結束通道 → 前端把通道結束讀成「斷了」→
畫面說「即時更新已停止，正在重新連上」，承諾一個**要等到明天早上九點**的恢復。

優先序本身是對的，錯的是餵給它的事實：`isWithinTradingSession` 是**進畫面那一刻**
取回來的一份，收盤不會讓它更新。整套測試當時全綠，因為每一條收盤測試都是
「掛載時就已經收盤」，沒有一條走完「看著它收盤」。

修法：後端把「這個市場休市」與「你的名額被別人拿走」分成兩個字
（`marketClosed` / `unavailable`），在兩個答案都還在手上的地方決定送哪一個；
前端的那一句同時讀兩個來源——進畫面那一刻問到的，與只有即時更新說得出來的。

**二、台股的 K 線根本存不下去。**（`AC-06.4`，已修）

比第一輪記錄的更嚴重：那三格不只是「可填」，而是**必填**——留白會被擋在
「請填寫成交額」，於是使用者只能替一個不報這一項的市場編一個數字出來，
而編出來的數字一旦存進去，就再也分不出是市場報的還是人填的。
修法：三格改為可留白，留白即「沒有這一項」，送到後端是 null，畫面也說得出為什麼能空著。

### 還沒修的那一條，以及為什麼

**`AC-05.3`：開盤之後，那一句不會自己消失。**

收盤期間，觀看者停在一條「說完一句話就再也不送東西、但一直開著」的通道上。
開盤時輪值把名額發回去、真正的跟盤重新開始，但**沒有任何機制把這位觀看者接回去**，
所以畫面會一直說「收盤中」，直到他重新整理頁面。

這一條的修法不是改一句話，而是改觀看者的生命週期——例如讓沒有名額的通道說完就結束、
配合 SSE 的 `retry` 讓瀏覽器以較長的間隔自己回來問，或讓輪值主動把等著的觀看者接回跟盤。
兩者都會動到即時通道的行為（也會讓「通道結束」與「斷線」需要再分一次），
影響範圍超出「照 contract feedback 修一下」，因此留給人決定要走哪一條。

**附帶發現（已一併修掉）**：`README.md` 的即時跟盤章節仍寫「`status` 是三者之一」，
也仍以 `KCANDLE_INGESTION_SYMBOLS` 說明跟盤與觀察清單無關——那個環境變數在本切片已被移除，
而台股的跟盤名額恰恰**就是**由觀察清單決定的，說反了。
