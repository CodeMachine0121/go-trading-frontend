# 操作台的體驗整理 — Contract Verification Matrix

**Contract source:** `.sdd/2026-09-23-console-ux-enhancements/PRD.md`（Acceptance Criteria 為 oracle）
**Design map:** `.sdd/2026-09-23-console-ux-enhancements/ARCH.md`（§7 Traceability 當地圖，不當契約）
**Scope:** `go-trading-frontend`，分支 `chore/console-ux-enhancements` 對 `origin/main`
**Verified:** 2026-09-23
**Oracle:** 42 條（AC 28 · BR 11〔核心規則 7 ＋ 邊界 4〕· NFR 3）
**Ceiling:** 靜態一致性稽核。每一條先由 PRD 文字推出 oracle（未參考 ORACLE.md），
再各自拿**測試斷言**與**程式路徑**去對照；不以「跑完全套變綠」當判準。
僅對映射到條款的兩組測試做過佐證執行（`IndicatorCalculationPanelStrategyScript.spec.ts -t 加入來的那些`：10 passed；
`signed-in.global.spec.ts -t 門口`：4 passed）。

> 這一刀有一類特別的條款：**接線與設定**（`ssr: false`、`spa-loading-template.html`、`app.vue` 掛上進度條、
> `plugins/dependencies.ts` 把報到接給每一支 proxy、`pages/index.vue` 的轉址）。
> `vitest.config.ts` 把 `app.vue`、`pages/`、`plugins/` 排除在覆蓋率外，也沒有任何測試掛起它們。
> 程式讀起來明確產出 oracle、但沒有斷言釘住的，一律標 🟡，並說出是哪一段沒被釘住。

---

## Clauses

### US-01 — 我加入的策略腳本看得到、用得了、改不動

