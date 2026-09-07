# Product Requirements Document (PRD) — 算式內容放寬到整個檔案主體

**Status:** Finalized
**Version:** v1.0
**Owner:** James Hsueh
**Stakeholders:** 專案作者本人
**Source brief:** `.sdd/2026-09-07-editable-script-body/BRIEF.md`

---

## 1. Background & Goal

- **Problem Statement:** 算式編輯器把使用者關在 `Calculate` 進入點**裡面**：唯讀外框含 `func Calculate(...) 回傳型別 {`，收尾 `}` 也唯讀。想多寫 helper 函式或自訂進入點長相，都做不到。
- **Expected Outcome:** 唯讀的只剩最上面的 `package main` ＋ `import ( "indicator" "math" "sort" )`。底下整段可編輯，就是一份真正的 Go 檔案主體。開新空白策略時，可編輯區預填一個空的 `Calculate` stub，回傳型別跟著指標值種類；改種類會自動改第一個 `Calculate` 簽章的回傳型別。
- **Out of Scope:** 自訂匯入；前端做 Go 語法檢查；後端任何改動；一次混用多種指標值種類。

---

## 2. User Personas

- **Primary Role:** 策略研究者（專案作者本人）。
- **Usage Context:** 桌面瀏覽器，指標計算頁的算式編輯器。寫算式、預覽、調、回測，一輪很多次。

---

## 3. User Stories & Acceptance Criteria

### US-01 — 唯讀區只剩 package 與 import [priority: P0]

**As a** 策略研究者, **I want** 只有最上面的套件宣告與匯入是唯讀的,
**so that** 我能在底下寫 helper 函式、也能自訂進入點的長相。

```gherkin
Scenario: 唯讀區不含進入點
  Given 指標值種類是「一個數字」
  When 使用者看唯讀區
  Then 唯讀區是 package main 與 import（"indicator"、"math"、"sort"）
  And 唯讀區不含 func Calculate 那一行

Scenario: 唯讀區不隨指標值種類變
  Given 指標值種類從「一個數字」改成「一個信號」
  When 使用者看唯讀區
  Then 唯讀區一字不變

Scenario: 可編輯區可以放進入點以外的函式
  Given 使用者在可編輯區寫了一個 helper 函式，接著寫 Calculate
  When 使用者送出
  Then 送出的算式是唯讀區加上使用者寫的整段，含那個 helper
```

### US-02 — 新的空白策略帶一個 Calculate stub [priority: P0]

**As a** 策略研究者, **I want** 開一份新的空白策略時可編輯區已經有一個空的 Calculate,
**so that** 我不必每次自己把簽章與括號打出來。

```gherkin
Scenario: 信號種類的空白 stub
  Given 指標值種類是「一個信號」
  When 使用者開一份新的空白策略
  Then 可編輯區是「func Calculate(data []indicator.KCandle) indicator.Signal {」、一行空的縮排、「}」

Scenario: 一串數字種類的空白 stub
  Given 指標值種類是「一串數字」
  When 使用者第一次進入畫面
  Then 可編輯區是回傳 map[string][]float64 的空 Calculate stub

Scenario: 未改動的 stub 不算未儲存的變更
  Given 還沒載入過任何策略
  And 可編輯區還是那個未改動的 stub
  When 判斷有沒有未儲存的變更
  Then 沒有

Scenario: 清成空白也不算未儲存的變更
  Given 還沒載入過任何策略
  And 可編輯區被清成完全空白
  When 判斷有沒有未儲存的變更
  Then 沒有
```

### US-03 — 改指標值種類會改第一個 Calculate 的回傳型別 [priority: P0]

**As a** 策略研究者, **I want** 改種類時第一個 Calculate 的回傳型別自動跟著換,
**so that** 我不必自己回去改簽章，選了一種卻寫成另一種的機會也少一點。

```gherkin
Scenario: 改種類換掉第一個 Calculate 的回傳型別
  Given 可編輯區是 func Calculate(data []indicator.KCandle) map[string]float64 { … }
  When 使用者把指標值種類改成「一個信號」
  Then 那一行變成 func Calculate(data []indicator.KCandle) indicator.Signal {
  And 函式主體一字不動

Scenario: helper 函式不受影響
  Given 可編輯區在 Calculate 之前有一個 helper 函式
  When 使用者改指標值種類
  Then 只有 Calculate 那一行的回傳型別變，helper 不動

Scenario: 沒有符合的進入點那一行時不動它
  Given 可編輯區裡沒有任何一行符合 func Calculate(data []indicator.KCandle) …  {
  When 使用者改指標值種類
  Then 可編輯區一字不動
```

### US-04 — 載入既有策略 [priority: P0]

**As a** 策略研究者, **I want** 載入策略時可編輯區是它存下來的算式去掉唯讀那一塊之後的全部,
**so that** 我看得到、也改得到它的進入點與所有 helper。

