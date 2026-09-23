# 操作台的體驗整理 — Oracle（預期結果，先於實作寫下）

每一列的「預期結果」都只從 `PRD.md` 的 AC 場景與 `ARCH.md` 的元件責任推導，**不參考任何實作**。
測試的每一個斷言值一律取自本表；若某個值只能靠跑實作才得知，就是本表不完整，回頭補或問。

## 一、唯讀的策略腳本

### `PublishedStrategyScriptDto.toContent`

| # | 輸入 | 預期結果 |
|---|---|---|
| R1 | 市集上的「均線交叉」：種類 `numberSeries`、參數 `週期 = 20` | 內容的算式是 `''`、種類是 `numberSeries`、參數恰好一個 `週期 = 20` |

### `useStrategyScriptLibrary`（mock `IStrategyScriptProxy` 與市集 proxy；真實 application / service）

清單：自己的「RSI 背離」（id 1）、我加入的「均線交叉」（id 9）。

| # | 前提 | 動作 | 預期結果 |
|---|---|---|---|
| R2 | 編輯區沒有改過 | 挑 9 | `activeAdoptedStrategyScript` 是「均線交叉」；`applyContent` 收到 `('', 均線交叉的種類, 均線交叉的參數)`；`activeStrategyScript` 是 `null`；沒有開任何對話框 |
| R3 | 唯讀中（R2 之後，編輯區內容等於它載入的那一份） | 挑 1 | 不開確認框；`activeAdoptedStrategyScript` 是 `null`；`activeStrategyScript` 是「RSI 背離」 |
| R4 | 唯讀中 | 開一份新的空白 | 不開確認框；`activeAdoptedStrategyScript` 是 `null` |
| R5 | 自己的「RSI 背離」改了一半沒存 | 挑 9 | 開的是 `discard` 確認框；`activeAdoptedStrategyScript` 仍是 `null` |
| R6 | R5 之後 | 確認丟掉 | `activeAdoptedStrategyScript` 是「均線交叉」 |
| R7 | 載入自己的「RSI 背離」 | — | `activeAdoptedStrategyScript` 是 `null` |
| R8 | 唯讀中 | 重新讀清單，而「均線交叉」已不在清單上 | `activeAdoptedStrategyScript` 仍是「均線交叉」（重讀不順手改使用中的那一支） |

### `IndicatorCalculationPanel`（掛載；mock application 的 proxy）

| # | 前提 | 動作 / 觀察 | 預期結果 |
|---|---|---|---|
| R9 | 挑了我加入的「均線交叉」 | 讀面板 | 有一則說明「這支策略腳本是從市集加入的，不是你的——可以拿來試跑、回測，但不能修改。」 |
| R10 | 同上 | 讀儲存、另存、改名、分享、帶入範例 | 五顆都 `disabled` |
| R11 | 同上 | 讀指標值種類選單 | `disabled` |
| R12 | 同上 | 讀算式那一欄 | 寫著「這支策略腳本的算式不公開」，而且沒有程式碼編輯器 |
| R13 | 同上 | 按試跑 | 送去算的請求帶著 `strategyScriptId = 9` |
| R14 | 挑了自己的「RSI 背離」 | 讀面板 | 沒有那則唯讀說明；儲存、另存、改名、分享、帶入範例都**不是** `disabled` |
| R15 | 挑了自己的「RSI 背離」 | 按試跑 | 請求**沒有** `strategyScriptId` |

### `StrategyScriptParameterDialog` / `StrategyScriptParameterList`

| # | 前提 | 觀察 | 預期結果 |
|---|---|---|---|
| R16 | `readonly`、一個參數「週期」 | 讀清單 | 參數名稱與預設值的輸入都 `disabled`；沒有新增、也沒有刪除的按鈕 |
| R17 | 不是 `readonly` | 讀清單 | 新增與刪除照舊都在 |

### `IndicatorScriptEditor`

| # | 前提 | 觀察 | 預期結果 |
|---|---|---|---|
| R18 | `concealed` | 讀編輯區 | 寫著「這支策略腳本的算式不公開」；沒有程式碼編輯器 |
| R19 | 不是 `concealed` | 讀編輯區 | 有程式碼編輯器；沒有那句話 |

### 回測：`StrategyScriptBacktestPane` → `BacktestService` → `BacktestProxy`

| # | 前提 | 動作 | 預期結果 |
|---|---|---|---|
| R20 | 回測請求帶著 `strategyScriptId = 9` | proxy 送出 | 送出的內容有 `strategyScriptId: 9`，**沒有** `script`、**沒有** `parameters`；`parameterValues` 照送 |
| R21 | 回測請求沒有識別碼、算式是 `package main…` | proxy 送出 | 送出的內容有 `script` 與 `parameters`，**沒有** `strategyScriptId` |
| R22 | 面板收到 `strategyScriptId = 9` | 按執行回測 | 交給 application 的回測請求 `strategyScriptId` 是 9 |