| ID | Clause | Oracle（僅由 PRD 推出） | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AC-01.1 | 挑到我加入的那一支就進入唯讀 | 編輯區唯讀；上方逐字出現「這支策略腳本是從市集加入的，不是你的——可以拿來試跑、回測，但不能修改。」 | `use-strategy-script-library.ts:143-151`（`activeAdoptedStrategyScript`）；`IndicatorCalculationPanel.vue:181`（`readOnly`）、`:346-353`（`AppAlert tone="info"`，選單正下方） | `IndicatorCalculationPanelStrategyScript.spec.ts:1012`（`toBe` 逐字） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.2 | 唯讀時看得到它的種類與參數但改不動 | 種類顯示「一串數字」且停用；參數鍵顯示「參數 1」；打開後看得到「週期 20」但改不動 | `PublishedStrategyScriptDto.toContent`；`IndicatorCalculationPanel.vue:404`（種類停用）、`:438`（參數 N）、`:790`；`StrategyScriptParameterList.vue`（`:disabled="readonly"`、無新增/移除） | `IndicatorCalculationPanelStrategyScript.spec.ts:1037`、`:1056`；`StrategyScriptParameterList.spec.ts:21`（值 `週期`/`20`，三格皆 disabled）、`:33` | asserts-oracle（種類以選單值 `floatList` 斷言，經 UL-MAP 對應「一串數字」） | produces-oracle | ✅ conforms |
| AC-01.3 | 唯讀時算式不公開 | 那一欄逐字「這支策略腳本的算式不公開」；沒有算式、也無處可打字 | `IndicatorScriptEditor.vue:60-64`（`concealed` 時不掛編輯器）；`IndicatorCalculationPanel.vue:389` | `IndicatorCalculationPanelStrategyScript.spec.ts:1074`（逐字＋編輯器不存在）；`IndicatorScriptEditor.spec.ts` 的 `it.each` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.4 | 唯讀時會改動它的動作一律按不下去 | 儲存、另存、改名、分享、帶入範例五個都停用 | `IndicatorCalculationPanel.vue:273`、`:283`、`:421`；改名 `:293`／分享 `:312` 靠 `activeStrategyScript === null`（進入唯讀時設為 null） | `IndicatorCalculationPanelStrategyScript.spec.ts:1021`（五個 testid 逐一 `disabled`） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.5 | 唯讀時照樣試跑得了 | 按試跑後算的是「均線交叉」本身（指名它，不帶算式） | `IndicatorCalculationPanel.vue:240-246`（帶 `activeAdoptedStrategyScript.id`）→ 既有 `IndicatorCalculationProxy` 指名規則 | `IndicatorCalculationPanelStrategyScript.spec.ts:1083`（proxy 收到 `strategyScriptId: 9`） | asserts-oracle（結果顯示是既有路徑，未另斷言） | produces-oracle | ✅ conforms |
| AC-01.6 | 唯讀時照樣回測得了 | 在唯讀中的策略腳本頁執行回測 → 回測的是「均線交叉」並顯示成績 | `IndicatorCalculationPanel.vue:779`（把 id 傳給回測）→ `StrategyScriptBacktestPane.vue:127` → `backtest-request-domain.ts:54-59,85` → `backtest-proxy.ts:190-199` | `StrategyScriptBacktestPane.spec.ts:757`（**直接把 `strategyScriptId: 9` 當 prop 塞進去**）；`backtest-proxy.spec.ts:555`；`backtest-application.spec.ts` | **shallow**：沒有任何面板層測試從「挑到加入的那一支」一路走到回測。`IndicatorCalculationPanel.vue:779` 那一行拿掉，全部測試照樣綠；「顯示它的成績」也沒斷言 | produces-oracle | 🟠 mis-asserted |
| AC-01.7 | 離開唯讀挑自己的一支不必確認 | 沒有確認；編輯區換成「RSI 背離」且改得動 | `use-strategy-script-library.ts:218`；`loadedContent = adopted.toContent()` 讓 `hasUnsavedChanges` 為假 | `IndicatorCalculationPanelStrategyScript.spec.ts:1130`（無「放棄尚未儲存的變更？」、說明消失、編輯器回來）；`use-strategy-script-library.spec.ts:75` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.8 | 離開唯讀開一份空白不必確認 | 沒有確認；編輯區是改得動的空白 | `use-strategy-script-library.ts:175-180`（`applyBlankContent` 清掉 adopted） | `use-strategy-script-library.spec.ts:86`（`openDialog === 'none'`、不再唯讀；真的 application/domain） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.9 | 有尚未儲存的變更時先確認 | 先問要不要丟掉；答應後才進入唯讀 | `use-strategy-script-library.ts:143`（`guardOverwritingDraft` 包住進入唯讀） | `use-strategy-script-library.spec.ts:96`（先 `discard`、未唯讀；`confirmDiscard` 後才唯讀） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.10 | 自己的一支一切照舊 | 改得動；儲存／另存／改名／分享按得下去；沒有唯讀說明 | `use-strategy-script-library.ts:218`；`readOnly` 為假 | `IndicatorCalculationPanelStrategyScript.spec.ts:1101`（說明不存在、五顆皆 enabled、試跑不帶 id） | asserts-oracle | produces-oracle | ✅ conforms |

### US-02 — 等待看得出來

