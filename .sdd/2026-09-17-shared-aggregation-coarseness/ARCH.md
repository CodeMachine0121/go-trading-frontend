# Architecture Design — 一份交易策略只看一種粗細

**PRD:** `.sdd/2026-09-17-shared-aggregation-coarseness/PRD.md`
**Status:** Implemented

---

## 1. Design Goal

消滅的是**不一致**，不是「各自挑」這個能力。

第一版把刻度搬成整份交易策略的一格，讓不一致拼不出來。
那確實消滅了不一致——連同「調某一塊零件的粗細」這件事一起消滅了，
而那是使用者真的要做的事。

所以這一版回到：**每一塊零件各自帶著自己的粗細**，
送出之前檢查它們是否相同。

---

## 2. Change Scope

### 修改

| 檔案 | 改動 |
| :--- | :--- |
| `app/domain/models/domains/trading-strategy-write-domain.ts` | 多一條送不出去的理由：幾塊零件粗細不一樣，並列出現在有哪幾種。 |
| `app/composables/use-trading-strategy-form.ts` | 新加的零件跟著架上第一塊的粗細，而不是一律用預設值。 |

### 明確不動

- **零件設定彈窗、零件架、工作檯**：刻度那一格留在它原本的位置。
- **`TradingStrategySignalSourceDto` 與送出去的形狀。**
- **回測分頁、機器人表單與清單。**

---

## 3. Key Decisions

### 為什麼這一條規則值得驗

這個 repo 的前端規矩是「畫面按不出來的錯不要再驗一次」——
代號重複、群組只剩一句、第 11 個信號來源，那幾種在畫面上根本按不出來。

粗細不一致**按得出來**，而且是一次點擊的事。所以它正好落在這條規矩的另一邊：
它是少數幾條「打得出來但仍然不對」的規則之一，與代號重複同一類。

### 那句話要說出現在有哪幾種

只說「不一樣」的話，他得把每一塊零件的設定都打開一次才知道差在哪，
而要做的事就是把它們調成同一個。措辭與後端那一句講的是同一件事。

### 新零件跟著架上，不跟著預設值

一加零件就撞到那句提醒，等於每次都要他去修一件他沒做過的事。
跟著架上第一塊，一般情況下那句話就永遠不會出現——
它只在使用者**自己去改某一塊**的時候說話，而那時他知道自己剛做了什麼。

### 架上重新寫出每一塊的粗細

它們現在真的可能不一樣，所以那一行又是資訊了——
而且是他不必打開任何設定就找得出哪一塊落單的方式。

---

## 4. 下一個需求會打在哪裡

下一個需求若是**允許不同刻度並自動對齊**，它會打在
`TradingStrategyWriteDomain` 的那一條上：拒絕變成一個選擇。
零件身上那個欄位從頭到尾沒有搬過家，所以那一天不必再動一次資料形狀。

---

## 5. Traceability

| PRD 情境 | 由誰滿足 |
| :--- | :--- |
| 零件設定裡有那一格 | `TradingStrategyPieceSettingsDialog.vue` |
| 調完就存得下去 | `use-trading-strategy-form.ts` 的 `changeSignalSourceInterval` |
| 架上看得出每一塊現在是哪一種 | `TradingStrategyPieceShelf.vue` |
| 每一塊都一樣時什麼都不必提 | `TradingStrategyWriteDomain.mixedCoarsenessRejection` |
| 不一樣時擋下來、說出有哪幾種 | 同上 |
| 儲存鍵按不下去 | `TradingStrategyWorkbench.vue`（既有的 `rejection` 那條路） |
| 調回來就送得出去 | 同上 |
| 新零件跟著架上已經有的 | `use-trading-strategy-form.ts` 的 `addSignalSource` |
| 架上一塊都沒有時用預設值 | 同上 |
