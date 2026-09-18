# 策略機器人的部位規劃 — Contract Verification Matrix

**Contract source:** `.sdd/2026-09-18-strategy-bot-position-plan/PRD.md`（Acceptance Criteria 為 oracle）
**Design map:** `.sdd/2026-09-18-strategy-bot-position-plan/ARCH.md`
**Glossary:** `.sdd/UL-MAP.md`（那幾個詞的定義在後端，本檔只記它們在畫面上的角色）
**Verified:** 2026-09-18
**Ceiling:** 靜態一致性稽核。逐條把**測試斷言**與**程式路徑**各自對照規格推出的 oracle，
不以「跑完全套變綠」當判準，也不自行發明並執行新的情境。

---

## Clauses

### US-01 — 那五格收在一個問句底下

| ID | Clause | Oracle（由規格推出） | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AC-01 | 新的一台預設收著，四格照舊 | 沒有那五格；四格都在 | `use-strategy-bot-form.ts:35`（`ref(false)`）＋`StrategyBotForm.vue:155` 的 `v-if` | `StrategyBotForm.spec.ts:149`（斷言那五格不存在，**並逐一斷言四格都在**） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02 | 填過的那一台打開就是展開，帶著它存著的值 | 展開；五格帶值 | `use-strategy-bot-form.ts:129`（`positionPlan !== null`）＋`:130` 起五格從那一組讀 | `StrategyBotForm.spec.ts:166`（斷言展開，並讀出 `50000` 與 `3`） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03 | 沒填過的那一台打開仍然收著 | 收著 | 同上（`positionPlan` 為 null） | `StrategyBotForm.spec.ts:160` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04 | 按一下就展開 | 五格出現 | `StrategyBotForm.vue:148` 綁著 `suggestsPosition` | `StrategyBotForm.spec.ts:177` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05 | 收起來就是不要 | 交出去的那一台沒有部位規劃 | `use-strategy-bot-form.ts:68-70`（`!suggestsPosition` → `null`） | `StrategyBotForm.spec.ts:198`（填過值再收起來，斷言 emit 的 `positionPlan` 為 null） | asserts-oracle | produces-oracle | ✅ conforms |

### US-02 — 填了什麼就送什麼

| ID | Clause | Oracle | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AC-06 | 整組填完 | 送出去的那一台帶著那五個數字 | `use-strategy-bot-form.ts:68` 起 → `strategy-bot-proxy.ts` 的 body | `StrategyBotForm.spec.ts:185`（五個逐一斷言）、`strategy-bot-proxy.spec.ts:203`（**實際 body** 逐鍵斷言，金額為字串） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-07 | 只填資金 | 送得出去，押多少是全押 | `NewPositionSizingDomain` 的空字串分支（未改動）＋`sizingMode` 預設 `allIn` | `position-plan-domain.spec.ts:32`（`全押不必填數字` 那一列）、`strategy-bot-proxy.spec.ts:263` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-08 | 區塊收著 | 不帶部位規劃 | `use-strategy-bot-form.ts:68`；proxy **整個鍵都不放** | `StrategyBotForm.spec.ts:198`、`strategy-bot-proxy.spec.ts:222`（`not.toHaveProperty`） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-09 | 資金留空就整組不算 | 不帶部位規劃 | `use-strategy-bot-form.ts:76`（`!capital.greaterThan(0)`） | `StrategyBotForm.spec.ts:209` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-10 | 只改停損距離也算改過 | 離開前會被問 | 表單既有的 dirty 比較（比整份 write DTO 的 JSON，新欄位自動被涵蓋，未改動） | `StrategyBotForm.spec.ts:251`（先斷言 `false`，改完斷言 `true`） | asserts-oracle | produces-oracle | ✅ conforms |

**AC-09 值得記一句：** 第一版用的是 `capital.isPositive()`，而 **decimal.js 的零是正的**
（它的符號是 +），所以那一版把「留空」讀成「有一組資金為零的規劃」。
這一條測試是唯一抓到它的東西——而後端用的 `shopspring` 對零答 false，
兩端本來會在這一格分岔。

### US-03 — 填不對的那幾種在這一側就擋下來

