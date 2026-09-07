# 算式內容放寬到整個檔案主體 — Requirements Brief

## Goal

目前算式編輯器把使用者關在 `Calculate` 這個進入點**裡面**：唯讀外框是「套件宣告 ＋ 匯入 ＋ `func Calculate(...) 回傳型別 {`」，使用者只能寫進入點內那幾行，收尾的 `}` 也是唯讀的。想多寫一個 helper 函式、或自訂進入點的長相，都做不到。

這個切片把可編輯範圍放大：

- **唯讀的只剩最上面那一塊**：`package main` ＋ `import ( "indicator" / "math" / "sort" )`。
- 底下**整段都可編輯**，就是一份真正的 Go 檔案主體——想寫幾個函式、幾個型別都行，只要有一個 `Calculate` 進入點。
- **開一份新的空白策略時**，可編輯區預先放一個空的 `Calculate` stub，回傳型別跟著目前選的指標值種類。
- **改指標值種類時**，自動把可編輯區裡**第一個** `func Calculate(data []indicator.KCandle) …  {` 的回傳型別換成新選的那一種。

## Requirements

**唯讀範圍縮小**

- 唯讀區固定為：`package main`、空行、`import (` 三個匯入 `)`。不再隨指標值種類變動。
- 唯讀區以下**全部可編輯**，包含原本唯讀的 `func Calculate` 那一行與收尾的 `}`。
- 送出的算式 = 唯讀區 ＋ 可編輯區。

**新的空白策略帶一個 Calculate stub**

- 第一次進畫面、以及按「開新的空白策略」時，可編輯區是一個空的 `Calculate`：
  簽章那一行 ＋ 一行空的縮排 ＋ 收尾 `}`。
- 簽章的回傳型別是目前選的指標值種類對應的形狀（信號→`indicator.Signal`；其餘四種→`map[string]…`）。

**改種類會改回傳型別**

- 改指標值種類時，把可編輯區裡**第一個**符合 `func Calculate(data []indicator.KCandle) …  {` 的那一行，回傳型別換成新選的。
- 找不到符合的那一行時，可編輯區一字不動（使用者把進入點寫成別的樣子是他的自由，後端執行時才驗）。

**載入既有策略**

- 載入一支策略時，唯讀區照舊；可編輯區是那支策略存下來的算式**去掉最上面唯讀那一塊**之後的全部。
- 認不出最上面那一塊時，整段原樣帶入並告知（沿用既有規則）。
- 之前用舊編輯器存的策略，可編輯區會顯示成「`func Calculate(...) {` ＋ 內容 ＋ `}`」——正是新模型要的樣子，不需要遷移。

**行號**

- 可編輯區的行號接在唯讀區之後，後端回報「第 N 行出錯」時對得上。

**範例內容**

- 每種指標值種類的「範例內容」現在是一整個 `Calculate` 函式（簽章 ＋ 內容 ＋ `}`），不再只是內部那幾行。

## Examples (Specification by Example)

Each example lists **only** the data that affects the behavior — nothing more.

### Rule: 唯讀區固定，其餘可編輯

| # | Given (only relevant data) | When | Then |
|---|---|---|---|
| 1 (happy) | 指標值種類選「一個數字」 | 看唯讀區 | 內容是 `package main` ＋ `import ( "indicator" "math" "sort" )`，不含 `func Calculate` |
| 2 (happy) | 指標值種類從「一個數字」改成「一個信號」 | 看唯讀區 | 一字不變 |
| 3 (happy) | 使用者在可編輯區寫了一個 helper 函式再加 `Calculate` | 送出 | 送出的算式 = 唯讀區 ＋ 使用者寫的整段，包含那個 helper |

### Rule: 開新空白策略帶一個 Calculate stub

