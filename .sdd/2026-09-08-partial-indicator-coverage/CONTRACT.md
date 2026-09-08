# Contract Traceability Matrix — 指標畫不滿時該說什麼

Contract: `PRD.md`
Design map: `ARCH.md`
Implementation: `app/domain/`、`app/infrastructure/proxy/`、`app/components/organisms/`
Oracle: Acceptance Criteria（15 個情境）＋ Core Business Rules（4 條）＋ Non-Functional（1 條）＝ 20 clauses

> 第一輪稽核找出 1 個 mis-asserted 與 3 個 orphan，全部已處理：
> 補上「要得太多那句話不提相反方向」的斷言，並把三個 orphan 收進 PRD 的 Edge Cases。本表為處理後的狀態。

> **審核天花板**：這是一次**靜態**契約稽核。它拿 PRD 的預期結果分別去對照測試斷言與程式路徑，
> **不執行自己發明的情境**。判定一律來自與 oracle 的比對，不是來自紅綠。

## Clauses

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-01.1 | 湊得出的根數足夠畫滿 | 線畫滿整段；那一列**沒有**任何說明文字 | 既有（計算成功 → 那一列的說明為 `null`） | `KCandleChartPanelIndicators.spec.ts`「畫滿了：那一列沒有任何說明」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.2 | 只畫得到一半時照樣不出聲 | 線從歷史開始的地方畫起、短一截；那一列**沒有**任何說明文字 | 既有：說明為 `null`；短一截由 `chart-indicator-domain.ts:115`（依回報的起始時間對位）達成 | 沉默：同檔「只畫得到一半：那一列照樣沒有任何說明」；短一截：`chart-indicator-domain.spec.ts:110`（較短的一串值落在較晚的那幾根上） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.3 | 線上只有一個點時也不出聲 | 圖上有它；那一列沒有任何說明文字 | 既有 | 同檔「線上只有一個點：照樣沒有任何說明，而它在圖上」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.4 | 一支畫得滿、一支畫不滿時各自照舊 | 兩條線都在圖上、長度各自不同；**兩列**都沒有說明文字 | 既有（`use-chart-indicators.ts` 逐支持有狀態） | 同檔「一支畫得滿、一支畫不滿：兩列都沒有說明，兩條線都在圖上」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.5 | 畫不滿的那一支後來畫得滿了 | 線變長；那一列**前後**都沒有說明文字 | 既有（換標的 → 重算） | 同檔「畫不滿的那一支後來畫得滿了：前後都沒有說明」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.1 | 連一個值都算不出來時就地說明並給出路 | 圖上沒有它的線；那一列說出 19 與 20，並提示改用細一點的刻度或補歷史 | `backend-api-proxy.ts:110` → `indicator-calculation-proxy.ts:123-126` → `candle-coverage-shortfall-domain.ts` | 訊息內容：`candle-coverage-shortfall-domain.spec.ts`（兩個數字＋兩條出路）；那一列呈現它：`KCandleChartPanelIndicators.spec.ts`「那一列說出系統給的原因」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.2 | 要得太多是另一句話，出路相反 | 那一列提示縮短區間或改用**粗**一點的刻度；**且不提示改用細一點的** | 既有 `indicator-calculation-proxy.ts` 的「`field` 是根數」那一條分流（一字不動） | `indicator-calculation-proxy.spec.ts`「系統指名是根數那一格時…」——斷言含「縮短」「粗一點」，**且不含**「拉近」「細」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.3 | 一支算不出來不影響另一支 | 算不出來那支無線且有說明；另一支有線且**沒有**說明 | 既有（逐支持有失敗訊息） | 同檔「一支算不出來不影響畫不滿的那一支」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.4 | 算不出來的那一支留在清單上，換了資料再試 | 它跟著重算；說明消失、線出現 | 既有（`calculateOne` 成功時 `forgetFailure`） | 同檔「算不出來的那一支留在清單上，換了資料就再試一次」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.5 | 上一輪畫得到一半、這一輪算不出來 | 上一輪那條線被收掉；那一列改為顯示兩個數字 | 既有（失敗時收掉該支上一輪的線） | 同檔「上一輪畫得到一半、這一輪算不出來：舊線收掉，換成說明」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03.1 | 填滿了就不多說什麼 | 顯示指標名稱與數值、顯示實際採用 119 根；**不出現**任何沒畫滿的說明 | `indicator-calculation-domain.ts:85`（回 `null`） | `IndicatorCalculationPanel.spec.ts`「畫滿了就不出現那一句」＋`indicator-calculation-domain.spec.ts`「畫滿了就不多說什麼」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03.2 | 畫不滿時明白說出兩個數字 | 顯示指標名稱與數值；並明白說出需要 119 根、只湊得出 50 根 | `indicator-calculation-domain.ts:85` → `indicator-calculation-result-dto.ts:34` → `IndicatorCalculationPanel.vue:588` | `IndicatorCalculationPanel.spec.ts`「沒畫滿時說出需要幾根與只湊得出幾根」＋「結果照樣顯示——沒畫滿不是失敗」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03.3 | 連一個值都算不出來時整次拒絕 | 不顯示任何指標名稱與數值；說明湊得出幾根與至少要幾根 | `indicator-calculation-proxy.ts:123-126` | `IndicatorCalculationPanel.spec.ts`「連一個值都算不出來時整次拒絕,不顯示任何結果」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04.1 | 兩個數字照抄 | 畫面說的是 119 與 50，不是 100 也不是 69 | `indicator-calculation-proxy.ts:106`（原樣收下）＋`indicator-calculation-domain.ts:85`（只比較，不推算） | `indicator-calculation-domain.spec.ts`「兩個數字照抄，不自己算」（明白斷言不含 100 與 69）＋`indicator-calculation-proxy.spec.ts`「照系統說的收下來」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04.2 | 系統沒說「填滿要幾根」時不猜 | 照樣顯示指標名稱與數值；**不出現**那句話，也不自行推算 | `indicator-calculation-proxy.ts:106`（`?? null`）＋`indicator-calculation-domain.ts:85`（`null` 一律回 `null`） | `indicator-calculation-domain.spec.ts`「系統沒說填滿要幾根時不猜」＋`IndicatorCalculationPanel.spec.ts`「系統沒說填滿要幾根時不猜,那一句不出現」＋`indicator-calculation-proxy.spec.ts`「系統沒說的時候是「沒說」，不是零」 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-1 | 畫不滿不是失敗。圖表上不出聲；指標計算畫面上明講 | 兩個畫面行為相反且都成立 | 圖表：既有（無變更）；畫面：`IndicatorCalculationPanel.vue:588` | 圖表：US-01 五條；畫面：AC-03.1／03.2 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-2 | 兩種根數不足必須講成兩句不同的話；分辨依據是回應帶了哪個值，不是訊息文字 | 兩句話不同；辨識靠值 | `indicator-calculation-proxy.ts:123`（判 `candleCoverageShortfall` 是否存在）vs 既有的判 `field` | `indicator-calculation-proxy.spec.ts`「翻成標在「要看多長」旁邊的說明」＋「出路與「要得太多」那一句相反」＋「只帶半組數字時不當成這一種」 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-3 | 兩個數字一律照抄系統回報的，畫面不自行推算 | 不重算那條式子 | `indicator-calculation-domain.ts:85`（只讀 entity 上那兩個值） | `indicator-calculation-domain.spec.ts`「兩個數字照抄，不自己算」 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-4 | 一支的狀態不影響另一支 | 各自獨立 | 既有（`use-chart-indicators.ts` 以每一次套用的序號為鍵） | `KCandleChartPanelIndicators.spec.ts`「一支畫得滿、一支畫不滿」＋「一支算不出來不影響畫不滿的那一支」 | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-1 | 回報項目只增不減，舊的回應也要能顯示 | 少了「填滿要幾根」時那句話不出現，其餘照舊 | `indicator-calculation-proxy.ts:106`（`wire.candleCount` 為選擇性）＋entity 尾端預設 `null` | `indicator-calculation-proxy.spec.ts`「系統沒說的時候是「沒說」，不是零」；另有 1873 個既有測試未改動仍全綠（52 處 entity 建構未帶這個值） | asserts-oracle | produces-oracle | ✅ conforms |

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| — | 第一輪的三個 orphan 都已收進 PRD 的 Edge Cases（實際採用比要的多、信號種類下照樣說、只交出半組數字） | 已解決 |

沒有任何一項落在 **Out of Scope** 上——特別是**沒有**出現「跳到算得出來的彙總刻度」那顆按鈕。

## Summary

- Conforms: 20/20 clauses ✅（100%）
- Violations: 無
- Mis-asserted: 無
- Partial: 無
- Gaps: 無
- Unclear: 無
- Orphans: 0