| ID | Clause | Oracle | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AC-11 | 押多少的百分比超過一百 | 送不出去，說明落在那一格旁邊 | `PositionPlanDomain.rejection` **委派**給 `PositionSizingDomain.validate()`（未改動） | `position-plan-domain.spec.ts:45`（三條句子逐字）、`StrategyBotForm.spec.ts:230`（表單上那一句＋存檔鍵停用） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12 | 槓桿小於一倍 | 說明講出「槓桿倍數不得小於 1 倍」 | `position-plan-domain.ts` 的那一條 | `position-plan-domain.spec.ts:57`、`strategy-bot-write-domain.spec.ts:72` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-13 | 停損距離是負的／超過一百 | 送不出去 | `distanceRejection`（**一份，兩個出口共用**） | `position-plan-domain.spec.ts:63`（停損與停利各兩列） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-14 | 收著的時候一格都不看 | 送得出去 | `strategy-bot-write-domain.ts` 的 `positionPlan === null` 早退 | `strategy-bot-write-domain.spec.ts:68`、`StrategyBotForm.spec.ts:240`（填錯再收起來 → 沒有拒絕、存檔鍵可按） | asserts-oracle | produces-oracle | ✅ conforms |

### US-04 — 執行紀錄看得到那一輪建議了什麼

| ID | Clause | Oracle | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AC-15 | 建議過部位的那一輪 | 三個數字都看得到 | `StrategyBotRunRecordDomain.toDto`（算成字）→ `StrategyBotRunHistory.vue:81` | `strategy-bot-run-record-domain.spec.ts:73`、`StrategyBotRunHistory.spec.ts:106`、`strategy-bot-proxy.spec.ts:278` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-16 | 沒有建議部位的那一輪 | 一個字都不加 | `StrategyBotRunHistory.vue:81` 的 `v-if`（三個都為 null 時整段不畫） | `StrategyBotRunHistory.spec.ts:119`、`strategy-bot-run-record-domain.spec.ts:84`、`strategy-bot-proxy.spec.ts:295` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-17 | 只建議過停損的那一輪 | 看得到金額與止損，看不到止盈 | 三個各自獨立的 `v-if` | `StrategyBotRunHistory.spec.ts:127` | asserts-oracle | produces-oracle | ✅ conforms |

### US-05 — 原本那四格一個字都沒變

| ID | Clause | Oracle | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AC-18 | 四格都還在，規則也沒變 | 四格在；它們的驗證與切片前一字不差 | `StrategyBotForm.vue` 那四格的 markup **一行未動**；`StrategyBotWriteDomain` 那四條規則**一字未動**（只在末尾多一個早退） | `StrategyBotForm.spec.ts:149`（四格逐一斷言）＋`strategy-bot-write-domain.spec.ts:26`／`:31`／`:45`（**切片前既有，斷言一字未改**仍綠） | asserts-oracle | produces-oracle | ✅ conforms |

---

## Core Business Rules（PRD §4）

| ID | Clause | Oracle | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| BR-01 | 五格收在一個可收起來的區塊，預設收著；填過的展開 | 兩種都對 | `use-strategy-bot-form.ts:35`／`:129` | `StrategyBotForm.spec.ts:149`／`:160`／`:166` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-02 | 收起來就是不要 | 交出去的是 `null` | `:68` | `StrategyBotForm.spec.ts:198` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-03 | 資金留空就整組不算 | 同上 | `:76` | `StrategyBotForm.spec.ts:209` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-04 | 押多少沿用既有模型，包含「只有全押不用填」與那兩條驗證 | 一條都不重寫 | `PositionPlanDomain` 委派；`sizingRequiresValue` 問的也是它 | `position-plan-domain.spec.ts:45`（措辭逐字，證明是同一份）、`StrategyBotForm.spec.ts:220`（切到全押那一格就消失） | asserts-oracle | produces-oracle | ✅ conforms |
| BR-05 | 槓桿與兩個距離的三條規則 | 三條都在 | `position-plan-domain.ts` | `position-plan-domain.spec.ts:57`／`:63` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-06 | 收著的時候一格都不驗證 | 送得出去 | `strategy-bot-write-domain.ts` 的早退 | `strategy-bot-write-domain.spec.ts:68`、`StrategyBotForm.spec.ts:240` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-07 | 執行紀錄只在真的建議過時才多出那三格 | 沒有的那幾輪一個字都不加 | 三個獨立的 `v-if` | `StrategyBotRunHistory.spec.ts:119`／`:127` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-08 | 原本那四格與它們的規則一字不差 | 逐字 | 見 AC-18 | 見 AC-18 | asserts-oracle | produces-oracle | ✅ conforms |

