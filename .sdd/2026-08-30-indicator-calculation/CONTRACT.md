# Contract Traceability Matrix — 指標計算

Contract: `PRD.md`
Design map: `ARCH.md`
Implementation: `app/domain/**`、`app/application/indicator-calculation-application.ts`、`app/infrastructure/proxy/indicator-calculation-proxy.ts`、`app/components/**`
Oracle: Acceptance Criteria（22 個情境）+ Core Business Rules（7 條）+ Non-Functional（4 條）

> 靜態符合性稽核：分別判斷「測試有沒有斷言 oracle」與「程式碼有沒有產出 oracle」，兩者都成立才算 conforms。

## Clauses

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-01 | 算出單一個指標 | 顯示「實際採用 3 根」與「均價 110」 | `indicator-calculation-proxy.ts:42-47`、`IndicatorCalculationPanel.vue:203/235` | `IndicatorCalculationPanel.spec.ts:56`、`indicator-calculation-service.spec.ts:17` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02 | 算出多個指標 | 兩個指標都列出來 | 同上 | `IndicatorCalculationPanel.spec.ts:56`（兩列） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03 | 算式沒有算出任何指標 | 顯示「這次沒有算出任何指標」，不呈現錯誤 | `indicator-calculation-result-dto.ts:14`、`IndicatorCalculationPanel.vue:212` | `IndicatorCalculationPanel.spec.ts:75`、`indicator-calculation-proxy.spec.ts`（空的與 `null` 兩種形狀） | asserts-oracle（另斷言兩種錯誤區塊都不存在） | produces-oracle | ✅ conforms |
| AC-04 | 指標一律依名稱排序呈現 | 「均價」「最低」「最高」的順序固定 | `indicator-calculation-domain.ts:18` | `indicator-calculation-domain.spec.ts:8`、`IndicatorCalculationPanel.spec.ts:56` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05 | 畫面說明計算會排除最新一根 | 畫面寫著計算一律排除最新一根 | `IndicatorCalculationPanel.vue:82` | `IndicatorCalculationPanel.spec.ts:50` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06 | 未指定交易標的 | 不計算，交易標的欄位提示「請指定交易標的」 | `indicator-calculation-request-domain.ts:20-22` | `indicator-calculation-request-domain.spec.ts:38`、`IndicatorCalculationPanel.spec.ts:85` | asserts-oracle（另斷言完全沒有執行） | produces-oracle | ✅ conforms |
| AC-07 | 計算根數為零 | 不計算，提示「計算根數必須大於零」 | `indicator-calculation-request-domain.ts:38-40` | `indicator-calculation-request-domain.spec.ts:48`、`IndicatorCalculationPanel.spec.ts:85` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-08 | 計算根數為負 | 同上 | `indicator-calculation-request-domain.ts:29-35` | 同上 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-09 | 計算根數不是整數 | 不計算，提示「計算根數必須是整數」 | `indicator-calculation-request-domain.ts:29-35` | `indicator-calculation-request-domain.spec.ts:57`、`IndicatorCalculationPanel.spec.ts:85` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-10 | 計算根數留空 | 不計算，提示「請填寫計算根數」 | `indicator-calculation-request-domain.ts:25-27` | `indicator-calculation-request-domain.spec.ts:66`、`IndicatorCalculationPanel.spec.ts:85` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-11 | 計算根數為一 | 視為合法並計算 | `indicator-calculation-request-domain.ts:38`（`<= 0` 才拒絕） | `indicator-calculation-request-domain.spec.ts:73`、`IndicatorCalculationPanel.spec.ts:101` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12 | 算式留空 | 不計算，提示「請填寫指標算式」 | `indicator-calculation-request-domain.ts:43-45` | `indicator-calculation-request-domain.spec.ts:80`、`IndicatorCalculationPanel.spec.ts:85` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-13 | 可用的 K 線不足 | 以「請求的問題」呈現後端原文，不顯示任何指標 | `backend-api-proxy.ts` → `IndicatorCalculationPanel.vue:162` | `IndicatorCalculationPanel.spec.ts:126`、`indicator-calculation-proxy.spec.ts`（400 維持一般拒絕） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-14 | 計算根數超過單次上限 | 以「請求的問題」呈現後端原文 | 同 AC-13（前端不硬編上限） | `IndicatorCalculationPanel.spec.ts:126`（兩種拒絕訊息各跑一次） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-15 | 算式無法解讀 | 以「算式的問題」呈現，明確指出要改的是算式 | `indicator-calculation-proxy.ts:52-54`、`IndicatorCalculationPanel.vue:154` | `IndicatorCalculationPanel.spec.ts:113`、`indicator-calculation-proxy.spec.ts`（422 → 算式錯誤） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-16 | 算式試圖取用不該取用的東西 | 以「算式的問題」呈現 | 同 AC-15（同一個狀態碼） | 同 AC-15 | asserts-oracle（同一條翻譯路徑，訊息由後端提供） | produces-oracle | ✅ conforms |
| AC-17 | 算式算太久被中止 | 以「算式的問題」呈現 | 同 AC-15 | 同 AC-15 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-22 | 後端自己出錯 | 說明是後端出錯、不是使用者的請求有問題，並提供重試 | `backend-api-proxy.ts`（5xx → `BackendServerError`）、`IndicatorCalculationPanel.vue` | `IndicatorCalculationPanel.spec.ts`（另斷言不是「請求的問題」也不是「算式的問題」）、`backend-health-proxy.spec.ts`、`k-candle-proxy.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-18 | 後端沒有啟動 | 顯示連不上後端與重試方式 | `backend-api-proxy.ts` → `IndicatorCalculationPanel.vue:170` | `IndicatorCalculationPanel.spec.ts:139`、`indicator-calculation-proxy.spec.ts`（無回應） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-19 | 帶入範例算式 | 算式欄位填入可直接執行的範例 | `indicator-calculation-service.ts:44-46`、`IndicatorCalculationPanel.vue:143` | `IndicatorCalculationPanel.spec.ts:191`、`indicator-calculation-service.spec.ts:45` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-20 | 計算進行中 | 呈現計算中，執行按鈕不可再觸發 | `IndicatorCalculationPanel.vue:43/188` | `IndicatorCalculationPanel.spec.ts:177` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-21 | 失敗後再次計算成功 | 顯示這次的結果，先前錯誤消失 | `IndicatorCalculationPanel.vue:43-49`（每次送出前清空） | `IndicatorCalculationPanel.spec.ts:160` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-1 | 排除最新一根，畫面必須說明 | 畫面寫明這件事（規則本身由後端執行） | `IndicatorCalculationPanel.vue:82` | `IndicatorCalculationPanel.spec.ts:50` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-2 | 輸入合法性：標的非空、根數為大於零的整數、算式非空 | 三條規則同時成立 | `indicator-calculation-request-domain.ts:19-46` | `indicator-calculation-request-domain.spec.ts` 全檔 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-3 | 上限不寫在前端 | 前端沒有任何硬編的根數上限 | `indicator-calculation-request-domain.ts`（無上限檢查，註解說明原因） | `indicator-calculation-request-domain.spec.ts:73`（根數 30 也照樣通過驗證） | asserts-oracle | produces-oracle | ✅ conforms |
| BR-4 | 結果排序，且與執行環境無關 | 同一組結果在哪裡都排出同樣的順序 | `indicator-calculation-domain.ts:16-19`（碼位比較，不用依語系而變的比較） | `indicator-calculation-domain.spec.ts:8` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-5 | 空結果是合法結果 | 空的一組不當成錯誤 | `indicator-calculation-result-dto.ts:14`、`indicator-calculation-proxy.ts:46` | `IndicatorCalculationPanel.spec.ts:75`、`indicator-calculation-proxy.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-6 | 失敗分四類 | 請求的問題、算式的問題、後端出錯、連不上，呈現方式各不相同 | `indicator-calculation-proxy.ts:52-54`、`IndicatorCalculationPanel.vue:154/162` | `IndicatorCalculationPanel.spec.ts:113/126`（互斥斷言） | asserts-oracle | produces-oracle | ✅ conforms |
| BR-7 | 不留存 | 結果與算式都不保存 | 全專案無瀏覽器儲存（ESLint 把關） | — | no-test | produces-oracle | 🟡 partial |
| NFR-1 | 計算可能數十秒，進行中的回饋是必要的 | 進行中有明顯狀態 | `IndicatorCalculationPanel.vue:188` | `IndicatorCalculationPanel.spec.ts:177` | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-2 | 前端不執行任何使用者提供的程式碼 | 算式只被當成字串送出 | `indicator-calculation-proxy.ts:34-38`（只放進 body） | `indicator-calculation-proxy.spec.ts`（斷言算式原封送出） | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-3 | 桌機瀏覽器最新版 | 版面在窄螢幕不破版 | `IndicatorCalculationPanel.vue`（`respond-to('md')`） | — | no-test | produces-oracle | 🟡 partial |
| NFR-4 | 無分析追蹤 | 不送出任何追蹤事件 | 全專案無追蹤程式碼 | — | no-test | produces-oracle | 🟡 partial |

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| `IndicatorCalculationPanel.vue:76-77` | 非四種已知錯誤時顯示「執行計算時發生未預期的錯誤。」 | undocumented——防禦性 fallback，已有測試（`IndicatorCalculationPanel.spec.ts:150`） |
| `indicator-calculation-proxy.ts:46`（`values ?? {}`） | 後端把「沒有任何指標」表達成整段缺席（`null`）時，仍視為一次成功的計算 | 有據——已補進 PRD 的業務規則「空結果是合法結果」 |
| `IndicatorCalculationPanel.vue`（標的預設 BTCUSDT、根數預設 20） | 進畫面時的預設值 | undocumented——純便利性，不影響任何規則 |

