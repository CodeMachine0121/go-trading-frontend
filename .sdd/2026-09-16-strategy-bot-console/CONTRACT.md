# 策略機器人操作台 — Contract Verification

**Oracle:** `.sdd/2026-09-16-strategy-bot-console/PRD.md` — Section 3 acceptance criteria, Section 4 business rules, Section 6 non-functional requirements
**Design map:** `.sdd/2026-09-16-strategy-bot-console/ARCH.md`
**Glossary:** `.sdd/UL-MAP.md`（另見 `../go-trading/.sdd/UL-MAP.md`）
**Kind:** static conformance audit — 每一條的預期結果都在讀任何程式或測試之前先從 PRD 導出，
再**分別**拿它去檢查測試斷言與程式路徑。不是靠跑測試判定。

---

## 1. Clauses

✅ conforms · 🟡 partial（程式對，但沒有測試釘住）· 🟠 mis-asserted · 🔴 violation · ❌ gap

### US-01 — 一眼看出哪一台該管

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-01 | 列出自己的每一台，順序與後端相同 | 三台都在，順序不變，六個欄位都看得到 | `use-strategy-bots.ts` `load`（**沒有任何 sort**）· `StrategyBotListPanel` | ListPanel「照後端交出的順序顯示」 | ✅ |
| AC-02 | 執行中與已停止看得出差別 | 兩者標示不同 | `StrategyBotRunStateDomain.statusTone` | run state domain ＋ StatusBadge | ✅ |
| AC-03 | 停擺特別顯眼並說出原因 | 與一般已停止不同，且原因出現在畫面上 | `statusTone` 回 `danger` ＋ `haltReasonLabel` | ListPanel「停擺的那一台把原因說出來」 | ✅ |
| AC-04 | 四種停擺原因各自說得出是哪一種 | 顯示的是四種裡對的那一種 | `STRATEGY_BOT_HALT_REASON_LABELS` | run state domain 的四列表格 | ✅ |
| AC-05 | 規則打架要標出來，而且它還在跑 | 標為打架，狀態仍是執行中 | `StrategyBotStatusBadge` 兩個標籤並列 | StatusBadge「並列，不是取代」 | ✅ |
| AC-06 | 還沒送出過是一種狀態 | 那一欄寫著一句話，不是空白 | `lastSentSignalLabel` 的 default 分支 | run state domain ＋ ListPanel | ✅ |
| AC-07 | 一台都沒有時說得出下一步 | 一句說明，不是空表 | `StrategyBotListPanel` 的 `bot-list-empty` | ListPanel「不是給一張空表」 | ✅ |
| AC-08 | 後端讀不到時說得出原因並給得出重試 | 顯示後端說的那一句＋一個重試入口 | `use-strategy-bots.ts` `failureMessage` ＋ `bot-list-retry` | ListPanel「讀不到時…」 | ✅ |

### US-02 — 三顆按鈕

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-09 | 按播放 | 變成執行中，清單立刻反映 | `use-strategy-bots.ts` `start` → `runOnBot` → 重讀 | ListPanel「按播放就真的去啟動」＋ composable「播放之後重讀清單」 | ✅ |
| AC-10 | 按停止 | 變成已停止 | 同上 `stop` | composable「停止也會重讀清單」 | ✅ |
| AC-11 | 播放與停止不同時出現 | 只看得到其中一顆 | `canStart` / `canStop` ＋ `v-if` / `v-else` | ListPanel 兩個互補案例 | ✅ |
| AC-12 | 執行中時編輯不給按並說得出為什麼 | 停用，且說得出要先停止 | `canEdit` ＋ `editBlockedReason` | ListPanel「編輯不給按，並說得出為什麼」 | ✅ |
| AC-13 | 沒設定 Telegram 就啟動不了，且帶得到設定 | 顯示那一句，且畫面上有到帳號設定的連結 | `TelegramNotConfiguredError` → `deliveryNotConfigured` → `NuxtLink to="/settings"` | ListPanel「帶得出一條去設定的路」＋ composable | ✅ |
| AC-14 | 執行中的機器人達到上限 | 說出 10 台；原本那 10 台不變 | 後端的那一句原樣顯示（`failureMessage`） | composable「其餘的失敗照原樣說出來」（斷言的正是那一句） | ✅ |
| AC-15 | 刪除要先確認 | 先問；確認前那一台還在 | `askToDelete` → `ConfirmDialog` → `confirmDelete` | composable 三個案例 ＋ ListPanel「按刪除只是先問」 | ✅ |
| AC-16 | 確認之後就刪掉了 | 那一台不在清單上 | `confirmDelete` → `runOnBot` → 重讀 | composable「確認之後才真的刪」 | ✅ |
| AC-17 | 執行中的也刪得掉，不必先按停止 | 刪掉了，沒有要求先停止 | `use-strategy-bots.ts` 不檢查執行狀態 | ListPanel 用的正是一台**執行中**的機器人 ＋ application「刪除就是刪除」 | ✅ |