| ID | Clause | Oracle | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AC-02.1 | 按了之後要等一會兒 | 按「存回目前這一支」而系統慢回 → 畫面頂端出現進度條；回話後收掉 | `backend-api-proxy.ts:149-157`（每一發報到）；`plugins/dependencies.ts:109` 起把 `beginWaiting` 接給每一支 proxy；`app.vue:115-116,144` 掛上 `AppProgressBar` | 各段單測：`backend-api-proxy.spec.ts`（報到/結束）、`use-request-activity.spec.ts:15`、`AppProgressBar.spec.ts` | **no-test（端到端）**：`dependencies.ts` 的接線與 `app.vue` 的掛載都在覆蓋率外、無任何斷言；少接一支 proxy 或拿掉 `<AppProgressBar>` 不會紅 | produces-oracle | 🟡 partial |
| AC-02.2 | 同時在等兩件事 | 第一件回來進度條還在；第二件回來才收 | `use-request-activity.ts`（計數而非布林） | `use-request-activity.spec.ts:52` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.3 | 一眨眼就回來的不閃 | 0.2 秒內回話 → 進度條從頭到尾不出現 | `use-request-activity.ts:7`（`WAITING_VISIBLE_AFTER_MILLISECONDS = 200`） | `use-request-activity.spec.ts:15`（199/200 邊界）、`:27`、`:38` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.4 | 失敗時照樣收掉 | 失敗那一件回來 → 進度條收掉；失敗原因照舊顯示 | `backend-api-proxy.ts:152-157`（`finally`） | `backend-api-proxy.spec.ts:64`（結束一次、錯誤照舊上拋） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.5 | 即時更新不算 | K 線圖表即時更新在跑、使用者什麼都沒按 → 進度條不出現 | `LiveKCandleProxy` 走 EventSource（不經 `BackendApiProxy`）；`use-chart-indicators.ts` 一根走完改走 `recalculateChartIndicator` → `indicator-calculation-proxy.ts:84-91`（`background: true`） | `KCandleChartPanelLiveEdge.spec.ts`／`KCandleChartPanelLiveUpdates.spec.ts`（走完一根只走 `recalculateIndicator`）；`indicator-calculation-proxy.spec.ts:506`（不報到） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.6 | 助手作答中的回頭詢問不算 | 定期回頭詢問 → 進度條不出現 | `use-assistant-conversation.ts`（`refreshCurrentConversation(true)`）→ `assistant-conversation-proxy.ts:121-124` | `use-assistant-conversation.spec.ts:196`；`backend-api-proxy.spec.ts:107` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.7 | 連線燈的定期檢查不算 | 燈去問一次後端 → 進度條不出現 | `backend-health-proxy.ts:19`（`background: true`） | `backend-api-proxy.spec.ts:96` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.8 | 換畫面時也走一次 | 從 K 線圖表換到策略機器人 → 換頁期間進度條走一次 | `use-request-activity.ts:74-84`（`page:loading:start/end`、`vue:error`）；`app.vue:116` 呼叫 `followNavigation()` | `use-request-activity.spec.ts:116` 起（**手動 `callHook`**） | **no-test（接線）**：計數對 hook 的反應有測，但 `app.vue` 有沒有接上沒有任何斷言 | produces-oracle（見下方「措辭／門檻」第 1 點） | 🟡 partial |

### US-03 — 沒有「連線狀態」這個去處

| ID | Clause | Oracle | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AC-03.1 | 寬螢幕的側欄 | 八個去處、沒有「連線狀態」；連線燈還在 | `ConsoleLayout.vue:31-40`（`DESTINATIONS` 少 `/`） | `ConsoleLayout.spec.ts:87`（`toEqual` 有序八項）、`:123`、`:178` 的 `it.each`（`status` 插槽） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03.2 | 窄螢幕的「更多」 | 只有 K 線瀏覽、Marketplace、交易策略、設定四條 | 同一張表的 `primary: false` 四列 | `ConsoleLayout.spec.ts:209`（四條逐一）＋ `:242`（連結共 8＝4 格＋4 條，排除第五條） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03.3 | 登入成功沒有原本想去的地方 | 到 K 線圖表 | `use-user-session.ts:18`（`HOME_PATH = '/k-candles/chart'`） | `use-user-session.spec.ts:301` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03.4 | 打開網址的根目錄 | 已登入打開 `/` → 到 K 線圖表 | `pages/index.vue:8`（`definePageMeta({ redirect: HOME_PATH })`） | 無（`pages/` 不測） | no-test | produces-oracle | 🟡 partial |

### US-04 — 門口只有登入畫面

