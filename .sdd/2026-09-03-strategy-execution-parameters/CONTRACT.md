# 策略與執行參數分離（操作介面） — Contract Verification

**Contract source:** `.sdd/2026-09-03-strategy-execution-parameters/PRD.md`（Section 3 驗收條件）
**Design map:** `ARCH.md`（同資料夾）
**Verified:** 2026-09-03
**Ceiling:** 靜態一致性稽核——逐條把**測試的斷言**與**程式碼路徑**各自對照 PRD 導出的預期結果，
不靠整套測試的綠燈下判斷，也不執行自行發明的情境。

**獨立性關卡（Phase 2）如何被滿足：** 每一條的預期結果在**實作之前**就寫死在
`oracle-slice1.md`——當時這支分支剛從 main 拉出來，相關程式碼一行都還不存在，
因此 oracle 不可能是從實作反推出來的。下表的 Oracle 欄逐條引自那份檔案。

---

## 1. Clauses

| ID | Clause（PRD scenario） | Oracle（實作前釘住） | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AC-01.1 | 另存為新策略時只存下算法 | O-01：送出的內容只有名稱、算式、種類 | `strategy-write-domain.ts:19`、`strategy-proxy.ts` 的 body | `strategy-proxy.spec.ts:打的是建立策略的端點`（body 完整比對） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.2 | 載入一支策略帶進來的只有算法 | O-02：算式與種類換成該策略的 | `strategy-domain.ts:20` | `IndicatorCalculationPanelStrategy.spec.ts:挑一支就把它記住的算法帶進畫面` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.3 | 讀回一支策略時沒有取數計畫可讀 | O-03：形狀含名稱／算式／種類，**不含**刻度與根數 | `strategy-content-dto.ts:19`、`strategy.ts:14` | `strategy-application.spec.ts:讀回來的策略身上沒有取數計畫可讀`（**本次稽核補上**） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.1 | 載入策略不動彙總刻度與計算根數 | O-04：載入前 1h／60 → 載入後仍是 1h／60 | `IndicatorCalculationPanel.vue` 的 `applyContent` 只寫兩個 ref | `IndicatorCalculationPanelStrategy.spec.ts:挑一支不會動到這一次的執行設定` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.2 | 載入策略不動交易標的 | O-05：載入前後交易標的相同 | 同上（交易標的本來就不在策略內容裡） | 同檔:`挑一支不會動到交易標的——策略不記交易標的`（既有） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.3 | 開一份新的空白策略也不動執行設定 | O-06：算式清空、種類回預設；4h／60 不變 | `blankStrategyContent` 只有兩欄 | 同檔:`開一份新的空白也不動這一次的執行設定` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03.1 | 改動彙總刻度不算未儲存的變更 | O-07：不出現確認，直接載入 | `strategy-draft-domain.ts:22` 只比兩欄 | 同檔:`只改了彙總刻度時不問`（`it.each` 第一列） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03.2 | 改動計算根數不算未儲存的變更 | O-08：同上 | 同上 | 同檔（`it.each` 第二列） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03.3 | 改動算式內容算未儲存的變更 | O-09：出現確認，未確認前不覆蓋 | 同上（保留的那兩欄） | 同檔:`已經寫了東西時先問過再覆蓋`（既有） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03.4 | 改動指標值種類算未儲存的變更 | O-10：出現確認 | 同上 | `strategy-draft-domain.spec.ts:指標值種類 改了就算有未儲存的變更` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03.5 | 還沒載入過任何策略且算式空白時不問 | O-11：直接載入，不出現確認 | `strategy-draft-domain.ts:20`（既有規則） | `IndicatorCalculationPanelStrategy.spec.ts:編輯區還沒動過時直接帶入，不多問` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04.1 | 以挑選的粗細執行計算 | O-12：送出的請求刻度=1h、根數=24 | `indicator-calculation-request-domain.ts` + `indicator-calculation-proxy.ts` 的 body | `indicator-calculation-service.spec.ts:挑好的彙總刻度真的被送出去執行`、`IndicatorCalculationPanel.spec.ts:挑好的彙總刻度真的被送出去` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04.2 | 挑最細的那一種 | O-13：送出的請求刻度=5m | 同上 | `IndicatorCalculationPanel.spec.ts:什麼都沒挑時送出的是五分鐘` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04.3 | 什麼都沒挑就是五分鐘 | O-14：未動過刻度時送出 5m | `AggregationIntervalDomain` 的建構子 + `defaultAggregationInterval` | 同上；`aggregation-interval-domain.spec.ts:完全沒宣告 時退回最細的那一種` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04.4 | 那句道歉的話不再出現 | O-15：畫面文字不含「目前計算仍以五分鐘執行」 | `IndicatorCalculationPanel.vue` 的欄位說明 | `IndicatorCalculationPanelStrategy.spec.ts:選單在，且不再說它還沒生效`（`not.toContain`） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05.1 | 結果寫出這次採用的彙總刻度 | O-16：以 1h 算 → 出現「一小時」，與根數並列 | `indicator-calculation-domain.ts` → `IndicatorCalculationResultDto.intervalLabel` | `IndicatorCalculationPanel.spec.ts:結果寫出這次實際採用的彙總刻度，與根數並列` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05.2 | 最細的那一種也照樣寫出來 | O-17：以 5m 算 → 出現「五分鐘」 | 同上 | 同檔:`最細的那一種也照樣寫出來` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05.3 | 寫的是系統回報的刻度 | O-18：挑 1h、回報 5m → 出現**五分鐘** | `indicator-calculation.ts` 存的是回報值 | 同檔:`寫的是後端回報的刻度，不是送出時挑的那一個`；`indicator-calculation-service.spec.ts` 同名案例 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05.4 | 一個指標都沒算出來時照樣寫得出粗細 | O-19：零指標、回報 1h → 仍出現「一小時」 | 同上（與 `indicatorValues` 無關） | 同檔:`一個指標都沒算出來時照樣寫得出這次用的刻度` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05.5 | 計算失敗時沒有粗細可說 | O-20：完全不呈現結果區 | `IndicatorCalculationPanel.vue` 的 `v-if="result"`（既有） | 同檔:`計算失敗時完全不呈現結果，也就沒有刻度可說` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06.1 | 說明講的是走完的那幾格 | O-21：計算說明含「已經走完」 | `IndicatorCalculationPanel.vue` 的計算說明 | `IndicatorCalculationPanel.spec.ts:一進畫面就說明計算只採用走完的那幾格` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06.2 | 不再說「排除最新一根」 | O-22：說明不含該字串 | 同上 | 同上（同一個 it 內的 `not.toContain`） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-07.1 | 存回使用中的那一支 | O-23：存回並顯示已儲存訊息 | 未改動 | `IndicatorCalculationPanelStrategy.spec.ts:有使用中的那一支時，儲存存回它而不是建立新的` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-07.2 | 名稱被佔用時就地說明 | O-24：就地說明、內容不清空 | 未改動 | 同檔:`名稱被佔用時對話框不關閉、就地說明，畫面內容一字不動` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-07.3 | 算式跑不起來 | O-25：呈現算式的問題、不呈現結果 | 未改動 | `IndicatorCalculationPanel.spec.ts:算式跑不起來時，明確說是算式的問題` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-07.4 | 載入一支認不出外框的策略 | O-26：整段原文帶入並告知 | 未改動 | `IndicatorCalculationPanelStrategy.spec.ts:認不出外框的算式整段帶進來，並說出這一支不是在這裡寫出來的` | asserts-oracle | produces-oracle | ✅ conforms |