### US-03 — 拼出一台機器人

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-18 | 填完三段就存得起來，狀態是已停止 | 出現在清單上、已停止 | `StrategyBotFormDialog` ＋ `saveStrategyBot` | application「不帶識別碼是新增」＋ composable「存成功就關起來並重讀」 | ✅ |
| AC-19 | 信號來源只挑得到自己的可用策略 | 選單裡只有可用策略 | `use-strategy-bots.ts` `strategyOptions` 只來自 `listAvailableStrategies` | composable「機器人與可挑的策略是同一次載入的兩半」 | ✅ |
| AC-19b | 只挑得到會吐訊號的那幾支 | 選單裡只有訊號種類的 | `use-strategy-bots.ts` 兩邊各自 `filter` 到 `signal` | composable「只挑得到會吐訊號的那幾支策略」（拿掉篩選即轉紅，已驗） | ✅ |
| AC-20 | 同一支策略加兩次，只要代號不同 | 存成功，兩個各自說話 | `nextLabel()` 自動給下一個沒人用的代號 | form composable「新加的來源自動拿到一個沒人用的代號」 | ✅ |
| AC-21 | 信號來源數量有上限 | 加不了，並說出 10 | `canAddSignalSource` → 新增鍵消失 | form composable「到了上限就加不動」 | ✅ |

### US-04 — 條件是拼出來的

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-22 | 一句比對的兩個欄位都是選的 | 兩個下拉，內容各自受限，都不是打字的 | `StrategyBotConditionEditor` 兩個 `AppSelect` | Editor「兩個欄位都是選的」＋「等於是文字不是選單」 | ✅ |
| AC-23 | 把一句比對包成群組，原來那一句留著 | 群組裡兩句，縮排更深 | `wrapInGroup` | condition domain「原來那一句留在裡面」＋ Editor | ✅ |
| AC-24 | 切換群組的運算子 | 同一個群組、同樣幾句，只有運算子變 | `changeOperator` | condition domain「換運算子時那幾句一個都不動」 | ✅ |
| AC-25 | 群組裡還能再放群組 | 兩層巢狀，第二層縮排更深 | `addGroup` ＋ 元件自我遞迴 | condition domain ＋ Editor「它自己畫自己的子條件」 | ✅ |
| AC-26 | 刪掉群組裡的一句 | 剩兩句，群組還在 | `removeNode` | condition domain「群組有三句時拿得掉其中一句」 | ✅ |
| AC-27 | 不讓群組掉到只剩一句 | 刪不了，或說出至少要兩句 | `canRemove` → 刪除鍵消失 | condition domain「那兩句都拿不掉」＋ Editor「拿不掉的節點沒有移除鍵」 | ✅ |
| AC-28 | 巢狀的條件原樣讀回來 | 層次與存進去時相同，外或內且 | `StrategyBotDomain.toConditionDto` | form composable「巢狀的層次與存進去時相同」＋ proxy「條件的巢狀原樣留著」 | ✅ |