```gherkin
Scenario: 載入一支存了整個 Calculate 函式的策略
  Given 一支策略存的算式是「唯讀區加上一整個 Calculate 函式」
  When 使用者載入它
  Then 可編輯區是那一整個 Calculate 函式
  And 唯讀區照舊

Scenario: 載入一支用舊編輯器存的策略
  Given 一支策略存的算式最上面是 package、import、然後才是 func Calculate 簽章
  When 使用者載入它
  Then 可編輯區顯示成「func Calculate(...) 形狀 {」、內容、「}」
  And 不需要任何遷移

Scenario: 認不出最上面那一塊
  Given 一支策略的算式最上面那一塊不是那七行固定的內容
  When 使用者載入它
  Then 整段算式原樣帶入可編輯區
  And 畫面告知認不出外框
```

### US-05 — 行號接續 [priority: P1]

**As a** 策略研究者, **I want** 可編輯區的行號接在唯讀區之後,
**so that** 後端說「第 N 行出錯」時我在畫面上數得到同一行。

```gherkin
Scenario: 可編輯區從唯讀區之後開始編號
  Given 唯讀區是 7 行
  When 使用者看可編輯區第一行的行號
  Then 是第 9 行（唯讀區加上一個分隔的空行）
```

---

## 4. Business Flow & Logic

- **BR-1 唯讀區固定七行**：`package main` / 空行 / `import (` / 三個匯入 / `)`。不隨指標值種類變。
- **BR-2 可編輯區 = 檔案主體**：唯讀區以下全部，包含進入點簽章與收尾。送出的算式 = 唯讀區 ＋ 一個空行 ＋ 可編輯區。
- **BR-3 空白 stub**：新的空白策略的可編輯區 = `func Calculate(data []indicator.KCandle) <形狀> {` ＋ 一行空縮排 ＋ `}`。形狀由目前的指標值種類決定（信號→`indicator.Signal`；其餘→`map[string]…`）。
- **BR-4 改種類重打簽章**：改指標值種類時，把可編輯區裡第一個符合 `func Calculate(data []indicator.KCandle) …  {` 的那一行，回傳型別換成新種類的形狀。找不到就一字不動。
- **BR-5 未儲存判斷**：還沒載入過策略時，可編輯區是「空白」或「該種類未改動的 stub」都不算未儲存的變更；其餘算。
- **BR-6 拆解**：載入策略時，算式若以那七行固定內容開頭，可編輯區 = 其後的全部（去掉緊接的空行與尾端多的一個換行）。否則整段原樣帶入、標記認不出外框。舊編輯器存的算式因為前七行相同，會被認得，可編輯區剛好是「整個 Calculate 函式」。
- **BR-7 範例內容**：每種指標值種類的範例內容是一整個 `Calculate` 函式（簽章 ＋ 內容 ＋ `}`），簽章頂格。

### Edge Cases

- 可編輯區完全空白就送出：前端擋下（沿用「算式內容去空白後不得為空」）。
- 可編輯區沒有 `Calculate`：前端不擋，後端執行時回「必須提供 Calculate 進入點」，沿用既有錯誤呈現。
- 可編輯區有多個 `func Calculate(...)`：只改第一個的簽章（BR-4）；後端執行時自有它的規則。

---

## 5. UI/UX Design & Interaction

- 編輯器：一個唯讀 `AppCodeEditor` 顯示七行固定內容，下面一個可編輯 `AppCodeEditor` 顯示檔案主體。中間視覺上留一個空行（**Open Decision #1** 定案：留，純畫面）。
- 可編輯區**不再整段縮排**——它是頂層 Go。
- 編輯器提示文字改成講「在 import 底下寫你的算式，至少要有一個 Calculate 進入點；換指標值種類會改它的回傳型別」。
- 收尾 `}` 的唯讀編輯器移除。

---

## 6. Non-Functional Requirements

- **Performance:** 改種類時重打一行簽章是純字串處理，無 I/O。
- **Compatibility:** 舊編輯器存的策略不需遷移（BR-6）。後端不受影響——它本來就收整段算式。
- **Analytics:** 無。

---

## 7. Dependencies & Risks

- **Dependencies:** 後端 `interp.Eval(script)` 收整段算式並呼叫 `main.Calculate`；頂層多幾個宣告沒問題（已確認）。
- **Risks:**
  - BR-4「一律改第一個 Calculate 簽章」：使用者若把簽章改成非標準格式（換行、加註解），改種類時可能被覆蓋。使用者選這個做法時已知悉。
  - 反轉了 `strategy-script-authoring` 的 US-01/US-02 一部分——UL-MAP 的「算式外框」「算式內容」定義要同步更新。

---

## 8. Appendix

- 需求共識：[BRIEF.md](BRIEF.md)
- 通用語言：[../UL-MAP.md](../UL-MAP.md)
- 相依切片：`.sdd/2026-09-02-strategy-script-authoring`、`.sdd/2026-09-03-blank-strategy-draft`、`.sdd/2026-09-03-strategy-library`、`.sdd/2026-09-06-signal-result-type`

### Open Decisions（定案）

1. 唯讀區與可編輯區之間留一個視覺空行——**留**（純畫面，送出的算式也有這個空行，Go 慣例）。
2. 範例內容簽章頂格——**是**，文件明講（BR-7）。