| ID | Clause | Oracle | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AC-04.1 | 沒登入的人打開操作台 | 先看到登入畫面的載入動畫 → 接著登入表單可輸入；任何一刻都沒有側欄或任何一頁內容 | `nuxt.config.ts:34`（`ssr: false`）、`:42`；`spa-loading-template.html`（品牌記號＋轉動記號＋`:108`「正在確認登入狀態…」）；`signed-in.global.ts:63` | `signed-in.global.spec.ts:65`（導到登入）只釘住轉址 | **no-test**：「只露出門口、不露出空殼」全靠 SPA 設定與靜態模板，無斷言 | produces-oracle | 🟡 partial |
| AC-04.2 | 已登入的人打開某一頁 | 先看到載入 → 直接是策略腳本那一頁；中間沒有空白操作台 | 同上 | `signed-in.global.spec.ts:77`（放行）只釘住放行 | no-test（無空殼那一段） | produces-oracle | 🟡 partial |
| AC-04.3 | 確認幾乎瞬間完成 | 沒登入、確認瞬間完成 → 載入至少停留 0.6 秒才換成表單 | `signed-in.global.ts:9,33-43`（第一次換頁 `Promise.all` 最短停留） | `signed-in.global.spec.ts:193`（599ms 未決定）、`:202`（600ms 才導到登入）、`:211`（久於 600 不多等） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04.4 | 連不上系統 | 載入收掉、表單出現、表單說明連不上系統 | 既有 `useUserSession.restoreOnce`（視同沒登入＋留下訊息）；門口同上 | `use-user-session.spec.ts:117`（當作沒登入、訊息含「連不上後端」） | asserts-oracle（載入收掉那一段歸 AC-04.1） | produces-oracle | ✅ conforms |
| AC-04.5 | 還沒被放行 | 直接到等待開通那一頁 | `signed-in.global.ts:76` | `signed-in.global.spec.ts:123` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04.6 | 重新整理一頁之後回到那一頁 | 先載入 → 登入表單；登入成功後回到 K 線圖表 | `signed-in.global.ts:63`（`rememberRedirectTo`）；既有登入後回原頁 | `signed-in.global.spec.ts:71`、`use-user-session.spec.ts:291` | asserts-oracle（載入那一段歸 AC-04.1） | produces-oracle | ✅ conforms |

### Section 4 — Core Business Rules 與 Edge Cases

