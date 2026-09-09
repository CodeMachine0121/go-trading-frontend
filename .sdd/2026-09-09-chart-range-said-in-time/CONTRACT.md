# 圖表只說使用者在看哪一段 — Contract Verification

**Contract source:** `.sdd/2026-09-09-chart-range-said-in-time/PRD.md`
**Design map:** 同資料夾 `ARCH.md`
**Verified at:** 2026-09-09
**Ceiling:** 靜態符合性稽核。測試斷言與程式路徑各自對照 PRD 推出的 oracle，
**不以「跑起來是綠的」當判準**，也不自行撰寫或執行新的探針。

---

## 1. Clauses

### US-01 — 六個快捷區間各自不同長度

| ID | Clause | Oracle | Impl | Test | Status |
| :-- | :-- | :-- | :-- | :-- | :-- |
| AC-01 | 按一天看到一天 | 顯示區間為前一天同時刻到現在 | `k-candle-chart-range-preset-dto.ts`（不改）＋ 天花板移除 | `k-candle-chart-application.spec.ts` 快捷區間那一組（既有）＋ `KCandleChartPanel.spec.ts` "不必重新取時…" 斷言回到整天 | ✅ conforms |
| AC-02 | 按一個月看到三十天 | 顯示區間為三十天前到現在 | 同上 | 既有 `listRangePresets` 測試（`oneMonth?.toViewportDto` 斷言 2026-08-03 → 2026-09-02） | ✅ conforms |
| AC-03 | 按一年看到三百六十五天 | 顯示區間為 365 天前到現在 | 同上 | `k-candle-chart-viewport-domain.spec.ts` "看一年——以前會被收成四百分鐘,現在原樣看得到" | ✅ conforms |
| AC-04 | 兩顆不同的按鈕看到的不是同一段；被按的那顆看得出來 | 兩次長度不同；反白正確 | 天花板移除 ＋ `activePresetLabel`（不改） | 長度不同由 AC-01/03 兩條合起來釘住（400 分鐘天花板存在時它們會相等）；反白由既有測試釘住 | ✅ conforms |

### US-02 — 每根涵蓋多久由系統決定並告知

| ID | Clause | Oracle | Impl | Test | Status |
| :-- | :-- | :-- | :-- | :-- | :-- |
| AC-05 | 取行情時只說要哪一段，不含刻度、不含根數 | 送出的查詢只有 symbol／startTime／endTime | `k-candle-proxy.ts` `findKCandleSeries`；`KCandleChartLoadPlanVo` 已無 `interval` 欄位 | `k-candle-proxy.spec.ts` "只把要取的那一段問出去——彙總刻度不由這裡決定"（整包 query 對比）＋ `k-candle-chart-application.spec.ts` `'interval' in loadPlan === false` | ✅ conforms |
| AC-06 | 系統回報五分鐘就顯示五分鐘 | 「每根涵蓋」顯示五分鐘 | `k-candle-proxy.ts` 讀回覆 → `KCandleSeriesVo` → `k-candle-series-domain.ts` → `KCandleChartDto.interval` | `k-candle-series-domain.spec.ts` "每根涵蓋多久取自系統的回覆…"（4h→四小時）＋ `k-candle-proxy.spec.ts`（1h→一小時） | ✅ conforms |
| AC-07 | 系統回報一分鐘就顯示一分鐘 | 「每根涵蓋」顯示一分鐘 | 同上 | `KCandleChartPanel.spec.ts` "進入畫面就取一次行情，並照系統回報的標示每根涵蓋多久" | ✅ conforms |
| AC-08 | 認不得的刻度退回最細的，照樣畫得出來，不呈現錯誤 | 刻度為一分鐘；圖仍畫得出來；無錯誤 | `aggregationIntervalOf`（`aggregation-interval-vo.ts`） | `k-candle-proxy.spec.ts` "系統回報一個認不得的刻度時退回最細的那一種"（含 K 線仍在）＋ `k-candle-series-domain.spec.ts` 同名案例 | ✅ conforms |

### US-03 — 台股在盤後與週末看得到 K 線

