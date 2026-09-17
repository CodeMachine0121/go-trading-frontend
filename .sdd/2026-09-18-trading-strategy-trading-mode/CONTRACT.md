# 交易策略的交易模式 — Contract Verification Matrix

**Contract source:** `.sdd/2026-09-18-trading-strategy-trading-mode/PRD.md`（Acceptance Criteria 為 oracle）
**Design map:** `.sdd/2026-09-18-trading-strategy-trading-mode/ARCH.md`
**Glossary:** `.sdd/UL-MAP.md`（三個詞的定義在後端，本檔只記它在畫面上的角色）
**Verified:** 2026-09-18
**Ceiling:** 靜態一致性稽核。逐條把**測試斷言**與**程式路徑**各自對照規格推出的 oracle，
不以「跑完全套變綠」當判準，也不自行發明並執行新的情境。

---

## Clauses

### US-01 — 工作檯上挑得到交易模式

| ID | Clause | Oracle（由規格推出） | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AC-01 | 新的一份預設多空反手 | 名稱旁邊有兩顆單選鈕，選著多空反手 | `use-trading-strategy-form.ts:52`／`:129`（`editing` 為 null → `DEFAULT_TRADING_MODE`） | `TradingStrategyWorkbench.spec.ts:651`（斷言 `longShort` 那一顆 `checked`） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02 | 打開一份存著現貨的 | 選著現貨 | `use-trading-strategy-form.ts:129`（`loaded?.tradingMode`） | `TradingStrategyWorkbench.spec.ts:661`、`use-trading-strategy-form.spec.ts:253` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03 | 挑了現貨再存 | 送出去的那一份帶著 `spot` | `use-trading-strategy-form.ts:108` → `trading-strategy-write-domain.ts:62` → `trading-strategy-proxy.ts:167` | `TradingStrategyWorkbench.spec.ts:671`（emit 的 write DTO）、`use-trading-strategy-form.spec.ts:269`、`trading-strategy-proxy.spec.ts:185`（**body 真的帶著它**） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04 | 改掉一份既有的模式 | 送出去的那一份帶著新的那一個 | 同上（建立與改寫同一條路；`trading-strategy-proxy.spec.ts:185` 兩支都斷言） | `trading-strategy-proxy.spec.ts:185` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05 | 兩顆按鈕各自說得出它做什麼，且與重演那一列逐字相同 | 每顆帶一句話；兩處同一份字串 | `trading-strategy-service.ts:24` → `TradingModeDomain.toOptionDto()`（**未改動**，與 `backtest-service.ts:122` 讀同一份） | `TradingStrategyWorkbench.spec.ts:639`（逐一斷言 `description` 出現在那一顆裡） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06 | 只改交易模式也算改過 | 離開前會被問 | 工作檯既有的 dirty 比較（比整份 write DTO 的 JSON，新欄位自動被涵蓋，未改動） | `TradingStrategyWorkbench.spec.ts:683`（先斷言 `false`，改完斷言 `true`） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-07 | 兩個選項並排在名稱旁邊 | 兩顆都在，且在名稱那一列裡 | `TradingStrategyWorkbench.vue:126`（在 `workbench__identity` 內） | `TradingStrategyWorkbench.spec.ts:628` | asserts-oracle | produces-oracle | 🟡 partial |

**AC-07 為何 partial：** 「兩顆都在」有斷言；「在名稱那一列裡」由樣板的巢狀位置保證，
測試斷言不到 DOM 的祖先關係而不寫成一條脆弱的選擇器。
版面本身沿用回測那一列**逐字相同**的 grid（`TradingStrategyWorkbench.vue` 的
`&__trading-mode`），所以它不是一個新發明的排法。

### US-02 — 重演一份交易策略時交易模式是一句話