### US-05 — 送出前先擋，送出後照實講

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-29 | 買入條件為空時擋在畫面上，不送出 | 顯示那一句，且沒有送出 | `StrategyBotWriteDomain` ＋ service 先擋再送 | write domain ＋ application「一個字都不送」 | ✅ |
| AC-30 | 代號重複時擋在畫面上 | 顯示那一句，且沒有送出 | 同上 | write domain「說出是哪一個代號撞了」 | ✅ |
| AC-31 | 觸發間隔不合法時擋在畫面上 | 同上 | 同上 | write domain 的表格 | ✅ |
| AC-32 | 名稱空白時擋在畫面上 | 同上 | 同上 | write domain 的表格 | ✅ |
| AC-33 | 撞名由後端說，畫面照它說的講，表單留著 | 顯示後端那一句，內容還在 | `StrategyBotNameConflictError` ＋ `formFailureMessage`（不清表單） | proxy「名稱撞了」＋ composable「被拒絕時表單留著」 | ✅ |
| AC-34 | 指名一支已經不在的策略由後端說 | 顯示「找不到」 | `StrategyNotFoundError`（與機器人的 not-found 分開） | proxy「看不到那一支策略——它與看不到機器人是兩件事」 | ✅ |
| AC-35 | 一台已經被刪掉的機器人打不開 | 說找不到，回得到清單 | `StrategyBotNotFoundError` ＋ `getStrategyBot` | proxy「看不到那一台機器人」。**沒有測試演「點開已被刪掉的那一台」這條互動** | 🟡 |

### Section 4 — Core Business Rules

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| BR-01 | 前端不求值 | 畫面上沒有任何判斷哪一邊成立的程式 | 全切片沒有 `Holds` 之類的求值——`StrategyBotConditionDomain` 只有編輯與形狀 | 由型別與檔案內容保證（見下方 Orphans 一節的反向檢查） | ✅ |
| BR-02 | 後端的規則以「做不到」的形式出現 | 代號用選的、剩兩句不給刪、到 10 個不給加 | 選單只吃 `sourceLabels`；`canRemove` / `canAddSignalSource` 控制按鈕存在與否 | Editor 兩個「沒有按鈕」案例 ＋ form composable 兩個 | ✅ |
| BR-03 | 擋得住的擋在畫面，擋不住的照後端說的講 | 前者不送出，後者原樣顯示 | `StrategyBotWriteDomain` / `StrategyBotProxy` 的分工 | write domain「不重複驗那幾條畫面上根本按不出來的規則」 | ✅ |
| BR-04 | 播放與停止是一個位置的兩種樣子 | 只出現一顆 | `v-if` / `v-else` | ListPanel 兩個互補案例 | ✅ |
| BR-05 | 執行中時編輯停用，不是按了才拒絕 | 停用且說得出理由 | `canEdit` | ListPanel | ✅ |
| BR-06 | 刪除要確認，播放與停止不用 | 只有刪除先問 | `ConfirmDialog` 只包住刪除 | composable 三個確認案例；播放與停止的測試裡沒有任何確認步驟 | ✅ |
| BR-07 | 一次操作之後清單反映新狀態 | 不必自己重新整理 | `runOnBot` 一律重讀 | composable「播放之後重讀清單，而不是就地改那一列」 | ✅ |
| BR-08 | 打開編輯時那台已被刪掉 → 說找不到，回清單 | 同 AC-35 | 同 AC-35 | 同 AC-35 | 🟡 |
| BR-09 | 儲存被拒絕時表單內容留著 | 內容還在 | `formFailureMessage` 不動任何欄位 | composable「被拒絕時表單留著」 | ✅ |
| BR-10 | 一支會吐信號的都沒有時說得出要先寫一支 | 不是給一個空的下拉選單 | `StrategyBotSignalSourceFields` 的 `signal-sources-no-strategies`：一支都挑不到時**新增鍵換成那一句話** | SignalSourceFields「說出真正的下一步而不是給一顆通往空選單的按鈕」 | ✅ |
| BR-11 | 刪掉一個還被條件用著的來源要被擋住並說出是哪裡在用 | 刪不掉，且說出代號 | `signalSourceRemovalBlockedReasons` | form composable「還被條件用著的來源刪不掉」 | ✅ |

