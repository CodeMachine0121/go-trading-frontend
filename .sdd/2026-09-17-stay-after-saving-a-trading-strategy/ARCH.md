# Architecture Design — 存好了留在原地

**PRD:** `.sdd/2026-09-17-stay-after-saving-a-trading-strategy/PRD.md`
**Status:** Implemented

---

## 1. Design Goal

把「存好之後發生什麼」從**一次跳轉**換成**三件各自獨立的事**：
說一句話、讓上一次的重演作廢、必要時接手剛建好的那一份。

三件事都放進 composable，頁面只留下它真正該知道的那一件——**跳轉**。
這與那一頁原本就寫著的理由一致：一個知道怎麼跳轉的 composable，
就跟著知道了它被放在哪一條路由底下。

---

## 2. Change Scope

### 修改

| 檔案 | 改動 |
| :--- | :--- |
| `app/composables/use-trading-strategy-workbench.ts` | `saved` 換成 `savedGeneration`（存幾次）與 `createdId`（剛建好的那一份）；`announcement` 交出去給這一頁自己顯示。 |
| `app/components/templates/TradingStrategyWorkbenchPage.vue` | 存好不再跳轉；`savedGeneration` 改由 composable 給；多一顆回清單的按鈕與一則提示條；剛建好時把網址換成那一份的。 |
| `app/components/organisms/TradingStrategyWorkbench.vue` | 存好之後重新記一次「打開時的樣子」；底部的「取消」拿掉。 |

### 明確不動

- 儲存失敗、找不到那一份、未存變更提醒三條路。
- 回測分頁、清單那一頁、策略機器人工作台。

---

## 3. Key Decisions

### 存好一份新的之後要換網址，這不是修飾

留在 `/trading-strategies/new` 而表單裡的識別碼還是空的話，
**再按一次儲存就會建出第二份**。換成 `/trading-strategies/{id}` 同時解決三件事：
再存一次改的是同一份、重新整理還在那一份上、回測分頁拿得到識別碼。

用 replace 而不是 push：那條「新拼一份」的網址已經不再指向任何存在的狀態，
留在上一頁堆疊裡只會讓上一頁變成一個回不去的地方。

### `savedGeneration` 從頁面搬進 composable

它是「這一份被存過幾次」——那是存這件事的狀態，不是這一頁的排版。
原本擺在頁面上而且**從來沒有被加過**：回測那一側等著它變，而它永遠是 0。
搬進去之後它與 `save()` 在同一個地方，加不加一目了然。

### 存好之後要重新記一次「打開時的樣子」

工作檯用「現在要送出去的那一份」與「剛打開時的那一份」比對來判斷有沒有未存的改動。
存好之後不再走，那個基準就過時了——他會在一個**已經存好**的頁面上被攔下來問
「還沒存，確定要離開嗎」。基準跟著存成功往前走，那句話才說得準。

### 「取消」拿掉

儲存不再離開之後，一顆叫「取消」的按鈕旁邊放著一顆不會離開的「儲存」，
讀起來像在問取消什麼。回清單那顆按鈕去的是同一個地方，而且說得出自己要去哪。
兩顆都留著，只是多一個要猜的東西。

---

## 4. 下一個需求會打在哪裡

下一個需求大概是**存好之後自動切到回測分頁**。
它會打在頁面那個 `watch` 上：多改一行 `destination`。
`savedGeneration` 已經在 composable 裡，所以「存過了」這件事不必再算一次。

---

## 5. Traceability

| PRD 情境 | 由誰滿足 |
| :--- | :--- |
| 存好一份既有的就留在原地 | `TradingStrategyWorkbenchPage.vue`（拿掉那個跳轉） |
| 看得到「更改成功」 | `useTradingStrategyWorkbench().announcement` + 頁面上的提示條 |
| 存好之後成績單清掉 | `useTradingStrategyWorkbench().savedGeneration` |
| 存好之後離開不被攔 | `TradingStrategyWorkbench.vue` 重新記基準 |
| 存好一份新的就接手那一份 | `useTradingStrategyWorkbench().createdId` + 頁面 replace 網址 |
| 剛拼好的馬上回測得動 | 同上（回測分頁因此拿得到識別碼） |
| 再按一次不會多出一份 | 同上 |
| 兩個分頁都看得到回清單 | `TradingStrategyWorkbenchPage.vue`（按鈕在分頁切換之上） |
| 有沒存的改動先問過 | 既有的 `onBeforeRouteLeave` |