## Edge Cases（PRD §4）

| ID | Clause | Oracle | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| EC-01 | 區塊展開、五格全空 | 不帶部位規劃；不擋不報錯 | `:76`（資金非正 → `null`，而 `null` 不被驗證） | `StrategyBotForm.spec.ts:209` | asserts-oracle | produces-oracle | ✅ conforms |
| EC-02 | 押百分比填 150 但區塊收著 | 送得出去 | 早退 | `StrategyBotForm.spec.ts:240` | asserts-oracle | produces-oracle | ✅ conforms |
| EC-03 | 槓桿填 1 | 送得出去 | `lessThan(NO_LEVERAGE)` 用嚴格小於 | `position-plan-domain.spec.ts:32`（`不上槓桿` 那一列） | asserts-oracle | produces-oracle | ✅ conforms |
| EC-04 | 停損距離填 100 | 送得出去——與後端一字不差 | `greaterThan(WHOLE_PRICE_PERCENTAGE)` 用嚴格大於 | `position-plan-domain.spec.ts:32`（`整個價格那麼遠的止損` 那一列） | asserts-oracle | produces-oracle | ✅ conforms |
| EC-05 | 把區塊收起來再存 | 那一台從此不建議部位 | `:68` | `StrategyBotForm.spec.ts:198` | asserts-oracle | produces-oracle | ✅ conforms |
| EC-06 | 後端回來的那一台沒有 `positionPlan`（舊版後端） | 讀作沒有部位規劃，區塊收著 | `strategy-bot-proxy.ts:254`（`capital ?? 0` → `null`） | `strategy-bot-proxy.spec.ts:252`（`後端完全沒回那一組` 與 `資金是零` 兩列） | asserts-oracle | produces-oracle | ✅ conforms |

## Non-Functional（PRD §6）

| ID | Clause | Oracle | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| NFR-01 | 原本那四格與它們的每一條規則一字不差 | 逐字 | 見 AC-18 | 見 AC-18 | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-02 | 沒有部位規劃的機器人與沒有建議的那幾輪，畫面與切片前一樣 | 一個字都不加 | 兩處 `v-if` | `StrategyBotForm.spec.ts:149`、`StrategyBotRunHistory.spec.ts:119`＋**兩個檔內既有斷言一字未動仍綠** | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-03 | 押多少的選單與驗證不在這個專案裡出現第二份 | 沒有第二份 | `PositionSizingDomain` 是唯一一份；`PositionPlanDomain` 委派、`sizingModeOptions` 也問它 | `position-plan-domain.spec.ts:45`（措辭逐字比對，證明是同一份） | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-04 | 金額一律 `decimal.js` | 不用 `number` | `PositionPlanDto` 六欄皆 `Decimal`；`decimalOfText` 是唯一的入口 | — | no-test | produces-oracle | 🟡 partial |
| NFR-05 | 那幾處各有自己的 `data-testid` | 測試問得出 | `bot-position-plan-toggle`／`-fields`／五格各一／`run-history-plan` | 上面每一條都在用它們 | asserts-oracle | produces-oracle | ✅ conforms |

---

## Orphans

