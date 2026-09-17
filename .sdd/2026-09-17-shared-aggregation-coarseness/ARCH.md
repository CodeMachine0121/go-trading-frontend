# Architecture Design — 刻度是整份交易策略的一格

**PRD:** `.sdd/2026-09-17-shared-aggregation-coarseness/PRD.md`
**Status:** Implemented

---

## 1. Design Goal

把「一份交易策略只有一種刻度」從**一條要驗的規則**變成**一個拼不出反例的形狀**。

這個 repo 的前端規矩本來就這麼寫：畫面按不出來的錯不要再驗一次，
因為那是替一個不會發生的情況維護一段程式。所以這個切片的正確結果是
**`TradingStrategyWriteDomain` 一個字都不必加**。

---

## 2. Change Scope

### 修改

| 檔案 | 改動 |
| :--- | :--- |
| `app/composables/use-trading-strategy-form.ts` | 多一個 `aggregationInterval`，整份共用；`changeSignalSourceInterval` 換成 `changeAggregationInterval`；送出去時每個來源都帶它。 |
| `app/components/organisms/TradingStrategyWorkbench.vue` | 頂端多一格選單，以及讀進來原本混著時的那一句話。 |
| `app/components/organisms/TradingStrategyCanvas.vue` | 不再往下傳刻度選項與換刻度那個事件。 |
| `app/components/organisms/TradingStrategyPieceSettingsDialog.vue` | 刻度那一格拿掉。 |
| `app/components/organisms/TradingStrategyPieceShelf.vue` | 每塊零件旁邊那一行刻度拿掉。 |

### 明確不動

- **`TradingStrategyWriteDomain`**：見上。拼不出來的東西不驗。
- **`TradingStrategySignalSourceDto` 與送出去的形狀**：每個來源仍然各自帶一個刻度欄位。
  後端收的是那個形狀，而它只是現在永遠一樣。
- **回測分頁**：它那一格早就是一句唯讀的話。
- **機器人表單與清單。**

---

## 3. Key Decisions

### 真相只有一份，在送出去的那一刻才鋪開

`aggregationInterval` 是一個 ref，零件身上那個欄位不再是真相——
組要送出去的那一份時，每個來源的刻度一律改寫成它。

兩邊各存一份的話（ref 一份、每個零件一份），第二份遲早會說出第一份沒有的話，
而那正是這個切片要消滅的那一類 bug。

### 讀進來取第一個，並且說出來

一份舊的混合資料沒有「正確答案」可以挑。取第一個是個**任意但可解釋**的選擇，
而讓它可以接受的不是那個選法，是**說出來**：
畫面明講它原本有哪幾種、存下去會變成什麼。

悄悄統一是這裡唯一真正糟糕的做法——他按下儲存，另外幾個零件被改掉，而他不會發現。

### 零件架上不再寫刻度

每一塊零件旁邊寫著同一個值不是資訊。它現在寫在頂端一次。

---

## 4. 下一個需求會打在哪裡

下一個需求若是**允許不同刻度並自動對齊**，它會打在這一格上：
那時它從「整份的刻度」變成「對齊到哪一個」，而零件身上那個欄位會重新變成真相。

送出去的形狀從來沒有改過，正是為了那一天不必再動一次後端。

---

## 5. Traceability

| PRD 情境 | 由誰滿足 |
| :--- | :--- |
| 刻度在工作檯頂端 | `TradingStrategyWorkbench.vue` |
| 零件設定裡沒有刻度了 | `TradingStrategyPieceSettingsDialog.vue` |
| 換掉那一格、每個零件一起換 | `use-trading-strategy-form.ts` 的 `buildWriteDto` |
| 新加的零件也跟著 | `use-trading-strategy-form.ts` 的 `addSignalSource` |
| 一致的那一份安安靜靜 | `use-trading-strategy-form.ts` 的 `loadedIntervals` |
| 混著的那一份明講 | `TradingStrategyWorkbench.vue` |
| 直接儲存就調一致了 | `use-trading-strategy-form.ts` 的 `buildWriteDto` |
