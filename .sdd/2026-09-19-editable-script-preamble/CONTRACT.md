# 算式開頭那幾行也交給使用者（畫面）— Contract Verification Matrix

**Contract source:** `.sdd/2026-09-19-editable-script-preamble/PRD.md`（Acceptance Criteria 為 oracle）
**Design map:** `.sdd/2026-09-19-editable-script-preamble/ARCH.md`
**Scope:** `go-trading-frontend`
**Verified:** 2026-09-19
**Ceiling:** 靜態一致性稽核。逐條把**測試斷言**與**程式路徑**各自對照規格推出的 oracle，
而不是拿測試比對程式。全套 203 檔 2868 條綠、`eslint` / `stylelint` / `nuxt typecheck` 皆乾淨——
但那不是判準：綠燈可能斷言錯東西，這張表就是為了看出那件事。

---

## Clauses

### US-01 — 編輯區就是一整份算式

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-01 | 沒有任何唯讀區塊，開頭的宣告與匯入就在編輯區裡且改得動 | 畫面上只有**一塊**程式碼區，而且它是可編輯的 | `IndicatorScriptEditor.vue:45`（唯一一個 `AppCodeEditor`，不帶 `readonly`） | `IndicatorScriptEditor.spec.ts:60`（`contenteditable === 'true'` **且** `.cm-content` 只有一個） | ✅ conforms |
| AC-02 | 編輯區第一行標示為第 1 行 | 行號從 1 起算，不再從外框之後接續 | `AppCodeEditor.vue:98` 的 `lineNumbers()`（`startLineNumber`／compartment 一併刪除） | `IndicatorScriptEditor.spec.ts:68`（`toEqual(['1','2','3'])`） | ✅ conforms |
| AC-03 | 刪掉一個匯入後送出：送去執行的就是眼前那一份 | 送出的算式**逐字等於**編輯區內容 | `indicator-calculation-request-domain.ts:61`（不接合、不修剪） | `indicator-calculation-request-domain.spec.ts:61`（整份 `toBe`）＋`:89`（前後空白行原樣保留）＋`IndicatorCalculationPanel.spec.ts:401`（從畫面打完整一份，斷言 proxy 收到的 `script` 整份 `toBe`） | ✅ conforms |
| AC-04 | 多寫一個輔助函式後儲存：存下來的是眼前那一整份 | 存下的算式**逐字等於**編輯區內容 | `strategy-script-write-domain.ts:40` | `strategy-script-write-domain.spec.ts:22`（整份 `toBe`）＋`:35`（三種「不像樣」的內容都逐字存回）＋`strategy-script-application.spec.ts:163` | ✅ conforms |

**AC-03／AC-04 的斷言刻意是整份 `toBe` 而不是 `toContain`。** 這一刀唯一要證明的就是
「一個字都沒動」，而 `toContain` 放得過任何被偷偷加上的開頭。

### US-02 — 新的空白策略腳本自動補上開頭與進入點

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-05 | 信號種類：按「新的空白策略腳本」後，編輯區是開頭那幾行＋一個回傳信號的空進入點 | 預填內容＝七行開頭 ＋ 空行 ＋ `func Calculate(...) indicator.Signal {` ＋ 空縮排 ＋ `}` | `indicator-script-domain.ts:107` 的 `blankScript()` | `indicator-script-domain.spec.ts:26`（五種種類逐一整份 `toBe`，含 signal） | ✅ conforms |
| AC-06 | 一串數字種類：第一次進畫面，編輯區是開頭＋回傳 `map[string][]float64` 的空進入點 | 同上，回傳形狀跟著種類 | 同上；畫面入口 `IndicatorCalculationPanel.vue:94`（`describeBlankStrategyScript()`） | `indicator-script-domain.spec.ts:26`（floatList 一列）＋`indicator-calculation-service.spec.ts:97`（空白內容的三樣一次驗齊）＋`IndicatorCalculationPanel.spec.ts:335`（第一次進畫面確實看得到開頭與進入點） | ✅ conforms |
| AC-07 | 編輯區還是未改動的預填內容時，按「新的空白策略腳本」不跳確認 | 沒有「放棄尚未儲存的變更？」 | `strategy-script-draft-domain.ts:50`（與 `blankScript()` 去空白後比對） | `strategy-script-draft-domain.spec.ts:58`（兩種種類）＋`IndicatorCalculationPanelStrategyScript.spec.ts:165`（畫面上確實不出現那句話） | ✅ conforms |
| AC-08 | 編輯區被清成完全空白時，同樣不跳確認 | 沒有那句確認 | `strategy-script-draft-domain.ts:44` | `strategy-script-draft-domain.spec.ts:43`（完全空白／只有空白字元兩列） | ✅ conforms |
| AC-09 | **只刪掉預填開頭的一個匯入**時，先跳確認 | 有那句確認——開頭那幾行現在也是使用者寫的 | 同一條比對：內容與 `blankScript()` 不同即算改過 | `strategy-script-draft-domain.spec.ts:72`（正是「只改開頭」那一種） | ✅ conforms |