> 沒有任何一項落在 Out of Scope（儲存算式、語法高亮、前端執行算式、結果圖表、一次算多個標的）。

## Summary

- Conforms: 29/33 clauses ✅（87.9%）
- Violations: 無
- Mis-asserted: 無
- Partial: BR-7、NFR-3、NFR-4（以設定與版面滿足，不以單元測試斷言）
- Gaps: 無
- Unclear: 無
- Orphans: 2（1 項防禦性 fallback，1 項純便利性）

### PR review 抓到、稽核當時沒抓到的兩個缺陷

1. **根數的錯誤訊息會給出無意義的建議**（LOW）。訊息原本依「看起來像不像整數」決定，
   於是 `20.0`（解讀出來是整數 20）會被告知「計算根數必須大於零」——一個正整數卻被說成不大於零，
   使用者無從猜出真正的規則。`+20`、`1e3`、`0x10` 同樣中招。
   已改成依**解讀出來的值**決定訊息，並補上四個案例。
2. **後端自己出錯被說成「請求的問題」**（LOW）。後端對非驗證、非算式的失敗回 5xx
   （例如讀不到資料），而前端把所有帶回應的失敗都當成「請求被拒絕」，
   使用者會一直修一份從來沒錯的請求。已在 `BackendApiProxy` 把 5xx 翻譯成新的
   `BackendServerError`，三個面板都改成明確說「不是你的內容有問題」並提供重試。
   這條修正同時改善了先前兩個切片（查詢與維護），兩份 PRD 的邊界情況一併補上。

另有一項 review 註記：指標排序的比較函式在名稱相同時沒有回傳 0（技術上不一致，
但今日不可能發生，因為名稱來自一組鍵值）。已改成三向比較。
**這是唯一一個突變測試抓不到的修正**——排序在可觸及的輸入上兩種寫法輸出相同，
它靠的是讀程式碼而不是靠測試守住；保留同名指標的測試作為意圖的記錄。

### 本次稽核造成的修正

1. **AC-14（原 🟠 mis-asserted）**：補上以「超過單次上限」的拒絕訊息再跑一次的案例，
   證明它同樣落在「請求的問題」而不是「算式的問題」。
2. **Orphan（`values` 整段缺席）**：把「系統把沒有任何指標表達成一段空的、或整段缺席，
   兩者都是同一件事」補進 PRD 的業務規則，讓契約與程式碼不再漂移。
