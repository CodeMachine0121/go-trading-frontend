# 回測要照哪一套規矩操作 — Contract Verification Matrix

**Contract source:** `.sdd/2026-09-17-backtest-trading-mode/PRD.md`（Acceptance Criteria 為 oracle）
**Design map:** `.sdd/2026-09-17-backtest-trading-mode/ARCH.md`
**Glossary:** `.sdd/UL-MAP.md`
**Verified:** 2026-09-17（初稿後收緊兩條斷言，已重驗）
**Ceiling:** 靜態一致性稽核。逐條把**測試斷言**與**程式路徑**各自對照規格推出的 oracle，
不以「跑完全套變綠」當判準，也不自行發明並執行新的情境。

---

## Clauses

### US-01 — 在表單上看得見有兩種規矩可選

| ID | Clause | Oracle | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AC-01 | 打開回測時兩個選項同時看得見 | 兩個選項同時在畫面上，不必點開任何東西；多空反手是被選中的那一個 | `BacktestConditionFields.vue:193`（兩顆並排，非 select）＋ `trading-mode-vo.ts:18` | `StrategyScriptBacktestPane.spec.ts:497`（兩顆都在）＋`:517`（預設是多空反手）＋`AppRadio.spec.ts:25`（值相符即呈現為被挑中） | asserts-oracle（兩條合起來） | produces-oracle | ✅ conforms |
| AC-02 | 每個選項說得出它做什麼 | 多空反手那一個說得出反手做空；現貨那一個說得出只做多、不放空 | `trading-mode-domain.ts:5`（描述表） | `StrategyScriptBacktestPane.spec.ts:508`、`trading-mode-domain.spec.ts:16`／`:25` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03 | 兩個去處問的是同一件事 | 兩個選項、預設值與那兩句說明一字不差 | 兩個 Pane 皆呼叫 `backtest-application.ts:48` | `TradingStrategyBacktestPane.spec.ts:255`（逐一比對同一個來源的說明）＋`:246` | asserts-oracle | produces-oracle | ✅ conforms |

### US-02 — 挑了什麼就送什麼

| ID | Clause | Oracle | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AC-04 | 沒有動過它就送預設的那一個 | 送出去的是多空反手 | `trading-mode-vo.ts:18` → `backtest-proxy.ts:99` | `StrategyScriptBacktestPane.spec.ts:517`、`backtest-proxy.spec.ts:331` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05 | 挑了現貨就送現貨 | 送出去的是現貨 | `backtest-request-domain.ts:88` → `backtest-proxy.ts:99` | `StrategyScriptBacktestPane.spec.ts:526`、`backtest-proxy.spec.ts:321` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06 | 重演一份交易策略時同樣送得出去，且仍不送刻度與算式 | body 帶現貨，且不含彙總刻度與算式 | `trading-strategy-backtest-request-domain.ts:56` → `backtest-proxy.ts:142` | `TradingStrategyBacktestPane.spec.ts:267`、`backtest-proxy.spec.ts:340`（同時斷言那兩樣不存在） | asserts-oracle | produces-oracle | ✅ conforms |

### US-03 — 換模式不弄丟任何東西

| ID | Clause | Oracle | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AC-07 | 換模式不動表單上其他任何一格 | 市場、起訖、本金、押注模式四格內容一個字都沒變 | `StrategyScriptBacktestPane.vue:89`（自己的 ref，換它不觸發任何重置） | `StrategyScriptBacktestPane.spec.ts:536` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-08 | 換模式不清掉上一張成績單 | 成績單還在——他還沒按下執行 | 同上（`backtestRun.clear()` 只綁在工作區換版與送出） | `StrategyScriptBacktestPane.spec.ts:553` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-09 | 換模式不清掉押注那一格填的數字 | **改成現貨再改回多空反手**之後，那格仍然是 50 | 同上 | `StrategyScriptBacktestPane.spec.ts:536`（換過去再換回來，並一併驗押注模式本身） | asserts-oracle | produces-oracle | ✅ conforms |

### US-04 — 被拒絕時說在對的那一格旁邊

| ID | Clause | Oracle | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AC-10 | 後端說交易模式它不認得 | 那句話出現在**交易模式那一格旁邊**，不在頁面頂端 | `backtest-proxy.ts:32`（欄位翻譯）→ `BacktestConditionFields.vue:186` | `backtest-proxy.spec.ts:354`（欄位是 tradingMode）＋`StrategyScriptBacktestPane.spec.ts:564`（斷言那句話就在交易模式那一格的錯誤位置上） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-11 | 後端拒絕的是別的東西 | 那句話照舊落在原本那一格，交易模式那一格沒有任何錯誤 | `backtest-proxy.ts:25-33`（欄位逐一對應，不共用） | `backtest-proxy.spec.ts:368` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12 | 再按一次會先清掉上一則錯誤 | 上一則錯誤先消失，與其他每一格做法相同 | `useBacktestRun`（既有，未改動；所有欄位共用同一次清除） | — | no-test（既有機制由其他欄位的案例覆蓋，交易模式這一格本身沒有專屬案例） | produces-oracle | 🟡 partial |

### Core Business Rules（PRD §4）

