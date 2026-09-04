# 看現在的時候，指標也要跟著現在 — Architecture Design

**Feature:** 看現在的時候，指標也要跟著現在
**Status:** Finalized
**PRD:** `PRD.md`（同一資料夾）
**Owner:** James Hsueh

---

## 1. Design Goal & Guiding Principle

**這個切片幾乎不新增東西——它是把一條本來就通的路重新接上。**

系統早就規定「計算截止時間未指定時視為現在」，而這條「不指定」的路徑
**在程式裡也早就完整存在**：`IndicatorCalculationRequestDomain.endTime` 是 `Date | null`，
`IndicatorCalculationProxy` 在它為 `null` 時直接省略該欄位不送。
只有最外層的 `ChartIndicatorRequestDto` 把它寫死成必填的 `Date`，
於是圖表這條路永遠都在指定，那條「交給系統判斷」的路就被蓋住了。

指導原則兩句：

1. **「不指定」是一種合法的表達，不是缺值。** 讓它一路暢通，而不是在呼叫端到處判斷。
2. **「看得到最新那一根嗎」是顯示區間自己的性質**，不是呼叫端該自己算的東西。
   它讀的是顯示區間的右端與最新那一根的起始時間——行為要住在它操作的資料旁邊。

---

## 2. Change Scope

### 新增

**無新檔案。** 這個切片沒有任何一個新類別——它加的是既有物件回答得了、
卻還沒有人問過的兩個問題。

### 修改

| 檔案 | 改什麼 | 為什麼 |
| :--- | :--- | :--- |
| `chart-visible-range-vo.ts` | 新增 `showsTheLatestKCandle(latestOpenTime)` 與 `calculationEndTime(latestOpenTime)` | 這兩個判斷讀的全是顯示區間的兩端與最新那一根的起始時間 |
| `k-candle-chart-dto.ts` | 新增 `latestKCandleOpenTime` 取值 | 「最新那一根是幾點開始的」是這批 K 線自己的性質，與既有的 `count`／`isEmpty` 同一類 |
| `chart-indicator-request-dto.ts` | `endTime` 由 `Date` 改為 `Date | null` | 讓「不指定」在最外層也說得出口。下游本來就收得下 |
| `use-chart-indicators.ts` | `calculateOne` 改問 `calculationEndTime`；`recalculateAfterKCandleClosed` 先問看不看得到最新那一根 | 觸發與截止時間各自向顯示區間發問 |

### 刻意不動

- **`IndicatorCalculationRequestDomain` 與 `IndicatorCalculationProxy` 一行不改。**
  它們早就處理得了 `null`——這正是本設計最重要的發現：要做的是不要擋住它。
- **`KCandleChartPanel.vue` 一行不改。** 觸發點沒變（顯示區間變了、一根走完了），
  變的是那兩個觸發**送出去之後**由誰決定算到哪一刻。
- **前一切片的四條規則全部不動**：觸發是顯示區間變了、停手三百毫秒才算、
  沒真的變就不算、較新的那次勝出。
- **即時跟盤的整條路徑**（`LiveKCandleService`、合併算法、停掉時的呈現）。

---

## 3. Modified Components

### `ChartVisibleRangeVo` — 兩個新問題

```ts
showsTheLatestKCandle(latestKCandleOpenTime: Date | null): boolean
calculationEndTime(latestKCandleOpenTime: Date | null): Date | null
```

**`showsTheLatestKCandle`** — 顯示區間的右端落在最新那一根的起始時間**之後（含）**。
邊界取「含」是因為兩種誤判的代價不對稱：使用者明明拖到了最新那一根卻發現指標不動，
比多算一次難理解得多。沒有最新那一根（圖是空的）時回 `false`——沒有東西可比，
就沒有理由宣稱在看現在。

**`calculationEndTime`** — 看得到就回 `null`（**意思是「交給系統判斷」，不是「沒有值」**），
看不到就回顯示區間的右端。

**為什麼是兩個方法而不是一個。** 呼叫端真的會問兩個不同的問題：
「這一根走完了，要不要重算」與「這次要算到哪一刻」。第二個由第一個推得出來，
所以 `calculationEndTime` 內部呼叫 `showsTheLatestKCandle`——
**呼叫端因此永遠不必自己把兩者兜起來**，這正是不讓它記帳的意思。