## 二、等待看得出來

### `useRequestActivity`（fake timers）

| # | 動作 | 預期結果 |
|---|---|---|
| W1 | 開始一件，過 199 毫秒 | `visible` 為 false |
| W2 | 開始一件，過 200 毫秒 | `visible` 為 true |
| W3 | 開始一件，過 150 毫秒就結束，再過 1000 毫秒 | `visible` 從頭到尾為 false |
| W4 | 開始兩件，過 200 毫秒；結束第一件 | `visible` 仍為 true |
| W5 | W4 之後結束第二件 | `visible` 為 false |
| W6 | 同一件的結束函式叫兩次，另一件還在 | `visible` 仍為 true（叫兩次只算一次） |
| W7 | 全部結束後再開始一件 | 又要等 200 毫秒才 `visible` |

### `BackendApiProxy`（經由 `BackendHealthProxy`、`AssistantConversationProxy`、`IndicatorCalculationProxy` 觀察；mock `$fetch`）

| # | 動作 | 預期結果 |
|---|---|---|
| W8 | 一般的一發（挑一段對話 `getConversation`），`$fetch` 還沒回 | `beginWaiting` 被叫了一次、結束函式還沒被叫 |
| W9 | W8 的那一發成功回來 | 結束函式被叫了一次 |
| W10 | 一般的一發失敗（後端拒絕） | 結束函式照樣被叫了一次；錯誤照舊往上拋 |
| W11 | 一般的一發被回 401、救回、重送成功 | `beginWaiting` 只被叫了**一次**、結束函式一次 |
| W12 | 連線燈的檢查 `fetchBackendHealth` | `beginWaiting` 沒有被叫 |
| W13 | 助手回頭詢問 `refreshConversation(5)` | `beginWaiting` 沒有被叫；打的是與 `getConversation(5)` 同一個網址，回來的對話相同 |
| W14 | 圖上跟著最新那一根重算 `recalculateIndicator` | `beginWaiting` 沒有被叫；送出的內容與 `calculateIndicator` 相同 |
| W15 | 送給 `$fetch` 的選項 | **不含** `background` 這個鍵（它不是給後端的） |

### 背景路徑往上接

| # | 動作 | 預期結果 |
|---|---|---|
| W16 | `AssistantConversationApplication.refreshConversation(5)` | 打的是 proxy 的 `refreshConversation(5)`，不是 `getConversation` |
| W17 | `ChartIndicatorApplication.recalculateChartIndicator(dto)` | 打的是 proxy 的 `recalculateIndicator`，回來的圖上指標與 `calculateChartIndicator` 同一份輸入時相同 |
| W18 | `useAssistantConversation` 作答中回頭詢問 | 呼叫的是 `refreshConversation` |
| W19 | `useChartIndicators` 一根走完後重算 | 呼叫的是 `recalculateChartIndicator`；使用者加入一支時呼叫的是 `calculateChartIndicator` |

### `AppProgressBar`

| # | 前提 | 預期結果 |
|---|---|---|
| W20 | `active` 為 true | 有一條 `role="progressbar"` 的橫條 |
| W21 | `active` 為 false | 那條橫條不在 |

## 三、沒有「連線狀態」

| # | 觀察 | 預期結果 |
|---|---|---|
| H1 | 寬螢幕側欄 | 八個去處，沒有「連線狀態」；第一個是「K 線瀏覽」 |
| H2 | 窄螢幕「更多」 | 恰好 K 線瀏覽、Marketplace、交易策略、設定四條 |
| H3 | 登入成功、沒有原本想去的那一頁 | 導向 `/k-candles/chart` |
| H4 | 已登入的人走到 `/login` | 導向 `/k-candles/chart` |
| H5 | 被放行的人走到 `/pending-approval` | 導向 `/k-candles/chart` |

## 四、門口只有登入畫面

| # | 前提 | 動作 | 預期結果 |
|---|---|---|---|
| D1 | 第一次導覽、確認瞬間完成 | 走進任何一頁 | 中介層在 **600 毫秒**之前不做決定；到 600 毫秒才導向 |
| D2 | 第一次導覽、確認花了 900 毫秒 | 走進任何一頁 | 到 900 毫秒才做決定（不多等） |
| D3 | 第二次導覽 | 換一頁 | 不再等最短停留 |
| D4 | `nuxt.config` | — | `ssr` 為 `false` |
| D5 | 門口的載入 | 讀 `spa-loading-template.html` | 含「正在確認登入狀態…」 |