### Section 6 — Non-Functional Requirements

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| NFR-01 | 無輪詢、無推播 | 沒有計時器 | 全切片沒有 `setInterval` / `setTimeout` / WebSocket | 由檔案內容保證 | ✅ |
| NFR-02 | 所有路由要登入 | 401 走既有處理 | 沿用 `BackendApiProxy` 與既有的登入中介層 | 既有測試 | ✅ |
| NFR-03 | 畫面永遠拿不到指標算式 | 回應裡沒有那一欄 | `StrategyBotSignalSourceDto` / `StrategyBotSignalSource` **沒有 script 欄位**——型別上放不進去 | 由型別保證 | ✅ |
| NFR-04 | 桌面優先、窄螢幕仍靠縮排表達層次 | 縮排不隨寬度消失 | `__children` 的 `border-left` ＋ `padding-left` 是固定的，不隨斷點改 | — | 🟡 |

---

## 2. Orphans

反向檢查 PRD 的 Out of Scope：

| Out of Scope 項目 | 有沒有被實作 |
| :--- | :--- |
| **在前端求值條件樹** | 沒有。`StrategyBotConditionDomain` 只有編輯操作與形狀規則，**沒有任何 `Holds` / `evaluate`**——這是刻意的，後端才是答案的來源 |
| 即時更新清單 | 沒有。切片內沒有任何計時器或推播訂閱 |
| 回測一台機器人 | 沒有 |
| 執行紀錄 | 沒有（後端也沒有） |
| 在這個畫面建立或編輯策略 | 沒有。只**讀** `listAvailableStrategies` |
| 從這個畫面設定 Telegram | 沒有。只有一個到 `/settings` 的連結 |
| 拖曳排序、複製機器人、分組 | 沒有 |

沒有找到任何對應不到條款的行為。

---

## 3. Summary

```
Contract verification complete for "策略機器人操作台".
Oracle: PRD Acceptance Criteria — 51 clauses (36 AC · 11 BR · 4 NFR).

✅ 48 conforms · 🔴 0 violations · 🟠 0 mis-asserted · 🟡 3 partial · ❌ 0 gaps · ⚠️ 0 orphans
Conformance: 94%
```

### 稽核當場解掉的落差 — BR-10

PRD 第 4 節寫著：「**可用策略是空的**：說得出要先有一支會吐信號的策略，
而不是給一個空的下拉選單。」

實作原本只做了一半：沒有信號來源時說「這台機器人還沒有任何信號來源」，
但一支可用策略都沒有時，新增來源的按鈕仍然在，按下去會得到一個空的策略選單。

它不是程式壞了（送出去仍然會被擋），而是**畫面在一個它明明知道原因的地方保持沉默**。
已改為一支都挑不到時把新增鍵換成那一句話，並加上測試。

### 🟡 Partial（行為正確，但沒有測試把它釘住）

| ID | 缺什麼 | 值不值得補 |
| :--- | :--- | :--- |
| AC-35 / BR-08 | 沒有測試演「點開一台已經被刪掉的機器人」這條互動 | 值得，但要先讓編輯路徑改走 `getStrategyBot`（現在是直接用清單上那一份） |
| NFR-04 | 縮排在窄螢幕下仍在——沒有視覺回歸測試 | 這個專案沒有視覺回歸的作法，補了也只是斷言一個 CSS 值 |

### 稽核當場補上的測試（本次已進版）

- **US-01 與 US-02 的整段互動先前沒有任何元件測試**：四種狀態、空清單、
  錯誤與重試、播放與停止互斥、編輯停用、Telegram 那一句帶不帶得出連結、
  刪除要先確認——全部只有 composable 層的覆蓋，而那一層看不到
  「畫面上到底出不出現那顆按鈕」。已加 `StrategyBotListPanel.spec.ts`（11 個案例）。

> **Ceiling:** 靜態稽核——拿 PRD 的預期結果分別檢查測試斷言與程式路徑，
> 不是靠跑測試判定，也不會自己發明情境去執行。
