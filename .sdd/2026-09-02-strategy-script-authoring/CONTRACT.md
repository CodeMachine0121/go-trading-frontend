# Contract Traceability Matrix — 只寫算式的內容

Contract: PRD.md
Design map: ARCH.md
Implementation: `app/domain/models/domains`, `app/domain/models/dto`, `app/domain/models/vo`,
`app/domain/service`, `app/application`, `app/infrastructure/proxy`, `app/components`
Oracle: Acceptance Criteria (27 scenarios) ＋ Core Business Rules (10) ＋ Non-Functional (4) = 41 clauses

## Clauses

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-1 | 只寫內容也能算 | 送出的算式是外框加上這段內容，種類為一個數字 | `indicator-script-domain.ts:120` · `indicator-calculation-request-domain.ts:60` | `indicator-calculation-service.spec.ts:39` · `IndicatorCalculationPanel.spec.ts` 挑了哪一種就送哪一種 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-2 | 外框看得見且改不動 | 畫面顯示外框，且它不是可編輯的欄位 | `IndicatorScriptEditor.vue:24` | `IndicatorScriptEditor.spec.ts` 外框的頭尾都看得到／外框改不動 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-3 | 內容前後多餘的空白不影響計算 | 照樣送出，計算正常進行 | `indicator-calculation-request-domain.ts:55` | `indicator-calculation-request-domain.spec.ts` 內容前後多餘的空白 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-4 | 內容留空 | 不計算，內容旁提示「請填寫算式內容」 | `indicator-calculation-request-domain.ts:56` | `IndicatorCalculationPanel.spec.ts` 算式內容留空 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-5 | 內容只有空白 | 同上 | `indicator-calculation-request-domain.ts:55` | `indicator-calculation-request-domain.spec.ts` 只有空白字元 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-6 | 挑一個數字，外框產出一個數字 | 外框顯示產出 `map[string]float64` | `indicator-script-domain.ts:63` | `IndicatorCalculationPanel.spec.ts` 挑了 float | asserts-oracle | produces-oracle | ✅ conforms |
| AC-7 | 挑一串數字 | 外框顯示產出 `map[string][]float64` | 同上 | 同上（floatList） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-8 | 挑一個是非 | 外框顯示產出 `map[string]bool` | 同上 | 同上（bool） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-9 | 挑一串是非 | 外框顯示產出 `map[string][]bool` | 同上 | 同上（boolList） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-10 | 切換種類不會弄丟寫到一半的內容 | 外框換掉，內容一字不變 | `IndicatorCalculationPanel.vue:27`（種類與內容是兩個獨立狀態） | `IndicatorCalculationPanel.spec.ts` 切換種類不會弄丟已經寫好的內容 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-11 | 沒有特別挑就是一個數字 | 送出的種類是 `float` | `indicator-result-type-domain.ts:38` · `indicator-calculation-service.ts:41` | `IndicatorCalculationPanel.spec.ts` 沒有特別挑時送出的是一個數字 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12 | 一個數字的範例 | 內容變成一段算出單一平均值的範例 | `indicator-script-domain.ts:11` | `indicator-calculation-service.spec.ts` 算式樣板（float） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-13 | 一串數字的範例 | 內容變成一段算出一整串數值的範例 | 同上 | 同上（floatList） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-14 | 一個是非的範例 | 內容變成一段算出單一是非的範例 | 同上 | 同上（bool） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-15 | 一串是非的範例 | 內容變成一段逐根算出是非的範例 | 同上 | 同上（boolList） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-16 | 帶入範例會取代已寫的內容 | 內容被範例取代 | `IndicatorCalculationPanel.vue:47` | `IndicatorCalculationPanel.spec.ts` 按下帶入範例內容／帶入的範例跟著種類走 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-17 | 看得出程式的結構 | 不同性質的字在視覺上分得出來 | `AppCodeEditor.vue`（`go()` 語言支援） | — | no-test | produces-oracle | 🟡 partial |
| AC-18 | 換行自動接續縮排 | 新的一行自動接續同樣的縮排 | `AppCodeEditor.vue`（`indentOnInput()` ＋ `indentUnit`） | — | no-test | produces-oracle | 🟡 partial |
| AC-19 | 常用片段補得出來 | 補齊清單出現走訪每一根 K 線之類的片段 | `AppCodeEditor.vue`（片段表 ＋ `autocompletion()`） | — | no-test | produces-oracle | 🟡 partial |
| AC-20 | 畫面不執行也不驗證算式 | 內容寫得不成立時畫面照樣送出，由後端判定 | `indicator-calculation-request-domain.ts`（只驗空白，不驗語法） | `IndicatorCalculationPanel.spec.ts` 算式內容寫得根本不成立時 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-21 | 一個數字的呈現 | 「均價」顯示 110 | `indicator-calculation-domain.ts:38` | `indicator-calculation-domain.spec.ts` 一個數字的值不是一串 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-22 | 一串數字的呈現 | 三個值依序都看得到 | 同上 ＋ `IndicatorCalculationPanel.vue:290` | `IndicatorCalculationPanel.spec.ts` 一串數字的每個值都看得到 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-23 | 一個是非的呈現 | 「黃金交叉」顯示「是」 | `indicator-calculation-domain.ts:9` | `indicator-calculation-domain.spec.ts` 是非以「是」與「否」呈現 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-24 | 一串是非的呈現 | 依序顯示「是」「否」「是」 | 同上 | `IndicatorCalculationPanel.spec.ts` 是非顯示「是」與「否」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-25 | 空的一串 | 明說是空的一串 | `indicator-value-dto.ts:19` · `IndicatorCalculationPanel.vue:285` | `IndicatorCalculationPanel.spec.ts` 空的一串明說是空的 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-26 | 沒有算出任何指標 | 顯示「這次沒有算出任何指標」，不是錯誤 | `indicator-calculation-result-dto.ts:17` | `IndicatorCalculationPanel.spec.ts` 一個指標都沒算出來時 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-27 | 結果說明自己是哪一種 | 結果顯示這次的指標值種類 | `indicator-calculation-domain.ts:36` | `IndicatorCalculationPanel.spec.ts` 結果說明這次的指標值種類 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-1 | 外框由畫面產生 | 送出的算式一律是外框加內容 | `indicator-script-domain.ts:120` | `indicator-script-domain.spec.ts` 組出來的算式是外框夾著內容 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-2 | 外框唯讀 | 使用者改不動外框 | `IndicatorScriptEditor.vue:24` | `IndicatorScriptEditor.spec.ts` 外框改不動 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-3 | 種類決定外框 | 不可能挑一種寫成另一種 | `indicator-script-domain.ts:63` | `indicator-script-domain.spec.ts` 四種外框 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-4 | 預設一個數字 | 沒挑就是 `float` | `indicator-result-type-domain.ts:38` | `indicator-result-type-domain.spec.ts` 沒有宣告時當作一個數字 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-5 | 切換種類不動內容 | 外框換，內容一字不變 | `IndicatorCalculationPanel.vue:27` | 同 AC-10 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-6 | 內容不得為空 | 去空白後為空即不送出，錯誤標在內容旁 | `indicator-calculation-request-domain.ts:55` | 同 AC-4、AC-5 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-7 | 畫面不執行也不驗證算式 | 撰寫協助不等於把關 | 同 AC-20 | 同 AC-20 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-8 | 是非的呈現屬於領域 | 真顯示「是」、假顯示「否」，判斷不寫在畫面上 | `indicator-calculation-domain.ts:9`（畫面只印 `displayValues`） | `indicator-calculation-domain.spec.ts` 是非以「是」與「否」呈現 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-9 | 一串的呈現 | 每個值都看得到、順序不變；空的一串明說 | 同 AC-22、AC-25 | 同 AC-22、AC-25 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-10 | 結果自帶種類 | 照後端回報的種類呈現，不照送出時挑的猜 | `indicator-calculation.ts:11`（entity 帶後端回報的種類） | `indicator-calculation-domain.spec.ts` 後端回報了不認得的種類時 | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-1 | 內容區不拖慢第一次顯示 | 編輯器不在首屏的載入路徑上 | `AppCodeEditor.vue`（`onMounted` 內動態載入） | `AppCodeEditor.spec.ts` 編輯器還沒載完就被收掉時不會出事（間接證明是載入後才建立） | shallow | produces-oracle | 🟠 mis-asserted |
| NFR-2 | 畫面不執行任何使用者提供的程式碼 | 算式只被送出，不在瀏覽器裡執行 | 全前端無任何 `eval` / `new Function` / 動態執行使用者輸入的路徑 | 同 AC-20（送出而非執行） | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-3 | 桌機瀏覽器最新版 | — | — | — | no-test | produces-oracle | 🟡 partial |
| NFR-4 | 無追蹤 | 不埋任何事件 | 全前端無追蹤程式碼 | — | no-test | produces-oracle | ✅ conforms |

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| `indicator-result-type-domain.ts:34` | 種類字串去前後空白、比對不分大小寫 | 契約未描述，屬寬容度；與後端的解讀一致，非越界 |
| `AppSelect.vue` | 新增的通用下拉選單原子 | US-02 要挑種類就需要它；本身無領域行為，屬實作手段 |
| `abstracts/_tokens.scss` 的 `line-height: relaxed` | 新增的行距 token | 程式碼一行一行讀需要比內文鬆的行距；依規範「先補 token 再用」 |

## Summary

- Conforms: 37/41 clauses ✅ (90%)
- Violations: 無
- Mis-asserted: NFR-1（動態載入只被間接證明；直接驗「編輯器不在首屏」需要打包產物層級的檢查，超出單元測試能回答的範圍）
- Partial: AC-17、AC-18、AC-19（著色、自動縮排、片段補齊）、NFR-3
- Gaps: 無
- Unclear: 無
- Orphans: 3

**關於 AC-17／18／19 的判斷**

這三條的程式路徑很短——`go()`、`indentOnInput()`、片段表加 `autocompletion()`——
真正做事的是編輯器套件本身。要斷言「關鍵字是不是變色」「Tab 縮了幾格」「補齊清單裡有沒有那四個片段」，
斷言的對象會是套件的行為而不是我們的業務，這正是 `testing.md` 明文不做的事
（「不為第三方套件本身寫測試」），ARCH 也預先寫明了這個取捨。
因此這三條維持 🟡：**程式碼確實產出規格要的結果，但沒有、也刻意不寫測試釘住它。**
真正該防的回歸是「這幾個設定被拿掉」，而那在畫面上一眼就看得出來。

> 本次為靜態稽核：以驗收條件為準比對測試斷言與程式路徑，不執行自行發明的情境。