### Section 4 的核心規則（BR）

| ID | Rule | 判定 |
| :--- | :--- | :--- |
| BR-1 | 策略記住三樣 | 由 AC-01.1／01.3 覆蓋 ✅ |
| BR-2 | 執行設定三樣，不隨策略存下來、不隨載入被覆蓋 | 由 AC-01.1／02.1／02.3 覆蓋 ✅ |
| BR-3 | 未儲存的變更只看算法 | 由 AC-03.1～03.4 覆蓋 ✅ |
| BR-4 | 結果帶著系統回報的彙總刻度 | 由 AC-05.1～05.3 覆蓋 ✅ |
| BR-5 | 計算說明講的是走完的刻度區間 | 由 AC-06.1／06.2 覆蓋 ✅ |

---

## 2. Orphans

| Behavior | Site | 判定 |
| :--- | :--- | :--- |
| `AggregationIntervalDomain` 容忍大小寫與前後空白（`1D`、` 1d `） | `aggregation-interval-domain.ts:22` | **PRD 未明列**，但它是既有 `IndicatorResultTypeDomain` 一字不差的處理方式（見 ARCH「第二原則」）。已有測試（O-27）。屬於沿用既有慣例，非擅自擴張 |
| `defaultAggregationInterval()` 改為問 model 而非讀常數 | `indicator-calculation-service.ts:66` | `/improve-codebase` 這一步的產物，行為完全不變（兩者都回 `5m`）。已用突變確認「規則只剩一份」 |

**無違反 Out of Scope 的實作。** 逐條確認：未收系統回的「這次讀了哪幾根」、
未加「算到哪個時間為止」、未在圖表上畫任何東西、未替既有策略補回那兩樣、
未動交易標的／算式內容／指標值種類的任何行為。

---

## 3. Summary

```
✅ 26 conforms · 🔴 0 violations · 🟠 0 mis-asserted · 🟡 0 partial · ❌ 0 gaps · ❔ 0 unclear · ⚠️ 2 orphans（皆已說明）
Conformance: 100%
```

**本次稽核找到並修掉的一處：**

- **AC-01.3**（讀回策略時沒有取數計畫可讀）原本是 🟡 **partial**：
  程式碼正確，但那兩樣的「不存在」**只有型別系統擋著**——那是建置時的保證，
  沒有任何測試在執行期釘住它。補上
  `strategy-application.spec.ts:讀回來的策略身上沒有取數計畫可讀`，
  並以突變確認：把彙總刻度加回策略內容，該測試立刻紅。

**覆蓋率**（`vitest --coverage`）：本切片新增／改動的**每一個檔案**皆
100% 敘述、100% 分支、100% 行。
**突變測試**：七個針對本切片新規則的突變全部被殺，無倖存者。