**AC-09 是這一刀最容易漏掉的一條。** 開頭從「畫面的東西」變成「使用者的東西」，
若未存變更的比對還停在進入點那一段，使用者刪掉的匯入會被下一次載入靜靜蓋掉。
falsify 也是從這裡下手：把比對改成只看進入點那一段，`:58` 兩列立刻紅。

### US-03 — 範例內容是一整份可直接執行的算式

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-10 | 按「填入範例」後，編輯區是開頭＋整個進入點函式 | 範例算式以七行開頭起頭，且含該種類的 `Calculate` 與 `return` | `indicator-script-domain.ts:117` 的 `exampleScript()`；服務入口 `indicator-calculation-service.ts:61` | `indicator-script-domain.spec.ts:43`（四種種類）＋`:51`（signal）＋`IndicatorCalculationPanel.spec.ts:313`（畫面上按下去之後含 `package main`／`import (`／`Calculate`／`均價`） | ✅ conforms |
| AC-11 | 填入範例後**直接送得出去**，不必自己補任何一行 | 按「填入範例」再送出，畫面不擋、請求帶著那一整份範例出去 | `fillExampleScript`（`IndicatorCalculationPanel.vue:184`）寫回 `script`，送出路徑逐字轉交（`indicator-calculation-request-domain.ts:61`），空白是唯一的擋門 | `IndicatorCalculationPanel.spec.ts:313`（填進去的內容）＋**稽核後補上的** `:327`（按範例→按送出，斷言 proxy 收到的整份以 `package main` 起頭、含匯入與該種類的進入點，且畫面沒有任何欄位錯誤） | ✅ conforms |

### US-04 — 載入既有策略腳本原文照搬

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-12 | 載入一支策略腳本，編輯區是那一整份、一字不差 | 帶進畫面的內容**逐字等於**後端存的算式 | `strategy-script-domain.ts:22`（不再拆解，直接交出 `strategyScript.script`） | `strategy-script.spec.ts:5`（整份 `toBe`）＋`strategy-script-application.spec.ts:45` | ✅ conforms |
| AC-13 | 開頭多匯入了一樣東西時照樣原文帶入，**且不出現任何關於開頭的提示** | 內容原文＋畫面上沒有通知 | 同上；`use-strategy-script-library.ts` 的「認不出外框」那一則通知已刪除 | `IndicatorCalculationPanelStrategyScript.spec.ts:148`（斷言看得到 `"strings"` **且** `strategy-script-notice` 不存在）＋`strategy-script.spec.ts:18`＋`strategy-script-application.spec.ts:60` | ✅ conforms |
| AC-14 | 載入後一個字都沒改再存一次，存下的與載入時逐字相同，開頭只出現一次 | 存回去的算式 `toBe` 載入時拿到的算式 | 讀寫兩端都不動內容：`strategy-script-domain.ts:22` ＋ `strategy-script-write-domain.ts:40` | `strategy-script-application.spec.ts:172`（**走完整條來回**：列出→取那一份內容→存→斷言送出的 `script` `toBe` 後端原本存的那一份） | ✅ conforms |

**AC-14 的測試刻意不自己造一份內容。** 它拿的是清單交出來的那一份，
因為這一條要證的正是「讀進來的與寫回去的是同一份」——自己造一份就只證明了 `toBe` 會動。

### US-05 — 改指標值種類只動進入點那一行

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-15 | 改種類：進入點那一行改為回傳信號，**開頭那幾行與函式內容一字不動** | 只有那一行變，其餘整份相同 | `indicator-script-domain.ts:128`（regex 只換第一個簽章） | `indicator-script-domain.spec.ts:69`（含開頭的整份 `toBe`）＋`:78`（helper 不動）＋`:97`（使用者改過的開頭不會被改回來）＋`IndicatorCalculationPanel.spec.ts:345`／`:375` | ✅ conforms |
| AC-16 | 認不出進入點那一行時，編輯區一字不動 | 整份原樣回傳 | 同上（`CALCULATE_SIGNATURE_PATTERN` 不中就直接回傳） | `indicator-script-domain.spec.ts:107`（整份 `toBe`） | ✅ conforms |

**AC-15 多了一條規格沒寫、但這一刀必須成立的斷言**（`:97`「使用者改過的開頭不會被改回來」）：
改種類會重打簽章，若順手把整份預填內容也重建一次，使用者刪掉的匯入就會自己長回來。

### US-06 — 寫壞了由執行那一方說

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-17 | 開頭被刪掉了，照樣把那一份送去執行 | 畫面不擋，請求帶著那份殘缺的算式出去 | `indicator-calculation-request-domain.ts:47`（唯一的門是「整份空白」） | `indicator-calculation-request-domain.spec.ts:76`（`toBe('func Calculate() {}')`）＋`IndicatorCalculationPanel.spec.ts:416`（從畫面走一遍，斷言 proxy 確實收到那一份） | ✅ conforms |
| AC-18 | 整份空白時當場在算式那一格說「請填寫算式內容」，且不送出 | 拒絕指著**算式**那一格，訊息逐字為那一句 | `indicator-calculation-request-domain.ts:49`（`IndicatorCalculationFieldError('script', …)`）；回測側同規則 `backtest-request-domain.ts:56` | `indicator-calculation-request-domain.spec.ts:140`（欄位 `toBe('script')` ＋訊息整句 `toBe`）＋`IndicatorCalculationPanel.spec.ts:185`（訊息長在算式那一格旁且 proxy 一次都沒被呼叫）＋`backtest-application.spec.ts`（回測側同一句、同一格） | ✅ conforms |

