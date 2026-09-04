# 在指標計算畫面上調策略的旋鈕 — Contract Verification

**Oracle**：`PRD.md` §3 的 Gherkin 驗收條件（17 條）。
**Phase 2 紀錄**：oracle 於任何實作之前寫在 scratchpad 的 `oracle-calc-parameters.md`
（獨立性關卡的證據），本矩陣的「Oracle」欄逐條沿用它，未依實作回頭改寫。

**判定方式**：測試對照 oracle、程式對照 oracle，**兩邊各自獨立**判定；
不以「測試綠了」當作符合。全綠只證明測試與程式彼此同意，不證明它們同意規格。

---

## 1. Clauses

| ID | 條款（PRD §3 逐條） | Oracle（Phase 2） | 實作 | 測試 | 測試判定 | 程式判定 | Status |
|---|---|---|---|---|---|---|---|
| AC-01.1 | 新增一個參數 → 多出一列，名稱空的、種類回看根數、預設值 20 | 新增一列：**名稱空白、種類回看根數、值 20** | `strategy-parameters-domain.ts:33` | `strategy-parameters-domain.spec.ts:15`；`IndicatorCalculationPanelParameters.spec.ts:58` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.2 | 參數跟著策略一起存 | 名稱、**種類與預設值**都被存起來 | `strategy-write-domain.ts:36`；`strategy-proxy.ts:79` | `IndicatorCalculationPanelStrategy.spec.ts:935`；`strategy-proxy.spec.ts`（存下去那一條） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.3 | 載入策略時參數跟著換 | 參數區**換成**那支策略的那幾個，連同種類與預設值 | `IndicatorCalculationPanel.vue`（`applyContent` → `strategyParameters.replaceAll`） | `IndicatorCalculationPanelStrategy.spec.ts:903`、`:922` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.4 | 刪掉一個參數 → 只剩另一個 | 只剩另一個 | `strategy-parameters-domain.ts:44` | `strategy-parameters-domain.spec.ts:34`；`IndicatorCalculationPanelParameters.spec.ts:72` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.5 | 一個參數都不宣告時照常運作 | 照常執行，**與沒有這項功能時完全相同** | `indicator-calculation-request-domain.ts`（空清單一路穿過） | 既有 897 條在零參數下維持全綠；`strategy-parameters-domain.spec.ts:69`（一個都沒有時沒有話說） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.6 | 改動參數算是還沒存的東西 | 與改算式內容一樣被當成**還沒存的變更** | `strategy-draft-domain.ts:22`＋`strategy-parameters-domain.ts:68` | `strategy-draft-domain.spec.ts:55`（七條：多／少／改名／改種類／改值／換順序／一模一樣） | asserts-oracle | produces-oracle | ✅ conforms（**曾為 violation，見 §3**） |
| AC-01.7 | 名稱是空的就地說明 | **就地**說明參數名稱不得為空白 | `strategy-parameter-domain.ts:28` | `strategy-parameters-domain.spec.ts:60`；`IndicatorCalculationPanelParameters.spec.ts:104` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.8 | 名稱重複就地說明 | **就地**說明參數名稱不得重複 | `strategy-parameters-domain.ts:81`（整份才知道的那一條） | `strategy-parameters-domain.spec.ts:60`；`IndicatorCalculationPanelParameters.spec.ts:118` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.9 | 回看根數不合法就地說明 | **就地**說明回看根數必須是大於零的整數 | `strategy-parameter-domain.ts:28` | `strategy-parameters-domain.spec.ts:60`；`IndicatorCalculationPanelParameters.spec.ts:177` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.1 | 一小時、五分鐘一根 → 12 格 | 涵蓋 **12** 格 | `calculation-span-vo.ts:41` | `calculation-span-vo.spec.ts:6` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.2 | 一小時、一小時一根 → 1 格 | 涵蓋 **1** 格 | `calculation-span-vo.ts:41` | `calculation-span-vo.spec.ts:6` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.3 | 有回看根數時仍然一格都不必填 | 計算照常完成；**使用者沒有被問過任何關於根數的問題** | `indicator-calculation-service.ts:106`（格數由畫面問、不由畫面填）；多拿幾根由系統那一側推導 | `IndicatorCalculationPanelParameters.spec.ts:86`（送出的請求帶著參數）＋ AC-02.4 那一條（畫面上沒有那一格） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.4 | 畫面上沒有「計算根數」這一格 | **找不到**「計算根數」；**找得到**「要看多長」 | `IndicatorCalculationPanel.vue:295`（欄位是「要看多長」） | `IndicatorCalculationPanel.spec.ts:139`（那四條驗證消失並註明理由）；`:88`（操作的是 `span-amount-input`） | asserts-oracle | produces-oracle | ✅ conforms（**文案曾殘留，見 §3**） |
| AC-02.5 | 看不了那麼長就地說明 | **就地**說明這個組合看不了這麼長，**並指出**縮短區間或換粗一點 | 系統那一側 `CandleCountExceeded` → 400 帶 `field`；`indicator-calculation-proxy.ts`（→ `IndicatorCalculationFieldError('span')`＋兩條出路） | `indicator-calculation-proxy.spec.ts`（指名那一格那一條）；`IndicatorCalculationPanelParameters.spec.ts:220`（落在欄位旁、不是通知欄）；後端 `indicator_calculation_controller_test.go` | asserts-oracle | produces-oracle | ✅ conforms（**曾為 violation，見 §3**） |
| AC-03.1 | 名字對不上就失敗並指名 | 計算**失敗**，說明「期數」這個名字沒有被宣告 | `indicator-calculation-proxy.ts`（靠 `parameterName` 欄位辨識）→ `StrategyParameterNotDeclaredError` | `indicator-calculation-proxy.spec.ts:220` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03.2 | 它與「算式跑不動」是兩則不同的說明 | 說明指出**哪一個名字**；畫面**沒有**說算式跑不動 | `IndicatorCalculationPanel.vue`（`parameter-not-declared-alert` 先於 `script-failed-alert`） | `IndicatorCalculationPanelParameters.spec.ts:191`、`:205` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03.3 | 把名字改對就算得出來 | **正常算出結果** | 無特別機制——一次普通的成功計算 | `IndicatorCalculationPanelParameters.spec.ts:86`（宣告的名字與算式相符時算得出來） | asserts-oracle | produces-oracle | ✅ conforms |

