# 回測的止損止盈（畫面）— Contract Verification Matrix

**Contract source:** `.sdd/2026-09-18-backtest-exit-levels/PRD.md`（Acceptance Criteria 為 oracle）
**Design map:** `.sdd/2026-09-18-backtest-exit-levels/ARCH.md`
**Scope:** `go-trading-frontend`
**Verified:** 2026-09-18
**Ceiling:** 靜態一致性稽核。逐條把測試斷言與程式路徑各自對照規格推出的 oracle。
全套 194 檔 2728 條綠、`eslint` 與 `nuxt typecheck` 皆乾淨——但那不是判準。

---

## Clauses

### US-01 — 回測條件區填得出那兩個距離

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-01 | 兩格皆選填、預設留白 | 兩個 `ref('')` | `StrategyScriptBacktestPane.vue`／`TradingStrategyBacktestPane.vue` 的兩個 ref | `StrategyScriptBacktestPane.spec.ts`（`預設兩格都留白`，斷言輸入框 `value === ''`） | ✅ conforms |
| AC-02 | **兩個畫面都是填得動的輸入框** | 不是一句話 | 兩個 pane 都 `v-model` 到同一個分子 | `TradingStrategyBacktestPane.spec.ts`（`兩個出場距離在這一邊是填得動的輸入框，不是一句話`——與那一邊的刻度／交易模式**正好相反**的斷言） | ✅ conforms |
| AC-03 | 留白時**請求不帶那兩個值** | 不送零、不送空字串 | `backtest-proxy.ts:29` 的 `exitLevelsBody` | `backtest-proxy.spec.ts`（`留白的出場距離根本不出現在請求裡`，用 `not.toHaveProperty`）＋`只填一個就只送那一個` | ✅ conforms |
| AC-04 | 那一組說得出「留白就不模擬」 | 一句說明 | `BacktestConditionFields.vue:247` 的 `hint` | 無專屬斷言——它是一段固定文字，而斷言一段固定文字只是把它抄第二遍 | 🟡 partial |
| AC-05 | 距離不隨其他欄位切換清掉 | 與押注數字同一條規則 | 兩個 ref 各自獨立 | 既有那條`換模式不動表單上任何一格`（**未改動**）走的是同一個機制 | 🟡 partial |

### US-02 — 不合法當場不送出，而且只有一份說法

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-06 | 為負 → 不送出 | 「不得為負」 | `exit-distance-domain.ts` | `exit-distance-domain.spec.ts`（三列）＋`StrategyScriptBacktestPane.spec.ts`（`距離填錯就不送出`，斷言 `proxy.runBacktest` **沒有被呼叫過**） | ✅ conforms |
| AC-07 | 超過 100 → 不送出 | 「會讓價格變成負數」 | 同上 | `exit-distance-domain.spec.ts`＋pane 的`那句拒絕與機器人表單上那兩格逐字相同`（**整句 `toBe`**，不是 `toContain`） | ✅ conforms |
| AC-08 | 正好 100 送得出去 | `greaterThan` 而非 `>=` | 同上 | `exit-distance-domain.spec.ts`（`整個價格那麼遠`）＋pane 的`正好 100 送得出去`（斷言 proxy **被呼叫了**） | ✅ conforms |
| AC-09 | 訊息標在那一組旁邊 | 欄位名 `exitLevels` | `backtest-exit-levels-domain.ts` 丟 `BacktestFieldError('exitLevels', …)` | `backtest-exit-levels-domain.spec.ts`（`拒絕指著出場價位那一組`）＋pane 斷言那則訊息長在 `.backtest-condition-fields__exit-levels` **裡面** | ✅ conforms |
| AC-10 | 與後端、與機器人表單**逐字相同** | 同一句話 | 只有一份 | pane 的整句 `toBe`；**機器人那 16 條斷言一條都沒改而全綠** | ✅ conforms |
| AC-11 | 那兩句話**只有一份** | 私有方法搬成共用模型 | `exit-distance-domain.ts`；`position-plan-domain.ts` 委派、私有方法與 `WHOLE_PRICE_PERCENTAGE` **一併消失** | `position-plan-domain.spec.ts` 16 條**未改動**仍綠 | ✅ conforms |
| AC-12 | 一次只說一個理由 | `??` 串接 | `backtest-exit-levels-domain.ts` | `backtest-exit-levels-domain.spec.ts`（`一次只說一個理由`，斷言訊息**不含**另一個距離的名字） | ✅ conforms |
| AC-13 | 後端指名 `exitLevels` 時落在同一組 | 欄位翻譯 | `backtest-proxy.ts:60` | `backtest-proxy.spec.ts`（`後端指名出場價位時，說明落在那一組旁邊`） | ✅ conforms |

**AC-11 的證據是「沒有改任何斷言」。** 機器人那 16 條寫在這一刀之前，
其中三條就是在釘那兩句距離的措辭。它們一條都沒被動過而全綠——
那是「搬家沒有改變任何一個字」唯一站得住的證明。