| ID | Clause | Oracle | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| BR-1 | 唯讀的判定只看「它是不是我加入的」，沒有第三種狀態 | 加入的→唯讀；自己的或空白→不唯讀 | `IndicatorCalculationPanel.vue:181` 單一 computed；library 三條路各自設/清 | `use-strategy-script-library.spec.ts:52`、`:75`、`:86`、`:109` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-2 | 唯讀時跑的是那一支本身；畫面上不帶任何算式 | 試跑與回測都指名那一支、帶它自己的種類與參數預設；不送算式 | 試跑同 AC-01.5；回測 `backtest-proxy.ts:190-199`（只送識別碼、`parameterValues` 照送） | `IndicatorCalculationPanelStrategyScript.spec.ts:1083`；`backtest-proxy.spec.ts:555`；`published-strategy-script-dto.spec.ts` | asserts-oracle（面板→回測的接線缺口已記在 AC-01.6） | produces-oracle | ✅ conforms |
| BR-3 | 唯讀時不可能有尚未儲存的變更；進入唯讀前照既有規則確認 | 離開唯讀不問；進入前有未存變更會問 | `use-strategy-script-library.ts:143-151`（`loadedContent = content`） | `use-strategy-script-library.spec.ts:75`、`:96`；面板 `:1130` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-4 | 使用者在等的＝使用者操作觸發、畫面在等回話；背景的＝畫面自己定期做的。前者算、後者不算 | 使用者按下去在等回話的每一發都讓進度條亮 | `backend-health-proxy.ts:19` 把**整支**健康檢查標成背景 | `backend-api-proxy.spec.ts:96`（斷言「連線燈的檢查不報到」，不分是否使用者按的） | mis-asserted（把手動重新檢查也當背景） | **diverges**：側欄燈的「重新檢查」鍵（`BackendStatusIndicator.vue:53-59` → `pages/*/…vue` 的 `@recheck="checkBackendHealth"`）是**使用者按的、在等回話**，照 PRD 定義該算，現在卻不報到 | 🔴 violation（嚴重度低） |
| BR-5 | 進度條只有一條：還有任何一件沒回來它就在 | 共用一份計數 | `use-request-activity.ts`（`useState` 共用）；`dependencies.ts:109` 同一個 `beginWaiting` | `use-request-activity.spec.ts:52`、`:148`、「兩個地方取用的是同一份」 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-6 | 門口的順序：先確認你是誰 → 再決定給你看哪一頁；之前唯一畫出來的是載入 | 同 AC-04.1 | `nuxt.config.ts:34,42`；`signed-in.global.ts:33-43` | 中介層的「先等確認再決定」有測（`:193`），「唯一畫出來的是載入」無 | no-test（畫面那一半） | produces-oracle | 🟡 partial |
| BR-7 | 第一站＝K 線圖表（登入成功無原頁、已登入走到登入/等待開通、打開根目錄） | 三種情境都到 `/k-candles/chart` | `use-user-session.ts:18`；`pages/index.vue:8` | `use-user-session.spec.ts:301`；`signed-in.global.spec.ts:83`、`:156`；根目錄**無** | 部分 asserts-oracle，根目錄 no-test | produces-oracle | 🟡 partial |
| BR-8 | 邊界：唯讀中那一支被收回 | 下次重讀清單時它消失；唯讀中的畫面在那之前照舊 | `use-strategy-script-library.ts`（`refreshStrategyScripts` 不動使用中的 adopted） | `use-strategy-script-library.spec.ts:117` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-9 | 邊界：唯讀中試跑失敗 | 失敗原因照舊顯示在執行結果那裡 | 同一條 `calculationRun` 路徑，唯讀不分叉 | 無唯讀情境下的失敗測試 | no-test | produces-oracle | 🟡 partial |
| BR-10 | 邊界：等待中換到別的畫面 | 前一頁那幾件回來時照樣收掉，不卡住 | 計數與頁面無關；`backend-api-proxy.ts:155-157` `finally` | `use-request-activity.spec.ts:148`；`backend-api-proxy.spec.ts`（每一發結束一次） | asserts-oracle | produces-oracle | ✅ conforms |
| BR-11 | 邊界：門口確認時連不上系統 | 視同沒登入，給登入表單並說明連不上 | 既有 `restoreOnce` | `use-user-session.spec.ts:117` | asserts-oracle | produces-oracle | ✅ conforms |

### Section 6 — Non-Functional Requirements

| ID | Clause | Oracle | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| NFR-1 | Performance：門口最短 0.6 秒、最長等同確認時間；進度條門檻 0.2 秒 | 兩個數字各只一處、邊界成立 | `signed-in.global.ts:9`；`use-request-activity.ts:7` | `signed-in.global.spec.ts:193/202/211`；`use-request-activity.spec.ts:15` | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-2 | Security：沒登入的人在任何一刻都看不到任何操作台畫面（含空殼） | 同 AC-04.1 | `nuxt.config.ts:34`；`spa-loading-template.html` | 無 | no-test | produces-oracle | 🟡 partial |
| NFR-3 | Compatibility：桌機與手機（寬 390）四件事都成立 | 窄螢幕上唯讀、進度條、去處、門口都成立 | `IndicatorScriptEditor.vue:175-186`（窄編輯器置中說明，commit `e7691d4`）；`spa-loading-template.html`（`max-width: 22rem`、`padding`） | 只有導覽有窄螢幕測試（`ConsoleLayout.spec.ts` 的 `PHONE`）；唯讀/門口/進度條在 390 寬度無斷言 | no-test（除導覽外） | produces-oracle | 🟡 partial |

---

## Out of Scope（負面清單）