---

## 2. Orphans

| 行為 | 位置 | 判定 |
|---|---|---|
| 參數名稱長度上限（64 字） | 系統那一側 `strategy_parameters_domain.go:191` | 系統那一側的規則，前端刻意不抄一份（抄了就會在那邊改規則時說謊）。**不是** Out of Scope 項目，非違規。 |
| 認不得的參數種類一律收成「數值」 | `strategy-proxy.ts:123` | 防禦性正規化，PRD 未列。它讓一個未來才有的種類**不會憑空變成回看根數去多拿 K 線**——保守方向正確，記為未列於契約的既有行為。 |

**Out of Scope 對照**：PRD §2 明列不做「在圖表上套用時調參數」「參數值記在瀏覽器」
「參數的型別系統（字串／布林／列舉）」。程式中**沒有**任何一項的實作，無越界。

---

## 3. 本輪修掉的兩個違反與一處文案

### 🔴 → ✅ AC-01.6：改了參數不算「還沒存」

`StrategyDraftDomain` 是**逐欄位**比對，新增的那一欄它看不見：宣告、改名、換順序
全都不算有未儲存的變更，下一次載入會把使用者剛排好的那幾格靜靜蓋掉。
補 `StrategyParametersDomain.isSameAs`（**順序算數**——那是使用者排出來的）＋七條測試。

> 為什麼矩陣看得到而型別看不到：「整份比對」與「逐欄位比對」在型別上長得一模一樣。

### 🔴 → ✅ AC-02.5：看不了那麼長，說明落在錯的地方

系統那一側確實拒絕，但只回一句話。前端無從得知這是「哪一格」的問題，於是把它
印成一則籠統的「請求的問題」——說了什麼都對，卻指不出下一步，也沒給那兩條出路。

修法與「名字對不上」同一套：**讓系統那一側指名，而不是讓呼叫端讀訊息猜**。
- 系統那一側：新哨兵 `ErrIndicatorCalculationCandleCountExceeded`（同時仍是驗證失敗），
  400 的 body 多一個 `field: "candleCount"`。
- 前端：`BackendRequestRejectedError` 多帶 `field`；proxy 把它翻成
  `IndicatorCalculationFieldError('span', …)` 並補上兩條出路。
  **翻譯發生在 proxy**——系統那一側說的是「根數」（它的量詞），
  這個畫面把同一件事畫成「要看多長」，它沒有理由知道這件事。

順帶更正一條**說謊的既有測試**：`IndicatorCalculationPanel.spec.ts` 那一排原本把
「超過單次上限」列為籠統請求錯誤的例子。它建的拒絕沒帶欄位，所以**行為是對的**，
但標籤描述的情境在現實中會帶欄位——換成真正指不出哪一格的拒絕。

### 文案殘留（AC-02.4 的周邊）

`StrategyPicker` 與另存對話框仍寫著「挑一支會把它的算式、指標值種類、**彙總刻度與
計算根數**一起帶進來」。那句話錯兩次：計算根數已經不存在，而彙總刻度**從來沒有**
跟著策略走。兩處都改成「算式、指標值種類與參數」。

---

## 4. Summary

| Status | 數量 |
|---|---|
| ✅ conforms | 17 |
| 🔴 violation | 0（本輪修掉 2） |
| 🟠 mis-asserted | 0（本輪修掉 1） |
| 🟡 partial | 0 |
| ❌ gap | 0 |
| ❔ unclear | 0 |
| ⚠️ orphan | 2（皆為良性，見 §2） |

**Conformance：17/17 = 100%**

覆蓋率（`@vitest/coverage-v8` 實測，切片動過的檔案）：statements / branches /
functions / lines 皆 **100%**。`bun run verify` 全綠（897 條）；
系統那一側 `go build` / `go vet` / `go test ./...` 全綠。

**天花板**：這是一次**靜態**符合性稽核——它以規格推出的預期結果去讀測試碼與產品碼，
不執行它自己發明的情境。要動態證明某一條，走 `/tdd`。