| ID | Clause | Oracle | Impl | Test | Status |
| :-- | :-- | :-- | :-- | :-- | :-- |
| AC-09 | 週六按五天看得到那五個交易日 | 顯示區間涵蓋那五天的交易時段；圖畫得出 K 線 | 天花板移除（那五天不再被收成 400 分鐘）＋ 系統挑刻度 | **無專屬測試**。程式對：顯示區間就是那五天（AC-03 同一條路徑釘住不被收回），而「那一段涵蓋交易時段」是日期算術的必然 | 🟡 partial |
| AC-10 | 盤後按一天看得到當天盤中 | 同上 | 同上 | **無專屬測試**，同 AC-09 | 🟡 partial |
| AC-11 | 拉出整個週六呈現「查無 K 線」，不是錯誤 | 呈現「查無 K 線」；非錯誤 | 既有空狀態（不改） | 既有 `KCandleChartPanel.spec.ts` "這段區間內沒有任何 K 線時說「查無 K 線」" | ✅ conforms |

### US-04 — 拉遠只有一千天這一個極限

| ID | Clause | Oracle | Impl | Test | Status |
| :-- | :-- | :-- | :-- | :-- | :-- |
| AC-12 | 拉出一年不被收回 | 顯示區間就是那一年 | `MAXIMUM_VISIBLE_DAYS`（`k-candle-chart-viewport-domain.ts`） | `k-candle-chart-viewport-domain.spec.ts` 上限表格 ＋ `KCandleChartPanel.spec.ts` "拉出五百天不再被收回" | ✅ conforms |
| AC-13 | 恰好一千天不被收回 | 顯示區間就是那一千天 | 同上（邊界為 `>`） | 上限表格 "看恰好一千天" | ✅ conforms |
| AC-14 | 一千零一天收回一千天，結束端不變 | 顯示區間 1000 天；結束端不變 | 同上 | 上限表格 "看一千零一天:收回一千天"（同時斷言結束端） | ✅ conforms |
| AC-15 | 十年也只是收回一千天 | 同上 | 同上 | 上限表格 "看十年:一樣收回一千天" ＋ `KCandleChartPanel.spec.ts` "拉得比一千天還遠時" | ✅ conforms |

### US-05 — 放大之後看到更細的 K 線

| ID | Clause | Oracle | Impl | Test | Status |
| :-- | :-- | :-- | :-- | :-- | :-- |
| AC-16 | 放大到一半就重新取 | 重新取一次 | `toLoadPlan()` 的長度變化子句 | `k-candle-chart-viewport-domain.spec.ts` "放大到一半:重新取" ＋ `k-candle-chart-application.spec.ts` "拉遠就重新取" | ✅ conforms |
| AC-17 | 小幅平移不重新取 | 不重新取 | 同上（長度未變） | 同檔 "正在看的那段完全落在手上這批之內、長度也沒變，就不取" ＋ `KCandleChartPanel.spec.ts` 同長度平移 | ✅ conforms |
| AC-18 | 長度只變一成不重新取 | 不重新取 | 同上（0.1 < 0.25） | "只變一成:不重新取"；邊界另有 "恰好變兩成半:還不算變了" 與 "變三成:超過門檻,重新取" | ✅ conforms |
| AC-19 | 拖出手上這批的範圍就重新取 | 重新取一次 | 涵蓋範圍子句（不改） | 既有表格「往前拖出／往後拖出」（涵蓋範圍已調成同長度，故理由只剩這一個） | ✅ conforms |
| AC-20 | 換交易標的就重新取 | 重新取一次 | 交易標的子句（不改） | 既有表格「手上這批是別的交易標的」＋ 面板既有測試 | ✅ conforms |
| AC-21 | 換畫法不重新取 | 不重新取 | 面板既有行為（不改） | 既有 `KCandleChartPanel.spec.ts` "換畫法不重新取" | ✅ conforms |

### Business Rules