| ID | Clause | Oracle | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AC-08 | 那一格是一句話而不是按鈕 | 有那一句話；**沒有任何可以按的單選鈕** | `BacktestConditionFields.vue:204`（`v-if="!tradingModeNote"`）＋`:224`；`TradingStrategyBacktestPane.vue:168` 傳 note | `TradingStrategyBacktestPane.spec.ts:249`（兩顆都斷言**不存在**、那一句話斷言存在） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-09 | 多空反手那一份講的是多空反手 | 那一句話講對 | `TradingStrategyBacktestPane.vue:76-77` → `backtest-service.ts:135` | `TradingStrategyBacktestPane.spec.ts:261`（現貨與多空反手各掛一次） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-10 | 送出的請求不帶交易模式 | body 裡沒有那一欄 | `trading-strategy-backtest-request-dto.ts` 已無該欄位；`backtest-proxy.ts` 的 body 少一行 | `TradingStrategyBacktestPane.spec.ts:294`（`not.toHaveProperty`）＋`backtest-proxy.spec.ts:338`（**實際 body** 斷言 `undefined`） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-11 | 還沒存的改動不會改掉那一句話 | 仍然講存著的那一個 | `TradingStrategyWorkbenchPage.vue:186` 讀 `workbench.editing`（伺服器回來的那一份），不讀表單 | `TradingStrategyBacktestPane.spec.ts:261`（note 只由 `savedTradingMode` 決定；元件收不到表單的值） | asserts-oracle | produces-oracle | 🟡 partial |
| AC-12 | 存好之後那一句話跟著走 | 換成新存的那一個 | `use-trading-strategy-workbench.ts` 存成功時 `editing.value = savedTradingStrategy`（未改動）→ 那一列的 prop 跟著變 | `TradingStrategyBacktestPane.spec.ts:294`（**換 prop 之後那一句話真的換了**）＋`use-trading-strategy-workbench.spec.ts`（存成功換掉 `editing` 為切片前既有，仍綠） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-13 | 還沒存過的那一份講預設值 | 那一句話講多空反手 | `backtest-service.ts:135`（`mode ?? DEFAULT_TRADING_MODE`） | `TradingStrategyBacktestPane.spec.ts:285`（`savedTradingMode: null`） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-14 | 那一句話裡的名字與說明與另外兩處同一份 | 三處同一份字串 | `backtest-service.ts:135` → `TradingModeDomain.toOptionDto()`（未改動） | `TradingStrategyBacktestPane.spec.ts:271`（拿 `listTradingModeOptions()` 的那一份逐字比對 note） | asserts-oracle | produces-oracle | ✅ conforms |

**AC-11 為何 partial：** 元件層有斷言（note 只看 `savedTradingMode`），
而「頁面餵進來的就是存著的那一份」由 `TradingStrategyWorkbenchPage.vue:186`
那一行的字面保證。要端到端斷言它，得掛整個頁面模板加上一個假後端——
而那條路上每一段都各自被既有測試蓋住了。

### US-03 — 重演一支策略腳本那一塊一個字都沒變

| ID | Clause | Oracle | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AC-15 | 那一塊仍然是兩顆單選鈕，選著多空反手 | 兩顆都在、預設多空反手 | `StrategyScriptBacktestPane.vue` **完全未改動**（不傳 `tradingModeNote` ⇒ 走畫按鈕那條路） | `StrategyScriptBacktestPane.spec.ts:502`／`:511`（**切片前既有，斷言一字未改**仍綠） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-16 | 挑了現貨就照現貨送 | 請求帶著 `spot` | `backtest-proxy.ts:99`（未改動） | `StrategyScriptBacktestPane.spec.ts:526`、`backtest-proxy.spec.ts:319`（皆為切片前既有，未改動仍綠） | asserts-oracle | produces-oracle | ✅ conforms |

**「一個字都沒變」怎麼被守住的：** `StrategyScriptBacktestPane.vue` 與
`StrategyScriptBacktestPane.spec.ts` 兩個檔案**都在 `git diff` 之外**。
那一塊的每一條斷言都是切片之前寫下的，而它們全綠——這是「沒變」唯一拿得出來的證據。

### Core Business Rules（PRD §4）

| ID | Clause | Oracle | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| BR-01 | 交易模式是工作檯的欄位，與名稱同一列 | 兩者同一列 | `TradingStrategyWorkbench.vue:126`（在 `workbench__identity` 內） | `TradingStrategyWorkbench.spec.ts:628` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-02 | 打開既有的顯示存著的；新的一份顯示預設值 | 兩種都對 | `use-trading-strategy-form.ts:129` | `use-trading-strategy-form.spec.ts:253`／`:261` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-03 | 跟著整份一起存，不另外驗證取值 | 送得出去；沒有第二條驗證 | `trading-strategy-write-domain.ts:62`（**只抄一行，沒有驗證**） | `use-trading-strategy-form.spec.ts:278`（改成現貨後 `rejection` 仍為 null） | asserts-oracle | produces-oracle | ✅ conforms |
| BR-04 | 只改交易模式也算改過 | 離開前要問 | 既有的 dirty 比較（未改動） | `TradingStrategyWorkbench.spec.ts:683` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-05 | 重演那一格是唯讀的一句話，內容來自存起來的那一份 | 沒有按鈕；讀 `editing` | `BacktestConditionFields.vue:204`＋`TradingStrategyWorkbenchPage.vue:186` | `TradingStrategyBacktestPane.spec.ts:249`／`:261` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-06 | 重演一份交易策略的請求不帶交易模式 | body 沒有那一欄 | request DTO 與 proxy body 皆已移除 | `backtest-proxy.spec.ts:338` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-07 | 重演一支策略腳本那一塊完全不變 | 逐字 | 那兩個檔案在 diff 之外 | 見 AC-15／AC-16 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-08 | 兩種模式那一句說明維持單一來源 | 三處讀同一份 | `TradingModeDomain`／`TRADING_MODE_DESCRIPTIONS` **一個字都沒改**；三處都走 `toOptionDto()` | `TradingStrategyWorkbench.spec.ts:639`＋`TradingStrategyBacktestPane.spec.ts:271`＋`StrategyScriptBacktestPane.spec.ts:511` | asserts-oracle | produces-oracle | ✅ conforms |