**為什麼放在這個 VO 上而不是別處。** 它讀的資料只有三個時刻：
顯示區間的兩端，加上最新那一根的起始時間。放在別處就得把這兩端整包傳過去，
那就是 Feature Envy。它已經帶著 `isSameAs` 與 `kCandleCountAt`，
這兩個新方法與它們是同一類：**都是「這一段是什麼樣的一段」的答案**。

### `KCandleChartDto.latestKCandleOpenTime`

`Date | null`。空的時候是 `null`，與既有的 `isEmpty` 是同一件事的兩種問法。

### `ChartIndicatorRequestDto.endTime: Date | null`

**這不是「到處都要判斷 null」**：整條路上只有一處產生它（`calculationEndTime`）、
一處消費它（proxy 決定送不送這個欄位），中間每一層都只是搬運。
**`null` 在這裡是一個有意義的值——「照系統的現在」**——而不是缺漏。

### `use-chart-indicators.ts`

```ts
// calculateOne：算到哪一刻，問顯示區間
range.calculationEndTime(chart.latestKCandleOpenTime)

// recalculateAfterKCandleClosed：要不要算，也問顯示區間
if (!range.showsTheLatestKCandle(chart.latestKCandleOpenTime)) {
  return
}
```

**這個條件由顯示區間回答，不由 composable 自己判斷。** composable 只負責在對的時機
發問並照答案行事——它一如既往不做業務判斷。

### Depth check

| 診斷 | 結果 |
| :--- | :--- |
| 呼叫端需要自己把兩件事兜起來嗎？ | 否。`calculationEndTime` 內部就把「看不看得到」用掉了 |
| 參數會不斷長大嗎？ | 兩個新方法各一個參數 |
| 新增了幾個類別？ | **零**。要加的問題，既有的物件本來就答得出來 |
| `null` 會擴散嗎？ | 不會。一處產生、一處消費，中間只是搬運 |

---

## 4. Component Relationships

```
一根走完 ──▶ useChartIndicators.recalculateAfterKCandleClosed(chart)
                     │
                     ├─▶ range.showsTheLatestKCandle(chart.latestKCandleOpenTime)
                     │        否 → 就此打住（這一段已經過去了）
                     │        是 ↓
                     └─▶ 對每一支 calculateOne
                              └─▶ range.calculationEndTime(...)
                                       看得到 → null（照系統的現在）
                                       看不到 → 顯示區間的右端
                                            ↓
                              ChartIndicatorRequestDto.endTime
                                            ↓
                              IndicatorCalculationRequestDomain（既有，收得下 null）
                                            ↓
                              IndicatorCalculationProxy（既有，null 就不送這個欄位）
                                            ↓
                              系統：未指定 → 視為現在
```

---

## 5. Extensibility & Handoff Notes

### 最可能的下一個需求

**「我想釘住某一刻，反覆調整策略看同一組數字」**（回測式的用法）。
使用者手動指定一個時刻，指標就固定算到那裡，不管他怎麼拉遠拉近。

它會打在哪：**只有 `calculationEndTime` 一處**。那個方法現在有兩種答案
（`null` 或顯示區間的右端），屆時變成三種（多一個「使用者釘住的那一刻」）。
`showsTheLatestKCandle`、觸發點、請求的形狀**一律不必改**——
因為「算到哪一刻」這個問題早就集中在一個地方回答了。

這正是本設計把兩個問題放在同一個 VO 上的回報：**下一個需求是多一個答案，不是多一條路。**

### 給下一個接手的人

- **不要把 `endTime` 改回必填。** `null` 在這裡是「照系統的現在」，是一個答案而不是缺值；
  改回必填等於再一次蓋掉系統本來就有的規則。
- **不要用時間門檻取代「看得到最新那一根」。** 門檻的長短會隨彙總刻度改變意義
  （看一天一根時「五分鐘之內」毫無意義），而「畫面上有沒有現在」是使用者眼睛看得到的事實。
- **不要讓即時更新推進顯示區間。** 顯示區間是使用者的意圖；
  讓它自己動，使用者就再也無法停在他想看的那一段。

---

## 6. Traceability

