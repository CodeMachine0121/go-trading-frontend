# Contract Traceability Matrix — K 線瀏覽

Contract: `PRD.md`
Design map: `ARCH.md`
Implementation: `app/domain/**`、`app/application/k-candle-application.ts`、`app/infrastructure/proxy/**`、`app/components/**`
Oracle: Acceptance Criteria（18 個情境）+ Core Business Rules（8 條）+ Non-Functional（4 條）

> 本表是**靜態符合性稽核**：分別判斷「測試有沒有斷言 oracle」與「程式碼有沒有產出 oracle」，
> 兩者都成立才算 conforms。它不執行自行發明的情境，也不以整套測試轉綠作為判定依據。

## Clauses

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-01 | 區間內有多根 K 線時由早到晚列出 | 三根依 10:00、10:05、10:10 排列，並顯示「共 3 根」 | `k-candle-service.ts:24`（排序）、`k-candle-search-result-dto.ts:11`（筆數）、`KCandleTable.vue:21` | `k-candle-service.spec.ts:33`、`KCandleTable.spec.ts:29`、`KCandleSearchPanel.spec.ts:59` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02 | 區間內只有一根 K 線 | 列出該根，顯示「共 1 根」 | 同 AC-01 | `k-candle-service.spec.ts:53`、`KCandleTable.spec.ts:29`（candleCount=1） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03 | 區間內沒有 K 線 | 顯示「查無 K 線」，且不出現任何錯誤訊息 | `k-candle-search-result-dto.ts:15`、`KCandleTable.vue:26` | `KCandleTable.spec.ts:45`、`KCandleSearchPanel.spec.ts:81` | asserts-oracle（另斷言 rejected-alert 不存在） | produces-oracle | ✅ conforms |
| AC-04 | 收盤價高於開盤價為上漲 | 該根標示為上漲 | `k-candle-domain.ts:20-21` | `k-candle-domain.spec.ts:23`、`KCandleTable.spec.ts:55` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05 | 收盤價低於開盤價為下跌 | 該根標示為下跌 | `k-candle-domain.ts:23-24` | 同上 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06 | 收盤價等於開盤價為持平 | 該根標示為持平 | `k-candle-domain.ts:26` | `k-candle-domain.spec.ts:23`（第三列） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-07 | 未指定交易標的 | 不進行查詢，提示「請指定交易標的」 | `k-candle-query-domain.ts:16-18` | `k-candle-query-domain.spec.ts:10`、`k-candle-service.spec.ts:75`（不去取資料）、`KCandleSearchPanel.spec.ts:91` | asserts-oracle（含「完全不去查詢」） | produces-oracle | ✅ conforms |
| AC-08 | 交易標的只填了空白字元 | 同 AC-07 | `k-candle-query-domain.ts:16`（先去空白） | `k-candle-query-domain.spec.ts:10`（第二列）、`KCandleSearchPanel.spec.ts:91`（第二列） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-09 | 結束時間早於開始時間 | 不進行查詢，提示「結束時間不得早於開始時間」 | `k-candle-query-domain.ts:21-22` | `k-candle-query-domain.spec.ts:27`、`KCandleSearchPanel.spec.ts:91`（第三列） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-10 | 開始時間與結束時間相同 | 視為合法並進行查詢 | `k-candle-query-domain.ts:21`（用 `<` 而非 `<=`） | `k-candle-query-domain.spec.ts:41`、`KCandleSearchPanel.spec.ts:109`（斷言確實查詢一次） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-11 | 查詢區間過大被系統拒絕 | 顯示後端原文「時間區間過大，請縮小區間（單次最多 1000 根）」，且不顯示任何 K 線 | `backend-api-proxy.ts:40-46`、`KCandleSearchPanel.vue:64-65` | `k-candle-proxy.spec.ts:61`、`k-candle-application.spec.ts:92`、`KCandleSearchPanel.spec.ts:121` | asserts-oracle（原文 + 無資料列） | produces-oracle | ✅ conforms |
| AC-12 | 後端沒有啟動 | 顯示連不上後端與重試方式，且不顯示任何 K 線 | `backend-api-proxy.ts:49`、`KCandleSearchPanel.vue:67-68`＋重試按鈕 | `k-candle-proxy.spec.ts:84`、`KCandleSearchPanel.spec.ts:137` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-18 | 其他未預期的失敗 | 顯示「查詢時發生未預期的錯誤。」，且不顯示任何 K 線 | `KCandleSearchPanel.vue:70-71` | `KCandleSearchPanel.spec.ts:149` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-7 | 交易標的正規化：前後空白去掉後才拿去查詢 | `  BTCUSDT  ` 送出時查的是 `BTCUSDT` | `k-candle-query-domain.ts:16` | `k-candle-service.spec.ts:85`、`k-candle-query-domain.spec.ts:50` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-8 | 拒絕原因的退路：系統沒附原因時退而顯示該次失敗本身的說明 | 後端回 500 但沒有 message 時，仍顯示得出原因 | `backend-api-proxy.ts:41-46` | `k-candle-proxy.spec.ts:74` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-13 | 失敗後再次查詢成功 | 顯示這次的結果，先前錯誤訊息不再出現 | `KCandleSearchPanel.vue:41-45`（送出前清空） | `KCandleSearchPanel.spec.ts:160` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-14 | 查詢進行中 | 呈現載入中，送出按鈕不可再次觸發 | `KCandleSearchPanel.vue:40`＋`KCandleQueryForm.vue:81` | `KCandleSearchPanel.spec.ts:178`、`KCandleQueryForm.spec.ts:25` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-15 | 查詢結束 | 載入狀態結束，送出按鈕恢復可用 | `KCandleSearchPanel.vue:75`（finally） | `KCandleQueryForm.spec.ts:33`、`KCandleSearchPanel.spec.ts:59`（結束後可見結果） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-16 | 進入畫面時的預設區間 | 目前時間 2026-08-30 12:00 時，起訖預設為 2026-08-29 12:00 與 2026-08-30 12:00 | `k-candle-service.ts:34-38`、`KCandleSearchPanel.vue:32-36` | `k-candle-service.spec.ts:107`（假時鐘）、`KCandleSearchPanel.spec.ts:49` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-17 | 使用者改過的區間不被預設值覆蓋 | 以使用者輸入的區間查詢 | `KCandleSearchPanel.vue:32`（只在 onMounted 取一次） | `KCandleSearchPanel.spec.ts:59`（改結束時間後斷言查詢用的是 18:30） | asserts-oracle | produces-oracle | ✅ conforms |
| BR-1 | 排序：結果一律依起始時間由早到晚呈現 | 亂序取回也必須由早到晚 | `k-candle-service.ts:24-26` | `k-candle-service.spec.ts:33`、`k-candle-application.spec.ts:37` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-2 | 漲跌：收 − 開，>0 上漲、<0 下跌、=0 持平 | 三種語氣分別對應三種標示 | `k-candle-domain.ts:15-27` | `k-candle-domain.spec.ts:23`、`:35`（漲跌幅數值） | asserts-oracle | produces-oracle | ✅ conforms |
| BR-3 | 條件合法性：標的去空白後不得為空；結束不得早於開始；相等為合法 | 三條規則同時成立 | `k-candle-query-domain.ts:15-27` | `k-candle-query-domain.spec.ts:10/27/41/50` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-4 | 時間基準：輸入與呈現一律世界標準時間並明確標示 | 送出的起訖為 UTC；畫面標示 UTC | `k-candle-proxy.ts:32-33`（`toISOString`）、`utc-time-format.ts`、`KCandleQueryForm.vue:55/67`（標示）、`KCandleTable.vue:78` | `k-candle-proxy.spec.ts:33`、`KCandleTable.spec.ts:70`、`KCandleSearchPanel.spec.ts:59` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-5 | 查詢區間顆粒度：起訖可精確到分鐘，不必對齊五分鐘刻度 | 10:07 這種時間也能查詢 | `KCandleQueryForm.vue:60/73`（分鐘精度輸入）、`k-candle-query-domain.ts`（無刻度檢查） | `KCandleSearchPanel.spec.ts:121`（以 10:07 → 11:23 送出並斷言查詢條件） | asserts-oracle | produces-oracle | ✅ conforms |
| BR-6 | 預設區間：目前時間往前二十四小時到目前時間，使用者調整後以其輸入為準 | 同 AC-16 + AC-17 | `k-candle-service.ts:7/34-38` | `k-candle-service.spec.ts:107`、`KCandleSearchPanel.spec.ts:49/59` | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-1 | 單次最多 1000 根；一千列須維持可捲動可讀，不做分頁 | 表格自身水平捲動、無分頁控制項 | `KCandleTable.vue:131-132`（`overflow-x: auto`）；上限由後端判定，前端不硬編 | — | no-test（樣式與版面，不在測試範圍） | produces-oracle | 🟡 partial |
| NFR-2 | 無登入機制；不在畫面上保存任何資料，重新整理回到預設狀態 | 無任何瀏覽器儲存、無鑑權 | 全專案無 `localStorage`／`sessionStorage`／token（ESLint `data-access-boundary` 把關） | — | no-test | produces-oracle | 🟡 partial |
| NFR-3 | 桌機瀏覽器最新版；不特別支援行動裝置版面 | 版面在窄螢幕不保證最佳，但不破版 | `KCandleQueryForm.vue`（`respond-to('md')` 單欄→四欄） | — | no-test | produces-oracle | 🟡 partial |
| NFR-4 | 無分析追蹤 | 不送出任何追蹤事件 | 全專案無追蹤程式碼 | — | no-test | produces-oracle | 🟡 partial |

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| `KCandleQueryForm.vue:78-86` | 交易標的提供 BTCUSDT／ETHUSDT 常用選項 | 有據——PRD §5「Key Interactions」與 §8 的 Open Decision 裁決明列 |

> 沒有任何一項落在 Out of Scope（圖表、增刪改、指標計算、分頁、排序切換、條件記憶、在地時區）。

## Summary

- Conforms: 26/30 clauses ✅（86.7%）
- Violations: 無
- Mis-asserted: 無
- Partial: NFR-1、NFR-2、NFR-3、NFR-4（皆為非功能性約束，以設定與版面滿足，不以單元測試斷言；
  這是刻意的——為版面斷言 class 名稱等於測試實作細節，違反本專案的測試規範）
- Gaps: 無
- Unclear: 無
- Orphans: 1（有據）

### 本次稽核造成的修正

1. **BR-5（原 🟠 mis-asserted）**：補上以 `10:07 → 11:23` 送出查詢的案例，
   真的證明查詢條件不檢查五分鐘刻度。
2. **原本的三項 orphan**：把「未預期的失敗」「交易標的去空白」「拒絕原因的退路」
   三項防禦性行為補進 PRD（AC-18、BR-7、BR-8），讓契約與程式碼不再漂移。
