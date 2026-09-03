# 看現在的時候，指標也要跟著現在 — Contract Verification Matrix

**Oracle:** `PRD.md` 第 3 節的 Gherkin 驗收條件（14 條）
**Oracle 紀錄:** 實作前寫於 scratchpad `oracle-live-edge.md`（獨立性關卡的證據）
**判定方式:** 靜態一致性稽核——測試對照 oracle、程式碼對照 oracle，兩邊**各自獨立**判定；
不以「測試跑綠」作為結論。

---

## 1. Clauses

| ID | 條款 | Oracle（實作前寫下） | 實作位置 | 測試 | 測試稽核 | 程式碼稽核 | 狀態 |
|---|---|---|---|---|---|---|---|
| AC-01.1 | 一根走完，指標的答案往前走一格 | 那一支**以現在**重算 | `use-chart-indicators.ts:154`（先問看不看得到最新那一根）＋ `chart-visible-range-vo.ts:76`（看得到就不指定截止時間） | `KCandleChartPanelLiveEdge:一根走完時以現在重算——截止時間交給系統判斷` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.2 | 放著不動也一直跟著走 | 算到的是現在，不是打開畫面那一刻 | 同上（每一根走完都走同一條路） | `連續走完好幾根都一直跟著走` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.3 | 往回拖一點但仍看得見，仍算到現在 | 仍以現在重算 | `chart-visible-range-vo.ts:66`（只看右端是否在最新那一根之後） | `往回拖一點但最新那一根還看得見，仍然算到現在`（右端**剛好卡在**最新那一根上，即邊界） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.4 | 一支都沒套用時不發生任何計算 | 不發生任何計算 | `use-chart-indicators.ts:162`（清單為空即無事可做） | `一支都沒套用時，一根走完不發生任何計算` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.1 | 看不見最新那一根時，一根走完不重算 | 不重算；指標仍是那一段的答案 | `use-chart-indicators.ts:154` | `看不見最新那一根時，一根走完不重算` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.2 | 待再久答案也不變 | 值一次都沒變過 | 同上（每一次都被同一個判斷擋下） | `待再久、走完再多根，答案也一次都沒變`（十二根） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.3 | 拖回來看得見時，重新跟著現在 | 重算，且算到現在 | 拖動走既有觸發；`calculationEndTime` 這時回「不指定」 | `拖回來看得見最新那一根時，重新算到現在` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03.1 | 換一段仍在看現在時，以新那一段算、算到現在 | 以三天這一段重算，算到現在 | `kCandleCountAt`（既有）＋ `calculationEndTime` | `換一段仍在看現在時，以新那一段算、且算到現在`（三天 → 十五分鐘一根 → 288 根） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03.2 | 換一段在看過去時，算到那一段的右端 | 算到 06:00（那一段的右端） | `chart-visible-range-vo.ts:76` | `算到的是那一段的右端，不是現在` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03.3 | 顯示區間沒真的變就不重算 | 不重算 | `isSameAs`（既有，**本切片一行未改**） | 既有 `顯示區間沒真的變就不重算` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03.4 | 還在拖的時候不重算 | 不發生任何計算 | 停手等待（既有，**本切片一行未改**） | 既有 `使用者還在動的時候一次都不算` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04.1 | 看不見時，最新那一根照樣更新 | 最新那一根跟著更新，使用者這時看不到它 | 即時跟盤（既有，**本切片一行未改**）；跟盤與「在看哪一段」無關 | `看不見最新那一根時它照樣更新，拖回來就是最新的` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04.2 | 拖回來就是最新的 | 看到的是最新的那一根，不必重新整理 | 同上 | 同上（斷言拖到過去期間送來的那一根確實在圖上） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04.3 | 即時停掉照樣明說，與在看哪一段無關 | 畫面明說即時更新已停止 | `KCandleChartPanel.vue:167`（與顯示區間無關的一條路徑） | `即時更新停掉時照樣明說，與在看哪一段無關` | asserts-oracle | produces-oracle | ✅ conforms |

---

## 2. Business Rules / NFR

| ID | 條款 | 覆蓋情形 |
|---|---|---|
| BR-1 | 「在看現在」＝顯示區間右端 ≥ 最新那一根的起始時間，不用時間門檻 | `chart-visible-range-vo.spec.ts` 的表格測試，含**剛好卡上**與**差一毫秒**兩側 ✅ |
| BR-2 | 在看現在時計算截止時間就是現在——不由畫面指定 | `看得到最新那一根就不指定——交給系統的「現在」` ✅ |
| BR-3 | 在看過去時計算截止時間是顯示區間的右端 | `看不到最新那一根就算到這一段的右端` ✅ |
| BR-4 | 「一根走完就重算」只在看現在時成立 | AC-01.1／02.1 ✅ |
| BR-5 | 既有四條規則一字不改 | AC-03.3／03.4 加上既有測試全綠 ✅ |
| BR-6 | 即時更新不因往回看而停下來 | AC-04.1 ✅ |
| NFR-1 | 在看現在時一根走完才算一次；看過去時完全不算 | AC-01.1／02.2 ✅ |

---

## 3. Orphans

| 行為 | 對應條款 | 判定 |
|---|---|---|
| 圖上一根 K 線都沒有時，不算在看現在 | PRD Edge Cases 有寫，但沒有專屬 Scenario | ⚠️ 已由 `chart-visible-range-vo.spec.ts` 的 `圖上一根都沒有時，不算在看現在` 與 `k-candle-chart-dto.spec.ts` 釘住。建議日後補成正式條款 |

**沒有任何行為落在 Out of Scope 清單內**，不構成範圍蔓延。

---

## 4. Summary

```
✅ 14 conforms · 🔴 0 violations · 🟠 0 mis-asserted · 🟡 0 partial · ❌ 0 gaps · ❔ 0 unclear · ⚠️ 1 orphan
Conformance: 100%（14/14）
```

**稽核過程中補上的兩處**（程式碼本來就對，是「既有行為不得改變」那三條缺專屬證據）：

| # | 問題 | 處置 |
|---|---|---|
| 1 | AC-04.1／04.2「看過去時圖照樣更新、拖回來就是最新的」只有在**看現在**的情境下被測過 | 補上一條在**看過去**的情境下送出更新、並斷言那一根確實進了圖 |
| 2 | AC-04.3「即時停掉照樣明說」同樣只在看現在的情境下被測過 | 補上一條在看過去的情境下停掉並斷言說明出現 |

這兩條釘住的是本切片**最容易犯的錯**：把跟盤也變成「只在看現在時才運作」。
以突變測試確認——把「更新圖」改成有條件的，兩種寫法都被擋下
（一種連編譯都過不了，另一種被測試擋下）。

**覆蓋率（實測，`@vitest/coverage-v8`）：** 本切片動過的檔案陳述式 99.5%（220/221）、
分支 98.2%（111/113）。未覆蓋的兩處是無法構造的型別收窄守衛。

**突變測試：** 8 個突變逐一確認會被對應測試擋下，無存活者
（其中一個「拿最舊那一根當最新的」最初存活——測試資料只有一根 K 線，
最舊的就是最新的，分不出來；改成兩根、並讓「看過去」那一段落在兩根之間之後被擋下）。

**Ceiling:** 這是靜態一致性稽核——逐條比對測試斷言與程式碼路徑對規格的預期結果，
不執行自己發明的情境。AC-03.3／03.4 與 AC-04.\* 講的是「既有行為不得因本切片而改變」，
判定依據是「本切片未觸及那些路徑」加上「既有測試全數維持綠燈」，
外加本次為 AC-04.\* 補上的在看過去情境下的專屬證據。