### Edge Cases（PRD §4）

| ID | Clause | Oracle | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| EC-01 | 還沒存過的那一份 | 那一句話講預設值 | `backtest-service.ts:135` | `TradingStrategyBacktestPane.spec.ts:285` | asserts-oracle | produces-oracle | ✅ conforms |
| EC-02 | 表單改了模式但沒存 | 仍然講存著的那一個 | 讀 `editing` 而不是讀表單 | 見 AC-11 | asserts-oracle | produces-oracle | 🟡 partial |
| EC-03 | 存成功 | 那一句話跟著換 | `editing` 被換掉（未改動） | 見 AC-12 | asserts-oracle | produces-oracle | ✅ conforms |
| EC-04 | 後端回來的那一份沒有交易模式（舊版後端） | 讀作預設值 | `trading-strategy-proxy.ts:210`（`?? DEFAULT_TRADING_MODE`） | `trading-strategy-proxy.spec.ts:204` | asserts-oracle | produces-oracle | ✅ conforms |
| EC-05 | 後端回了一個認不得的拼法 | 同樣讀作預設值——畫面永遠畫得出那一格 | `trading-strategy-proxy.ts:210`（先 `find` 再 fallback） | `trading-strategy-proxy.spec.ts:214` | asserts-oracle | produces-oracle | ✅ conforms |

**EC-05 不在 PRD 的 Edge Cases 表裡**，是實作時發現的：`TRADING_MODES.find(...)`
比單純的 `?? 預設值` 多守住一件事——一個認不得的拼法會讓那兩顆按鈕**兩顆都沒選**，
而使用者會看到一個沒有任何選項被選中的欄位。這一側不是那個規則的家
（後端存的時候就擋掉了），但「畫面永遠畫得出來」是這一側的責任。

### Non-Functional（PRD §6）

| ID | Clause | Oracle | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| NFR-01 | 重演一支策略腳本那一塊的每一格與每一句話一字不差 | 逐字 | 那兩個檔案在 diff 之外 | 見 AC-15／AC-16 | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-02 | 兩種模式的名字與說明不在這個專案裡出現第二份 | 沒有第二份字串 | `TRADING_MODE_DESCRIPTIONS`（`trading-mode-domain.ts`）是唯一一份；`現貨`／`多空反手` 這兩個字在 `app/` 底下只出現在那一個檔案裡 | `TradingStrategyBacktestPane.spec.ts:271`（拿那一份去比對 note，而不是自己寫死字串） | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-03 | 那一句話與那兩顆按鈕各有自己的 `data-testid` | 測試問得出「這裡是哪一種」 | `backtest-trading-mode-note`／`backtest-trading-mode-{mode}-radio`／`trading-strategy-trading-mode-{mode}-radio` | 上面每一條都在用它們 | asserts-oracle | produces-oracle | ✅ conforms |

---

## Orphans