| # | Given (only relevant data) | When | Then |
|---|---|---|---|
| 1 (happy) | 指標值種類是「一個信號」 | 開一份新的空白策略 | 可編輯區是 `func Calculate(data []indicator.KCandle) indicator.Signal {`、一行空縮排、`}` |
| 2 (happy) | 指標值種類是「一串數字」 | 第一次進畫面 | 可編輯區是回傳 `map[string][]float64` 的空 Calculate stub |
| 3 (boundary) | 可編輯區還是那個未改動的 stub | 判斷有沒有未儲存的變更 | 沒有——stub 不算「使用者寫的東西」 |
| 4 (boundary) | 可編輯區被清成完全空白 | 判斷有沒有未儲存的變更 | 沒有——空白同樣不算 |

### Rule: 改指標值種類會改第一個 Calculate 的回傳型別

| # | Given (only relevant data) | When | Then |
|---|---|---|---|
| 1 (happy) | 可編輯區是 `func Calculate(data []indicator.KCandle) map[string]float64 { … }` | 把種類改成「一個信號」 | 那一行變成 `func Calculate(data []indicator.KCandle) indicator.Signal {`，函式主體不動 |
| 2 (happy) | 可編輯區有一個 helper 在 `Calculate` 之前 | 改種類 | 只有 `Calculate` 那一行的回傳型別變，helper 不動 |
| 3 (exception) | 可編輯區裡沒有任何一行符合 `func Calculate(data []indicator.KCandle) …  {` | 改種類 | 可編輯區一字不動 |

### Rule: 載入既有策略

| # | Given (only relevant data) | When | Then |
|---|---|---|---|
| 1 (happy) | 一支策略存的算式是「唯讀區 ＋ 一整個 Calculate 函式」 | 載入它 | 可編輯區是那一整個 Calculate 函式；唯讀區照舊 |
| 2 (happy) | 一支用舊編輯器存的策略（外框含 `func Calculate` 簽章那一行） | 載入它 | 可編輯區顯示成 `func Calculate(...) 形狀 { 內容 }`，不需遷移 |
| 3 (exception) | 一支策略的算式最上面那一塊認不出來 | 載入它 | 整段原樣帶入，並告知認不出外框 |

### Rule: 行號接續

| # | Given (only relevant data) | When | Then |
|---|---|---|---|
| 1 | 唯讀區是 7 行 | 看可編輯區第一行的行號 | 是第 9 行（唯讀區 ＋ 一個空行分隔） |

## Out of Scope

- 讓使用者自訂**匯入**（多開一個第三方套件）——匯入仍固定三個；後端的白名單也只有那些。
- 前端對可編輯區做任何 Go 語法檢查——寫壞了由後端執行時回報，沿用既有的錯誤呈現。
- 後端的任何改動——後端本來就收整段算式、也本來就允許算式裡有多個頂層宣告。
- 一次算式混用多種指標值種類。

## Open Decisions

Items the PRD author should resolve:

- 唯讀區與可編輯區之間是否要一個視覺上的空行（純畫面，不影響送出的算式）。
- 範例內容的簽章那一行，縮排風格（`func Calculate` 頂格）是否要在文件裡明講。

## Context / Background

- 這反轉了 `.sdd/2026-09-02-strategy-script-authoring` 的 US-01「只寫算式真正在算的那幾行」與 US-02「外框跟著指標值種類變」的一部分：外框縮到只剩 package＋import，`func Calculate` 那一行移進可編輯區。
- 使用者要的是「不想被限制在 Calculate 方法裡」——helper 函式、自訂進入點長相都該做得到。
- 「改種類自動改第一個 Calculate 簽章」是使用者選的（相對於「認得出 stub 才改」與「完全不碰」）：簡單、選種類永遠一致，代價是使用者若手動改過簽章格式可能被覆蓋。
- 後端已確認收的是整段算式（`interp.Eval(script)` 後呼叫 `main.Calculate`），頂層多幾個宣告沒問題。
- 相依切片：`.sdd/2026-09-02-strategy-script-authoring`、`.sdd/2026-09-03-blank-strategy-draft`、`.sdd/2026-09-03-strategy-library`、`.sdd/2026-09-06-signal-result-type`。