| 項目 | 結果 |
| :--- | :--- |
| 看得到別人的算式；複製成自己的 | 未發現。`toContent()` 算式一律 `''`，回測/試跑只送識別碼 |
| 唯讀時調整這一次的參數值 | 未發現。參數值欄位 `disabled`；`parameterValues` 送的是分享者的預設值 |
| 蓋住整個畫面的等待遮罩 | 未發現。`AppProgressBar` 為 `position: fixed`、`pointer-events: none`、高 0.1875rem |
| 把連線狀態那一頁的內容搬到別處 | 未發現。`BackendHealthCard.vue` 連同測試刪除，未移植 |
| 登入畫面本身的欄位、規則與措辭 | 未發現改動（`pages/login` 無 diff） |
| 系統那一側的任何改變 | 未發現 |

## Orphans（沒有條款解釋的行為）

| Code | Description | Verdict |
| :--- | :--- | :--- |
| `backtest-request-domain.ts:57-59` | 同時指名一支又自帶算式時擋下，訊息「指名一支策略腳本與自帶一段算式只能挑一種」 | undocumented（PRD 沒有這條拒絕；合理的防呆，但應補進 PRD 或 UL-MAP） |
| `IndicatorScriptEditor.vue:43-47` | 唯讀時編輯器標頭的提示改寫成「從市集加入的，只能用、不能改」 | undocumented 措辭（PRD 只規定「算式不公開」那一行與上方 `AppAlert`） |
| `StrategyScriptParameterList.vue:52-54` | 唯讀且無參數時說「這支策略腳本沒有可調的東西。」 | undocumented 措辭 |

---

## 措辭、門檻與 PRD 文字的比對

1. **換頁也受 0.2 秒門檻管**：`followNavigation` 走同一個 `beginWaiting`，所以 0.2 秒內完成的換頁**不會**亮進度條。
   PRD US-02「換頁期間進度條走一次」字面上是每一次都走；但 §5 寫了「等待超過 0.2 秒才出現。換頁時同一條走一次」。
   目前的實作採後者的讀法，建議在 PRD 把「換頁也吃 0.2 秒門檻」寫明，免得下一次被當成缺陷。
2. **逐字相符**：唯讀說明（`IndicatorCalculationPanel.vue:352`）、「這支策略腳本的算式不公開」、「正在確認登入狀態…」、
   「參數 1」、「更多」裡的四條與側欄八項順序，都與 PRD 一字不差。
3. **門檻數值**：`WAITING_VISIBLE_AFTER_MILLISECONDS = 200`、`DOOR_MINIMUM_DWELL_MILLISECONDS = 600`，各只出現一處，邊界皆有測。
4. **ARCH 與實作的小落差（不影響契約）**：ARCH 寫 `page:start`／`page:finish`，實作用的是 `page:loading:start`／`page:loading:end`
   （Nuxt 3.21 的 router plugin 確實會在每次導覽發出，見 `node_modules/nuxt/dist/pages/runtime/plugins/router.js:150,245`）。
5. **唯讀時的動作**：PRD 列的五個（儲存、另存、改名、分享、帶入範例）全數停用；「從市集收回」只對自己已分享的那一支出現，唯讀時不會出現，符合。

---

## Summary

- Conforms: **30/42** clauses ✅（**71%**）
- Violations: **BR-4**（側欄燈的手動「重新檢查」是使用者在等的一發，卻被整支標成背景、不亮進度條——`backend-health-proxy.ts:19`）
- Mis-asserted: **AC-01.6**（回測只在回測窗格層以 prop 注入 id 測過；`IndicatorCalculationPanel.vue:779` 的接線沒有任何面板層斷言）
- Partial: **AC-02.1, AC-02.8, AC-03.4, AC-04.1, AC-04.2, BR-6, BR-7, BR-9, NFR-2, NFR-3**（多為 `app.vue`／`plugins/`／`pages/`／`nuxt.config.ts`／靜態模板的接線，覆蓋率刻意排除且無斷言）
- Gaps: 無
- Unclear: 無
- Orphans: 3（皆為 undocumented，無一落入 Out of Scope）

> 靜態一致性稽核：逐條以 PRD 推出的 oracle 判斷測試斷言與程式路徑，不以跑完全套為判準；
> 動態證明 🟡 那幾條（尤其門口與進度條的接線），請以 `/tdd` 或截圖腳本 `scripts/shots.mjs --no-js` 補上。