| PRD 情境 | 由誰滿足 |
| :--- | :--- |
| US-01.1 一根走完，答案往前走一格 | `recalculateAfterKCandleClosed` 通過判斷後重算，`calculationEndTime` 回 `null` |
| US-01.2 放著不動也一直跟著走 | 同上（每一根走完都重算，且截止時間一律是系統的現在） |
| US-01.3 往回一點但仍看得見，仍算到現在 | `showsTheLatestKCandle` 只看右端是否在最新那一根之後 |
| US-01.4 一支都沒套用時不計算 | 既有的「清單為空即無事可做」 |
| US-02.1 看不見時，一根走完不重算 | `recalculateAfterKCandleClosed` 的前置判斷 |
| US-02.2 待再久答案也不變 | 同上（每一次都被同一個判斷擋下） |
| US-02.3 拖回來就重新跟著現在 | 拖動走既有觸發；`calculationEndTime` 這時回 `null` |
| US-03.1 換一段仍在看現在 | `kCandleCountAt`（既有）給根數，`calculationEndTime` 給 `null` |
| US-03.2 換一段在看過去 | `calculationEndTime` 回顯示區間的右端 |
| US-03.3 顯示區間沒真的變就不重算 | `isSameAs`（既有，不改） |
| US-03.4 還在拖的時候不重算 | 停手等待（既有，不改） |
| US-04.1 看不見時最新那一根照樣更新 | 即時跟盤（既有，不改） |
| US-04.2 拖回來就是最新的 | 同上 |
| US-04.3 即時停掉照樣明說 | 同上 |

---

## 7. 對既有測試的影響

**會需要調整的，只有那些明確斷言 `endTime` 的指標測試。**

前一切片的 `KCandleChartPanelIndicators.spec.ts` 有幾條斷言
`expect.objectContaining({ endTime: ... })`。改動之後，
**同一個情境送出的可能是 `null`（在看現在）而不是那個時刻**。

**這不是回歸，是這次要的行為變更**：那些測試原本斷言的是
「截止時間一律等於顯示區間的右端」，而本切片正是要把它改成
「看得到最新那一根時交給系統判斷」。調整方式是讓每條測試**明確表態**它在測哪一種情況——
測「看過去」的就把顯示區間拖到最新那一根之外，測「看現在」的就斷言 `endTime` 為 `null`。

**測試因此會變得更誠實**：原本它們沒有表態，是因為當時只有一種情況。

---

## 8. Risks & Open Decisions

### Risks / trade-offs

- **在看現在時，算出來的那一段可能略寬於畫面上看得到的。**
  截止時間是「系統的現在」，而顯示區間的右端是使用者上次動畫面的那一刻——
  兩者之間差了幾分鐘。這是「算到現在」的定義本身帶來的，不是誤差：
  他要的就是把最新的行情算進去。
- **答案會自己變。** 使用者截圖下來的指標值，幾分鐘後再看可能已經不同。
  這與圖上那一根會變是同一件事，是跟著市場走的必然代價。

### 實作後的檢視：兩項都不採納

實作完成後對本切片動過的檔案做了一次深模組檢視。**這次沒有值得改的東西**——
本切片只加了兩個方法與一個取值，而且都沒有新增類別。

| 建議 | 為什麼不做 | 該回頭處理的訊號 |
| :--- | :--- | :--- |
| 「顯示區間 ＋ 手上這張圖」看起來是一個還沒命名的概念，該抽成一個物件 | 抽出來的那個物件，四個對外成員裡有兩個（交易標的、彙總刻度）只是**原樣轉手** ——那正是 shallow interface 的樣子。而且這個配對只出現在兩處，兩處**本來就已經把它當成一件事持有**（composable 的 `current`），所以「呼叫端自己把兩半兜起來」的問題並不存在 | **第三處**需要同樣的配對時。屆時它就不只是兩個呼叫點的巧合，而是一個真的概念 |
| `showViewport` 裡三個相鄰的判斷（設圖、記區間、開始跟盤）順序是有意義的，卻只靠註解說明 | 把三行包成一個函式只是換個地方放，順序仍然只靠註解成立——**沒有讓順序變成結構上不可弄錯**。真正能做到那件事的做法（讓跟盤在區間未知時也安全）代價是留一個永遠走不到的分支，比註解更糟 | 這個函式再長出第四個順序相依的步驟時 |

`ChartVisibleRangeVo` 現在有四個方法，其中兩個收「最新那一根的起始時間」。
這**不是**參數在長大——四個方法回答的都是同一類問題（**這一段是什麼樣的一段**），
而那個參數是「看得到最新那一根嗎」這個問題本身的另一半資料，不是配置。

### Open decisions

- 無。BRIEF 的兩項未定案已在 PRD 定案（邊界取「含」、切回來時等停手）。