| ID | Clause | Impl | Test | Status |
| :-- | :-- | :-- | :-- | :-- |
| BR-1 | 交出去的只有交易標的與一段起訖時間 | `KCandleChartLoadPlanVo`（無 `interval`）＋ proxy | AC-05 | ✅ conforms |
| BR-2 | 刻度由系統回報、畫面照抄；認不得退回最細 | `aggregationIntervalOf` ＋ `KCandleSeriesVo` | AC-06～08 | ✅ conforms |
| BR-3 | 唯一的上限是一千天，保留較晚的那一端 | `MAXIMUM_VISIBLE_DAYS` | AC-12～15 | ✅ conforms |
| BR-4 | 兩側各多取半段 | `PREFETCH_RATIO`（不改） | 既有 "取資料時兩側各多取半段" | ✅ conforms |
| BR-5 | 重新取的五個理由 | `toLoadPlan()` 的判斷鏈 | AC-16～20 ＋ "手上這批涵蓋不到任何時間時就重新取" | ✅ conforms |
| BR-6 | 快捷區間各自往前若干天 | `KCandleChartRangePresetDto`（不改） | AC-01～03 | ✅ conforms |

### Non-Functional

| ID | Clause | 判定 |
| :-- | :-- | :-- |
| NFR-1 | 小幅平移不得重新取；縮放以停手後才回報一次為準 | ✅ conforms —— 前半由 AC-17 釘住；後半是 `KCandleChart.vue` 既有的等待機制，未改 |
| NFR-2 | 指標計算面板、其他頁面一字不受影響 | ✅ conforms —— 1899 個測試斷言全數未改即通過；指標面板那條讓使用者自己挑刻度的路未動 |

---

## 2. Orphans

| Behavior | Site | 判定 |
| :-- | :-- | :-- |
| `KCandleSeriesVo` | `vo/k-candle-series-vo.ts` | 非孤兒：AC-06 需要「K 線 ＋ 刻度」成對進入 domain |
| `aggregationIntervalOf` | `vo/aggregation-interval-vo.ts` | 非孤兒：AC-08 |
| `KCandleChartDto.visibleSpanMilliseconds` | `dto/k-candle-chart-dto.ts` | 非孤兒：BR-5 的長度比對讀它；由重構搬進來 |
| `seriesOf` 測試替身 | `tests/fixtures/k-candle-series.ts` | 測試用，非產品行為 |

**未發現任何實作 Out of Scope 項目的程式。** 特別確認：指標計算面板未動、無補洞、無造假 K 線、
畫面未維護休市日名單、畫面不再說出任何根數。

---

## 3. Summary

```
Contract verification complete for "圖表只說使用者在看哪一段".
Oracle: PRD Acceptance Criteria ＋ Business Rules ＋ NFR — 29 clauses.

✅ 27 conforms · 🔴 0 violations · 🟠 0 mis-asserted · 🟡 2 partial · ❌ 0 gaps · ❔ 0 unclear · ⚠️ 0 orphans
Conformance: 93%
```

**🟡 Partial：AC-09 與 AC-10**（台股週六按五天／盤後按一天看得到 K 線）。

程式對，但**沒有專屬測試**，原因是誠實的：這一側的測試都以 mock 的 proxy 回答，
所以「那一段裡真的有 K 線」在畫面這一側**證明不了**——它取決於後端照交易時段挑刻度、
以及儲存裡真的有那些 K 線。畫面這一側能證明的是「那五天不再被收成四百分鐘」，
而那已由 AC-03／AC-12 釘住（天花板存在時它們會失敗）。

**這兩條的真正歸屬在系統那一側**，那裡有對應的測試：
台股一週、什麼都不說 → 挑到五分鐘且不被拒絕。兩邊合起來才是完整的證明；
在畫面這一側再寫一次，只會是一個斷言 mock 內容的假測試。

---

## 4. 留給下一個人的兩件事

1. **`KCandleChartLoadPlanVo` 沒有刻度欄位，那是契約而非疏漏。**
   BR-1 全靠它成立。哪天有人為了「順手」把刻度加回去，**沒有任何測試會立刻紅**——
   要等到有人真的把它送出去，才會被 `k-candle-proxy.spec.ts` 那個整包 query 的斷言抓到。
   那個斷言是這條規則唯一的哨兵，**不要把它改成只檢查其中幾個欄位**。

2. **兩成半是代理指標，一千天是換算值。**
   前者代理的是「系統挑的刻度變沒變」，而畫面算不出那件事；
   後者是「系統一次答一千根 × 最粗的刻度一天一根」。
   **一千天與系統那側的一千根是兩份設定**，系統那邊調了，這裡要跟著改；
   忘了改的症狀是使用者拉遠時看到一句「區間過大」。