| ID | Clause | Oracle | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| BR-01 | 交易模式二選一 | 畫面只認得兩種 | `trading-mode-vo.ts:9` | `trading-mode-domain.spec.ts:6` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-02 | 預設停在多空反手 | 沒挑過就是既有的那一種 | `trading-mode-vo.ts:18` | `trading-mode-domain.spec.ts:11` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-03 | 兩個選項同時看得見，不用下拉選單 | 不是 select，兩顆都在 | `BacktestConditionFields.vue:193` | `StrategyScriptBacktestPane.spec.ts:497`、`TradingStrategyBacktestPane.spec.ts:246` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-04 | 每個選項帶一句話說它做什麼 | 沒有一種留白 | `trading-mode-domain.ts:5` ＋ `AppRadio.vue` 的說明列 | `trading-mode-domain.spec.ts:34`（逐一非空）＋`AppRadio.spec.ts:45` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-05 | 換模式不清掉任何東西 | 表單其他格、押注數字、上一張成績單全部留著 | 三者各自獨立的 `ref` | `StrategyScriptBacktestPane.spec.ts:536`／`:553` | asserts-oracle（押注數字那半見 AC-09） | produces-oracle | ✅ conforms |
| BR-06 | 不記住上次挑的那一個 | 每次打開回到預設 | 兩個 Pane 都以 `defaultTradingMode()` 起始，無任何持久化 | `StrategyScriptBacktestPane.spec.ts:517`（每次掛載都是預設） | asserts-oracle | produces-oracle | ✅ conforms |
| BR-07 | 兩個去處共用同一組選項、預設與說明 | 只有一份來源 | `backtest-service.ts:110`／`:121`，兩個 Pane 都跟它拿 | `TradingStrategyBacktestPane.spec.ts:255` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-08 | 後端說不認得時落在交易模式那一格 | 那句話標在這一格 | `backtest-proxy.ts:32` | `backtest-proxy.spec.ts:354` | asserts-oracle（邊界層）；畫面層見 AC-10 | produces-oracle | ✅ conforms |
| BR-09 | 送出前不就地擋交易模式 | 從兩顆按鈕挑的，挑不出非法值，所以不驗 | `backtest-request-domain.ts:86-88`（只帶著，不擲錯） | `trading-strategy-backtest-request-domain.spec.ts`（既有案例全帶 tradingMode 仍通過） | asserts-oracle | produces-oracle | ✅ conforms |

### Non-Functional（PRD §6）

| ID | Clause | Oracle | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| NFR-01 | 相容：沒動過它的使用者，畫面行為與送出內容與切片前完全相同 | 一切照舊 | `trading-mode-vo.ts:18` | 切片前 2545 個既有測試斷言未改仍全綠 ＋ `:517` | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-02 | 一致：兩處的選項、預設、說明來自同一處 | 不是兩份各自維護的字串 | `trading-mode-domain.ts:5` | `TradingStrategyBacktestPane.spec.ts:255` | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-03 | 無障礙：兩顆是真的可挑選控制項，鍵盤操作得了 | 原生 radio，且同組共用 name；整組有 legend | `AppRadio.vue`（原生 `<input type="radio">`）＋ `FormField.vue` 的 `fieldset`／`legend` | `AppRadio.spec.ts:64`（同組共用名字）、`:58`（停用） | asserts-oracle | produces-oracle | ✅ conforms |

---

## Orphans

| # | Behavior | Site | Explained by | Judgement |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `FormField` 多了 `grouped`，會把根元素換成 `<fieldset>` ＋ `<legend>` | `FormField.vue` | 無 PRD 條款；由 `ARCH.md` 的無障礙需求推得 | ⚠️ 良性且必要。`<label>` 不得巢狀，而每顆單選鈕有自己的 `<label>`；巢狀那一版在螢幕上看不出差別，但點選時焦點會跑掉 |
| 2 | 每個實例自己產生一個單選鈕組名（`useId()`） | `BacktestConditionFields.vue:70` | 無條款 | ⚠️ 良性且必要。兩張回測表單可能同時在頁面上，共用一個組名會讓兩邊的選項彼此互斥——挑了這張的現貨，另一張的選擇會被清掉 |

**Out of Scope 檢查**：PRD §1 列的五項（成績單上標出模式、同次比較兩種、記住上次挑的、
第三種模式、依帳戶自動挑）**沒有任何一項有對應程式碼**。
特別確認：成績單三個元件一行未改、無任何 `localStorage`／持久化、`TRADING_MODES` 恰好兩個值。無越界。

---

## Summary

| Status | Count |
| :--- | :--- |
| ✅ conforms | 19 |
| 🔴 violation | 0 |
| 🟠 mis-asserted | 0 |
| 🟡 partial | 1 |
| ❌ gap | 0 |
| ❔ unclear | 0 |
| ⚠️ orphan | 2（皆良性且必要） |

**Clauses:** 20 · **Conformance:** 95%（19/20）

### 初稿抓到的兩條，已修

兩條都不是行為錯誤，是**綠燈不可信**——正是這張表存在的理由。

- **AC-09** 原本只換一次模式就斷言押注數字還在，而規格說的是「改過去**再改回來**」。
  收緊後兩趟都走到，並一併驗押注模式本身。
- **AC-10** 原本只驗「頁面上有那句話」，沒有驗它**落在哪一格**——
  而這一條的全部重點就是位置。收緊後直接斷言它在交易模式那一格的錯誤位置上。

兩條都以反向驗證確認抓得到問題：把錯誤從那一格拿掉、以及讓換模式順手清掉押注數字，
收緊後的斷言各自變紅。

剩下的 AC-12（再按一次先清掉上一則錯誤）走的是所有欄位共用、切片前就有的那一次清除，
交易模式這一格沒有專屬案例；行為正確，記為 partial 而不算綠。