### US-03 — 成績單說得出出場是怎麼發生的

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-14 | 多兩格出場筆數 | — | `BacktestSummaryCard.vue:81` 起 | `BacktestSummaryCard.spec.ts`（`被掃出場過才多那兩格`，斷言 2 與 1） | ✅ conforms |
| AC-15 | 大於零才出現 | 與打架棒數同一條規則 | 兩個 `v-if` | `BacktestSummaryCard.spec.ts`（`一筆都沒被掃出場時那兩格不出現`，用 `exists() === false`） | ✅ conforms |
| AC-16 | 明細多一欄出場原因 | 擺在出場價之後 | `BacktestTradeTable.vue:70` | `BacktestTradeTable.spec.ts`（**整列 cell 陣列**的 `toEqual`，位置因此被釘死）＋三種原因各一列 | ✅ conforms |
| AC-17 | 沒模擬時每一列都是訊號 | wire 沒說就是訊號 | `backtest-proxy.ts` 的 `?? 'signal'` | `backtest-proxy.spec.ts`（`沒說出場原因時當成訊號出場，兩個筆數當成零`） | ✅ conforms |
| AC-18 | 中文說法在 domain | 畫面只負責畫 | `backtest-domain.ts:52` 的 `TRADE_EXIT_REASON_LABELS` | `backtest-domain.spec.ts`（三種原因各一列，斷言中文字） | ✅ conforms |

### Core Business Rules（PRD §4）

| BR | Implementation | Test | Status |
| :--- | :--- | :--- | :--- |
| BR-01 留白不送 | `exitLevelsBody` | `not.toHaveProperty` 那一條 | ✅ |
| BR-02 拒絕的話一份 | `ExitDistanceDomain` | 機器人 16 條未改動 | ✅ |
| BR-03 一個欄位名蓋兩格 | `'exitLevels'` | `field` 斷言 | ✅ |
| BR-04 大於零才出現 | 兩個 `v-if` | `exists() === false` | ✅ |
| BR-05 出場原因中文在 domain | `TRADE_EXIT_REASON_LABELS` | 三列 | ✅ |
| BR-06 距離不隨模式清掉 | 獨立 ref | 既有那一條 | 🟡 partial |

### Edge Cases（PRD §4）

| 情境 | 驗證 | Status |
| :--- | :--- | :--- |
| 清空那一格 | `=== ''` → 零 → 不送 | ✅（`預設兩格都留白`那一條走同一條路） |
| 兩格都填但整段沒觸發 | 兩個筆數零 → 那兩格不出現 | ✅ |
| 後端回一個認不得的欄位名 | 既有行為未改動 | ✅（既有那一條仍綠） |
| 交易策略畫面那兩格填得動 | 專屬斷言 | ✅ |

### Non-Functional（PRD §6）

| 要求 | 驗證 | Status |
| :--- | :--- | :--- |
| **相容性：留白時 body 逐字相同** | `not.toHaveProperty` 兩條；既有的`把每一項條件都送到回測端點`**未改動**仍綠 | ✅ conforms |
| 零的判斷一律 `greaterThan(0)` | `exit-distance-domain.ts:60`（並在註解寫明 `decimal.js` 把零當成正的）；`isSet` 是這條規則的唯一住處 | ✅ conforms |
| 分層（元件只看得到 DTO 與哨兵錯誤） | `eslint` 乾淨——`no-restricted-imports` 會擋 | ✅ conforms |
| 兩個新模型 table-driven | 兩個 spec 共 21 條，全部 `it.each` 或多列 | ✅ conforms |

---

## Orphans

| 項目 | 判斷 |
| :--- | :--- |
| `ExitDistanceDomain.isSet` | **合理**，而且是這一刀最該存在的一行：`decimal.js` 把零當成正的，而這個專案已經被那條差別咬過一次。它住在一處，就不會有第二個人寫成 `isPositive()` |
| `exitLevelsBody` 是 proxy 的模組層函式而非方法 | **合理**。它不碰任何領域資料、不帶任何業務規則（規則在 `isSet` 裡），是純粹的「請求形狀組裝」；與這個檔案既有的 `BACKTEST_FIELD_TRANSLATIONS` 同一層 |
| 兩個 pane 各自 inline `=== '' ? 0 : …` | **合理**，與鄰居（初始資金、押注數字）的寫法一字不差，只有 `0` 與 `NaN` 的差別——而那個差別就是規則本身：沒填資金是一件事情沒講完，沒填距離是一個完整的回答 |
| 明細那一欄擺在出場價之後 | **合理**。它說的是那一次出場的事，而整列 cell 的 `toEqual` 把這個位置釘死了 |

規格說了而沒實作的：**無**。

---

## Summary

| | 數量 |
| :--- | ---: |
| ✅ conforms | 25 |
| 🟡 partial | 3 |
| ❌ violates | 0 |

三個 partial：一句固定說明文字（斷言它只是抄第二遍）、以及兩條走**未改動的既有機制**
的規則。沒有一個是行為不符。

### 值得記下來的兩件事

**一、這一刀最重要的產出不是那兩格，是那兩句話從此只有一份。**
`ExitDistanceDomain` 從一個私有方法搬出來，而搬家正確的證明是
**機器人那 16 條斷言一條都沒改而全綠**。那個模型現在是這個專案關於
「一個距離講不講得通」的唯一答案，下一張問距離的表單直接用它。

**二、留白的那一格根本不出現在請求裡，而那是刻意的。**
送一個零與不送在後端是同一件事——今天是。
但一個空輸入框轉成的零是 `new Decimal('')` 的結果，不是使用者的意思，
而那個巧合會在後端某天改讀法時安靜地壞掉。
`not.toHaveProperty` 那兩條斷言釘的就是「意思」而不是「等價」。
