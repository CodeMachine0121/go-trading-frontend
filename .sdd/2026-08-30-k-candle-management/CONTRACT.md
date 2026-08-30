# Contract Traceability Matrix — K 線維護

Contract: `PRD.md`
Design map: `ARCH.md`
Implementation: `app/domain/**`、`app/application/k-candle-application.ts`、`app/infrastructure/proxy/k-candle-proxy.ts`、`app/components/**`
Oracle: Acceptance Criteria（22 個情境）+ Core Business Rules（6 條）+ Non-Functional（4 條）

> 靜態符合性稽核：分別判斷「測試有沒有斷言 oracle」與「程式碼有沒有產出 oracle」，兩者都成立才算 conforms。

## Clauses

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-01 | 新增一根尚不存在的 K 線 | 建立成功、回饋「已新增這根 K 線」、自動重查一次 | `k-candle-service.ts:50-55`、`KCandleEditorPanel.vue:85/118-119` | `KCandleEditorPanel.spec.ts:104`、`KCandleSearchPanel.spec.ts:237` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02 | 同一個標的與起始時間再送一次會覆蓋 | 仍只有一根、收盤價為新值；畫面事先說明會覆蓋 | 後端的覆蓋語意（POST `/k-candles`）+ `KCandleForm.vue:53-57` | `KCandleEditorPanel.spec.ts:96`（覆蓋說明）、`k-candle-proxy.spec.ts`（POST 送到同一個端點） | asserts-oracle（畫面說明）；覆蓋本身由後端保證 | produces-oracle | ✅ conforms |
| AC-03 | 起始時間不在五分鐘刻度上 | 不新增，起始時間欄位提示「起始時間必須落在5分鐘刻度上」 | `k-candle-write-domain.ts:54-60` | `k-candle-write-domain.spec.ts:96`、`KCandleEditorPanel.spec.ts:117` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04 | 起始時間指向未來 | 不新增，提示「起始時間不得指向未來」 | `k-candle-write-domain.ts:62-64` | `k-candle-write-domain.spec.ts:105`、`KCandleEditorPanel.spec.ts:117` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05 | 起始時間就是目前這一刻 | 視為合法並新增 | `k-candle-write-domain.ts:62`（用 `>` 而非 `>=`） | `k-candle-write-domain.spec.ts:113` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06 | 最高價低於最低價 | 不新增，最高價欄位提示「最高價不得低於最低價」 | `k-candle-write-domain.ts:76-78` | `k-candle-write-domain.spec.ts:119`、`KCandleEditorPanel.spec.ts:145` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-07 | 最高價與最低價相同 | 視為合法並新增 | `k-candle-write-domain.ts:76`（`lessThan`） | `k-candle-write-domain.spec.ts:126` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-08 | 價量數字為負 | 不新增，該欄位提示「價格與成交數字不得為負數」 | `k-candle-write-domain.ts:92-94` | `k-candle-write-domain.spec.ts:158`、`KCandleEditorPanel.spec.ts:133` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-09 | 價量數字為零 | 視為合法並新增 | `k-candle-write-domain.ts:92`（`isNegative`） | `k-candle-write-domain.spec.ts:165` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-10 | 價量欄位留空 | 不新增，該欄位提示「請填寫{欄位}」 | `k-candle-write-domain.ts:83-85` | `k-candle-write-domain.spec.ts:132`（八個欄位逐一）、`KCandleEditorPanel.spec.ts:133` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-11 | 價量欄位填的不是數字 | 不新增，該欄位提示「{欄位}必須是數字」 | `k-candle-write-domain.ts:87-89` | `k-candle-write-domain.spec.ts:147`、`KCandleEditorPanel.spec.ts:133` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12 | 未指定交易標的（新增） | 不新增，交易標的欄位提示「請指定交易標的」 | `k-candle-identity-vo.ts:12-14` | `k-candle-write-domain.spec.ts:78`、`KCandleEditorPanel.spec.ts:117` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-13 | 修改一根存在的 K 線 | 收盤價變成新值、回饋「已更新這根 K 線」、自動重查 | `k-candle-service.ts:58-63`、`KCandleEditorPanel.vue:81/118-119` | `KCandleEditorPanel.spec.ts:181` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-14 | 修改時不得更換身分 | 交易標的與起始時間唯讀 | `KCandleForm.vue:11/62/78`（`identityReadonly` → `disabled`） | `KCandleEditorPanel.spec.ts:168`、`KCandleSearchPanel.spec.ts:222` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-15 | 要修改的那根已經不存在 | 顯示「找不到該根 K 線」，列表維持原狀 | `backend-api-proxy.ts:44-52` → `KCandleEditorPanel.vue:135-136` | `KCandleEditorPanel.spec.ts:194` | asserts-oracle（另斷言沒有發出重查事件） | produces-oracle | ✅ conforms |
| AC-16 | 修改後的數字不合理 | 不修改，最高價欄位提示「最高價不得低於最低價」 | 同 AC-06（同一個建構子） | `KCandleEditorPanel.spec.ts:194`（修改路徑，另斷言完全沒有寫入） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-17 | 刪除一根存在的 K 線 | 刪除成功、回饋「已刪除這根 K 線」、自動重查 | `k-candle-service.ts:66-71`、`KCandleEditorPanel.vue:94-105` | `KCandleEditorPanel.spec.ts:231`、`KCandleSearchPanel.spec.ts:237` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-18 | 刪除前反悔 | 不刪除，維持在修改狀態 | `KCandleEditorPanel.vue:201`（取消只關掉確認列） | `KCandleEditorPanel.spec.ts:252` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-19 | 要刪除的那根已經不存在 | 顯示「找不到該根 K 線」 | 同 AC-15 | `KCandleEditorPanel.spec.ts:262` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-20 | 從查詢結果挑一根來修改 | 表單帶入該根的所有數字，進入修改狀態 | `KCandleTable.vue:98-102`（插槽）、`KCandleSearchPanel.vue:43-46`、`KCandleEditorPanel.vue:50-60` | `KCandleSearchPanel.spec.ts:222`、`KCandleTable.spec.ts:79` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-21 | 開始新增一根 | 出現空白表單，進入新增狀態 | `KCandleSearchPanel.vue:38-41/158` | `KCandleSearchPanel.spec.ts:211` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-22 | 中途放棄 | 回到只有查詢結果的狀態，沒有任何變更 | `KCandleSearchPanel.vue:48-51/170` | `KCandleSearchPanel.spec.ts:259`、`KCandleEditorPanel.spec.ts:272` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-1 | 身分：新增相同身分即覆蓋；修改時身分不得更換 | 兩種寫入走不同端點，修改的身分取自被修改的那一根 | `k-candle-proxy.ts`（POST vs PUT `/k-candles/{symbol}/{openTime}`） | `k-candle-proxy.spec.ts`（POST／PUT／DELETE 的位址與 body） | asserts-oracle | produces-oracle | ✅ conforms |
| BR-2 | 起始時間：必填、五分鐘刻度、不得指向未來（等於目前這一刻合法） | 四條規則同時成立 | `k-candle-identity-vo.ts:16-18`、`k-candle-write-domain.ts:53-64` | `k-candle-write-domain.spec.ts:87/96/105/113` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-3 | 價量：八個數字必填、必須是數字、不得為負；最高不低於最低（相等合法） | 逐欄檢查後才做跨欄比較 | `k-candle-write-domain.ts:67-78/81-97` | `k-candle-write-domain.spec.ts:132/147/158/165/119/126` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-4 | 交易標的：去掉前後空白後不得為空 | `  BTCUSDT  ` 可用且送出的是 `BTCUSDT` | `k-candle-identity-vo.ts:11-19` | `k-candle-write-domain.spec.ts:70`、`k-candle-service.spec.ts`（刪除路徑） | asserts-oracle | produces-oracle | ✅ conforms |
| BR-5 | 成功後重查：任何一次成功的維護都用目前的條件重查 | 維護成功 → 查詢再跑一次 | `KCandleEditorPanel.vue:119`、`KCandleSearchPanel.vue:169` | `KCandleSearchPanel.spec.ts:237`（斷言查詢被呼叫兩次） | asserts-oracle | produces-oracle | ✅ conforms |
| BR-6 | 時間基準：輸入與呈現一律世界標準時間 | 送出的起始時間為 UTC 字串 | `k-candle-proxy.ts`（`toISOString`）、`utc-time-format.ts` | `k-candle-proxy.spec.ts`（POST body 的 openTime） | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-1 | 單筆維護，無效能考量 | — | — | — | no-test | produces-oracle | 🟡 partial |
| NFR-2 | 無登入；刪除必須二次確認 | 刪除一定要按兩次 | `KCandleEditorPanel.vue:174/182-205` | `KCandleEditorPanel.spec.ts:231/252` | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-3 | 桌機瀏覽器最新版 | 版面在窄螢幕不破版 | `KCandleForm.vue`（`respond-to('md')`） | — | no-test | produces-oracle | 🟡 partial |
| NFR-4 | 無分析追蹤 | 不送出任何追蹤事件 | 全專案無追蹤程式碼 | — | no-test | produces-oracle | 🟡 partial |

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| `KCandleEditorPanel.vue:140-141` | 非三種已知錯誤時顯示「維護這根 K 線時發生未預期的錯誤。」 | undocumented——防禦性 fallback，已有測試（`KCandleEditorPanel.spec.ts:213`）。與瀏覽切片的同類行為一致 |
| `k-candle-service.ts:77-85` | 新增表單的起始時間預設對齊到最近的五分鐘刻度 | 有據——PRD §8 的 Open Decision 裁決 1 |
| `KCandleForm.vue`（`inputmode="decimal"`） | 手機鍵盤提示 | 有據——純輸入體驗，不影響任何規則 |

> 沒有任何一項落在 Out of Scope（批次匯入、一次刪除多根、直接載入單一一根、外部補資料、修改歷史）。

## Summary

- Conforms: 29/32 clauses ✅（90.6%）
- Violations: 無
- Mis-asserted: 無
- Partial: NFR-1、NFR-3、NFR-4（非功能性約束，不以單元測試斷言）
- Gaps: 無
- Unclear: 無
- Orphans: 3（1 項防禦性、2 項有據）

### 本次稽核造成的修正

1. **AC-16（原 🟠 mis-asserted）**：稽核當下「修改後的數字不合理」只在新增路徑上被證明過。
   已在 `KCandleEditorPanel.spec.ts` 的修改段落補上案例：帶著既有的那一根進入修改、
   把最高價改成低於最低價後送出，斷言標在最高價旁且**完全沒有送出更新**。