| # | Behavior | Site | Explained by | Judgement |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `decimalOfText` 收 `string \| number` | `use-strategy-bot-form.ts` 末 | 無 PRD 條款；實作時由測試迫出 | ✅ 必要。數字輸入框的 `v-model` 兩種都給得出來——宣告成只收字串的那一版在使用者第一次動那一格時就會炸。觸發間隔那一格早就在用 `Number(...)` 應付同一件事 |
| 2 | `sizingModeOptions` 用一個湊出來的零去建 `PositionSizingDomain` | `use-strategy-bot-form.ts:56` | 無 PRD 條款 | ⚠️ 良性。`toOptionDto()` 只讀模式，而 `backtest-service.ts:105` 切片前就是同一個寫法——同類問題用兩種形狀，下一個人會不知道該學哪一個 |
| 3 | `sizingRequiresValue` 改成交真正填著的數字 | `use-strategy-bot-form.ts:52` | `improve-codebase` 階段發現 | ✅ 正確。那個問題只讀模式，但交一個假的值進去，下一個人會以為它讀了 |
| 4 | `distanceRejection` 這個私有方法 | `position-plan-domain.ts` | 無 PRD 條款 | ⚠️ 良性。被兩個出口共用，而那正是抽它的唯一理由：兩份之後會有一邊放過另一邊擋著的值 |
| 5 | 「區塊開著嗎」不在任何 DTO 裡 | `use-strategy-bot-form.ts:35` | `ARCH.md` §4 | ✅ 正確的決定。放進 DTO 就有兩個欄位可以互相矛盾（開著但 plan 是 null、收著但 plan 有值），而矛盾的那一種沒有人說得出該聽誰的 |

**Out of Scope 檢查**：PRD §1 列的四項**沒有任何一項有對應程式碼**。逐一確認：

- **常駐展開的區塊**：`StrategyBotForm.vue:155` 是 `v-if`，預設 `false`。
- **在畫面上算那三個數字**：這一側沒有任何乘法——歷史那三個字是後端存的值，
  `StrategyBotRunRecordDomain` 只做 `toString()`。
- **在畫面上警告「回測沒把止損止盈算進去」**：那句話在這個專案裡**零命中**
  （`grep 回測沒有把` 只在後端與 MCP）。它屬於訊息，而這一頁不是讀訊息的地方。
- **交易策略那一頁**：`TradingStrategyWorkbench`、`useTradingStrategyForm`
  與交易策略那幾個 DTO **完全未改動**。

無越界。

---

## Summary

| Status | Count |
| :--- | :--- |
| ✅ conforms | 36 |
| 🔴 violation | 0 |
| 🟠 mis-asserted | 0 |
| 🟡 partial | 1 |
| ❌ gap | 0 |
| ❔ unclear | 0 |
| ⚠️ orphan | 2（皆良性）＋3 正確的決定／必要的新增 |

**Clauses:** 37 · **Conformance:** 97%（36/37 完全一致）

唯一一條 partial（NFR-04「金額一律精確小數」）是否定性陳述：
證據是 `PositionPlanDto` 六欄皆 `Decimal`、而 `decimalOfText` 是唯一的入口，
不是測試裡的一條斷言。

**這一刀的 conformance 比前幾刀高，理由不是它寫得比較好，
而是它的規格幾乎每一條都能在畫面上看得見**——區塊開沒開、送了什麼、
哪一格出現哪一格不出現，都是掛載一次就問得出來的事。
轉達層那幾刀的規格大半是「我不做什麼」，那種承諾天生斷言不到。

### 值得記下來的兩件事

**一、測試抓到一個兩端會分岔的錯，而它不在任何一條規格上。**

第一版用 `capital.isPositive()` 判斷「有沒有填資金」。**decimal.js 的零是正的**
（它的符號是 +），所以那一版把「留空」讀成「有一組資金為零的規劃」——
而後端用的 `shopspring` 對零答 `false`。兩端本來會在這一格分岔，
而分岔的後果是：使用者留空，這一側送出一組資金為零的規劃，
後端讀作沒有部位規劃——**看起來一切正常，直到有人去比對兩邊的資料**。

抓到它的是 AC-09 那一條（「資金留空就整組不算」），
而那一條之所以存在，是因為 PRD 把「資金是開關」寫成了一條獨立的驗收項，
而不是一句順帶的說明。

**二、「四格照舊」是這一刀唯一真正的設計約束。**

表單的註解寫著「只有四格，而那正是這一版做的事」，
那句話是上一版刻意拿掉三塊東西換來的。這一刀本來最自然的做法是多五個欄位——
而那樣做，程式會全綠、測試會全過、而上一版花三個章節解釋的那件事會安靜地消失。

一個收起來的區塊讓「要不要算部位」變成**一個問題**而不是五個欄位，
所以 AC-18（四格逐一斷言都在、既有那三條驗證測試一字未改仍綠）
不是一條相容性檢查，它是這一刀的設計本身。