### §5 UI／§6 NFR

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| UI-01 | 編輯器只剩一塊可編輯的程式碼區 | 同 AC-01 | `IndicatorScriptEditor.vue:45` | `IndicatorScriptEditor.spec.ts:60` | ✅ conforms |
| UI-02 | 說明文字不再說「在 import 底下寫」 | 提示改成說明整份都改得動 | `IndicatorScriptEditor.vue:36`；頁面副標 `indicator-calculations/index.vue:31`；說明對話框兩處 | 無專屬斷言——斷言一段固定文案只是把它抄第二遍 | 🟡 partial |
| UI-03 | 「認不出開頭」的通知從畫面移除 | 載入任何一支都不出現那類通知 | `use-strategy-script-library.ts`（該段已刪） | `IndicatorCalculationPanelStrategyScript.spec.ts:148`（`notice` 不存在） | ✅ conforms |
| NFR-01 | 不新增任何對外請求 | 本切片沒有新的 proxy 呼叫 | 無新增 proxy／介面；`git diff` 未觸及 `app/infrastructure/` | 無專屬斷言（是一條「沒有多做什麼」的規格）；既有 proxy 測試全數未改動而綠 | 🟡 partial |
| NFR-02 | 手機直立（390）仍可讀可用 | 版面不因這一刀變差 | `IndicatorScriptEditor.vue` 的 `__file` 仍保 `min-height: 24rem`；少了一塊唯讀區，可寫高度只增不減 | 無測試（視覺規格） | 🟡 partial |

---

## Orphans

| # | Behavior | 出處 | 判定 |
| :--- | :--- | :--- | :--- |
| 1 | `describeBlankStrategyScript()` 取代「預設種類＋空白算式」兩次提問；`describeExampleScript()` 取代 `IndicatorScriptTemplateDto` | `indicator-calculation-service.ts:61`／`:82`；ARCH §6 已記 | 不是孤兒：**行為不變的介面收斂**，由 improve 階段產生並寫進 ARCH。AC-06／AC-10 的測試從新介面進入 |
| 2 | `scriptBody` → `script` 全面改名（含欄位錯誤鍵） | 跨 DTO／domain／元件 | 不是孤兒：ARCH §1「第二個決定」已記；AC-18 的欄位鍵斷言就是它的守門人 |
| 3 | 「指名一支策略腳本」與「自帶一段算式」互斥 | `indicator-calculation-request-domain.ts:43` | **既有行為**，不屬於這一刀的合約（它來自圖表套用策略腳本那一刀）。這次只改了它的欄位鍵，並補上兩條測試釘住 | 
| 4 | `AppCodeEditor` 的 `startLineNumber` prop、`IndicatorScriptBodyVo`、`StrategyScriptDto.frameRecognised`、`IndicatorScriptTemplateDto` 一併刪除 | 見 ARCH §2 | 不是孤兒：都是「分界消失」之後沒有呼叫端的東西，ARCH 已逐項列出 |

**Out of Scope 檢查**：PRD 列的四項（前端語法檢查／既有腳本遷移／後端改動／改變可用匯入範圍）
一項都沒有被實作——`app/infrastructure/` 與後端 repo 皆未觸及，也沒有任何遷移程式碼。

---

## Summary

| 判定 | 數 |
| :--- | :--- |
| ✅ conforms | 19 |
| 🟠 mis-asserted | 0（AC-11 已於稽核後補上斷言） |
| 🟡 partial | 4（UI-02、NFR-01、NFR-02） |
| 🔴 violation | 0 |
| ❌ gap | 0 |
| ❔ unclear | 0 |
| ⚠️ orphan | 0（4 項已逐一歸因） |

**Conformance：23 條中 19 條完全成立（83%），沒有任何一條行為錯誤。**
剩下 3 條 `partial` 是固定文案與視覺規格，對它們寫斷言只會把同一段字抄第二遍。

### 稽核抓到、並已修好的一條

**AC-11** 原本是 🟠：規格說「填入範例後**直接送得出去**」，而測試只驗了填進去的內容
長什麼樣。兩者之間有一段沒有人守著的路——`fillExampleScript` 寫回的值到送出之間
若有任何一次修剪或包裝，這一條會在測試**全綠**的情況下壞掉。

已補上 `IndicatorCalculationPanel.spec.ts:327`：按範例 → 按送出 → 斷言 proxy 收到的
就是那一整份範例。falsify 確認過它會紅（把填入的範例砍掉開頭，這一條與 `:313` 同時紅）。
這是測試缺口，不是程式錯誤——程式路徑本來就是對的。