| # | Behavior | Site | Explained by | Judgement |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `BacktestService.tradingModeOption(mode \| null)` | `backtest-service.ts:135` | AC-09、AC-13、AC-14 | ✅ 不是 orphan。它存在是因為**元件只看得到 DTO**（eslint 的 `no-restricted-imports` 擋著），所以「一種模式的名字與說明」必須由 application 交出來；而「`null` 即預設值」放在這裡是因為它與預設值本來就是同一件事的兩半 |
| 2 | `TradingStrategyService.listTradingModeOptions()` 與 `BacktestService` 的那一個同形 | `trading-strategy-service.ts:24`、`backtest-service.ts:122` | 由 `ARCH.md` §2 記載 | ⚠️ 良性。兩行一樣的 `map`，但**名字與說明只有一份**（都在 `TradingModeDomain`）。交易模式現在同時是「一份交易策略的性質」與「重演一支腳本的當次選擇」，兩個 service 各自答自己那條路——把它們併成一個，就是讓其中一條路去問一個與它無關的 service |
| 3 | `TradingStrategyBacktestPane` 的 `unpickedTradingMode`（繫結但從不使用） | `TradingStrategyBacktestPane.vue` | 條件那一塊的 model 是必填 | ⚠️ 良性。與它上面那個 `aggregationInterval` **同一個狀況、同一個寫法**（都是 `ref('')`）。第三個出現時值得把那個元件的 model 改成選填 |
| 4 | 移除了 `TradingStrategyService.defaultTradingMode()` 與它的 application 轉交 | — | `improve-codebase` 階段發現沒有呼叫端 | ✅ 正確的移除。表單直接讀那個常數（與它已經在讀彙總刻度清單同一個做法），留著就是一條沒有人走的第二條路 |
| 5 | `BacktestConditionFields` 現在有**兩個** note | `:56`／`:62` | 由 `ARCH.md` §7 記載 | ⚠️ 良性。兩者的意思一模一樣：「這一格不是填表的人決定的」。第三個出現時值得收成一個概念——在那之前照既有那一個的形狀寫 |

**Out of Scope 檢查**：PRD §1 列的五項全數**沒有對應程式碼**。逐一確認：

- **在畫面上驗證交易模式**：`trading-strategy-write-domain.ts:62` 只抄一行，沒有任何檢查。
- **在畫面上補預設值給後端**：送出的就是表單上那一個；`DEFAULT_TRADING_MODE`
  只用在「表單一打開停在哪」與「後端沒回時怎麼讀」，不是替後端補值。
- **交易策略清單那一頁**：`TradingStrategyListPanel.vue` **完全未改動**。
- **機器人那幾頁**：`app/pages/strategy-bots/` 與相關元件完全未改動。
- **回測那一列的說明文字**：`trading-mode-domain.ts`／`trading-mode-vo.ts`／
  `trading-mode-option-dto.ts` 三個檔案**一個字都沒改**。

無越界。

---

## Summary

| Status | Count |
| :--- | :--- |
| ✅ conforms | 27 |
| 🔴 violation | 0 |
| 🟠 mis-asserted | 0 |
| 🟡 partial | 3 |
| ❌ gap | 0 |
| ❔ unclear | 0 |
| ⚠️ orphan | 3（皆良性）＋2 正確的移除／不是 orphan |

**Clauses:** 30 · **Conformance:** 90%（27/30 完全一致）

三條 partial 都是**跨層接起來的那一行**（頁面把存著的那一份餵給那一列）
或**DOM 祖先關係**（那兩顆按鈕在哪一列裡）。每一段各自都有測試，
接起來的那一行由字面保證；要端到端斷言，得掛整個頁面模板加上一個假後端，
而那條路上每一段都已經各自被蓋住了。

**初稿有五條 partial，其中兩條是自己補上來的**：review 時發現
「存好之後那一句話跟著換」只有兩次獨立掛載各自斷言，沒有一條真的**換過 prop**——
而那一句話是 `computed` 讀 prop 得來的，靠的是 Vue 的 reactive props destructure。
那件事會不會動，是一個真的可能壞掉的東西，所以補了一條 `setProps` 的斷言。

### 值得記下來的兩件事

**一、`eslint` 抓到了一個我自己看不出來的分層錯誤。**
第一版的重演那一塊直接 `new TradingModeDomain(...)` 去拿那一句話——
而這個專案的 `no-restricted-imports` 明訂「元件只看得到 DTO 與哨兵錯誤」。
修法不是繞過它，是把那件事往下推成 `BacktestService.tradingModeOption(mode | null)`，
而那一推**順便把「`null` 即預設值」放回了它該待的地方**：
與預設值同一個檔案，而不是散在一個元件的 `computed` 裡。
規則擋下的那一版能跑、測試也會綠——它只是把一條規則放錯了家。

**二、「一個填了沒反應的欄位，比一個沒有的欄位糟」這件事，是這一刀真正的內容。**
把兩顆按鈕改成一句話，程式碼上只是一個 `v-if`。但它消滅的是一個**看起來有效的謊**：
使用者挑「現貨」、按執行、拿到多空反手的成績單，而畫面上那顆按鈕還亮著現貨。
停用那兩顆按鈕會留下一半的謊（「這裡有兩個選項，只是你現在不能動」）；
只有一句話說得出**答案是什麼、以及它在哪裡決定的**。
