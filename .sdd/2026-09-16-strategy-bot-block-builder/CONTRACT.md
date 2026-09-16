# Contract Verification — 策略機器人積木工作台

**Oracle:** `./PRD.md` 第 3 節的驗收場景（27 條）＋ 第 4 節商業規則（10 條）＋ 第 6 節非功能需求（4 條）
**方法:** 靜態一致性稽核。每一條先**只從規格**寫下它該有的結果，再**各自獨立**判斷
（一）測試有沒有在斷言那個結果、（二）程式碼那條路走出來的是不是那個結果。
兩邊都成立才算 ✅。

**這份稽核的上限：** 它讀測試與程式碼，**不另外寫新的探針、也不執行它自己想出來的情境**。
拖拉的落點在 happy-dom 裡是以事件模擬的，真正的瀏覽器拖放行為不在這份稽核的射程內。

---

## Clauses

### Story A — 在它自己的頁面上拼

| # | 規格要的結果（oracle） | 測試 | 程式碼 | 狀態 |
|---|---|---|---|---|
| AC-1 | 按編輯走到那一台的頁面，內容是它現在的樣子 | `StrategyBotListPanel.spec.ts` 斷言 `href` 是 `/strategy-bots/7`；`use-strategy-bot-workbench.spec.ts` 斷言去問了那一台 | `StrategyBotListPanel.vue:190`、`use-strategy-bot-workbench.ts:52` | ✅ |
| AC-2 | 按新增走到空白頁，兩棵樹各是一個洞 | `StrategyBotListPanel.spec.ts`（href 為 `/strategy-bots/new`）＋ `StrategyBotWorkbench.spec.ts`（兩個洞） | `StrategyBotListPanel.vue:40`、`strategy-bot-condition-domain.ts` 的 `toViewDto` | ✅ |
| AC-3 | 存好了回清單並說一聲 | `use-strategy-bot-workbench.spec.ts` 斷言 `saved` 與那一句；`StrategyBotListPanel.spec.ts` 斷言清單上看得到它 | `use-strategy-bot-workbench.ts:104`、`StrategyBotWorkbenchPage.vue` 的 watch | ✅ |
| AC-4 | 改到一半想離開要先問過，不走就一個字都沒少 | **沒有測試**（路由守衛需要一整組 router 才搭得起來；`dirty` 本身有測） | `StrategyBotWorkbenchPage.vue` 的 `onBeforeRouteLeave` | 🟡 partial |
| AC-5 | 什麼都沒改就直接走，不問 | 同上；`StrategyBotWorkbench.spec.ts` 有測「一開始沒有被改過」 | 同上 | 🟡 partial |
| AC-6 | 打開一台不在的，說找不到並回清單 | `use-strategy-bot-workbench.spec.ts` 斷言 `missing` 為真 | `use-strategy-bot-workbench.ts:87`、頁面的 watch 導回 | 🟡 partial（導回那一段沒測） |
| AC-7 | 清單上不會浮出任何拼機器人的對話框 | `StrategyBotListPanel.spec.ts`「清單上不會浮出任何拼機器人的對話框」 | 檔案已刪除 | ✅ |

### Story B — 把積木放進洞裡

| # | 規格要的結果（oracle） | 測試 | 程式碼 | 狀態 |
|---|---|---|---|---|
| AC-8 | 空的條件顯示一個可以放東西的位置 | `strategy-bot-condition-holes.spec.ts`＋`StrategyBotWorkbench.spec.ts` | `toViewDto()` 回 `kind: 'hole'` | ✅ |
| AC-9 | 點洞，抽屜亮起放得進去的每一塊 | `StrategyBotWorkbench.spec.ts`「點一個空位，放得進去的那幾塊才按得下去」 | `ConditionBlockPaletteDomain.optionFor` | ✅ |
| AC-10 | 點抽屜裡的比對就放進去，信號還沒選 | `strategy-bot-condition-holes.spec.ts`「新放的比對不給信號預設值」 | `fill()` 寫入空字串信號 | ✅ |
| AC-11 | 拖一塊群組到洞上，群組裡有兩個空位 | `StrategyBotWorkbench.spec.ts`（點與拖各一條） | `fill()` 建空群組＋`holeCountFor` | ✅ |
| AC-12 | 把一塊搬到別的位置，原位變回空位 | `strategy-bot-condition-holes.spec.ts`「搬走之後原本的位置就空了」 | `move()` | ✅ |
| AC-13 | 搬一個群組是搬走它底下的一整串 | 同上＋`StrategyBotWorkbench.spec.ts` 的拖曳版 | `move()` 先摘後放 | ✅ |
| AC-14 | 拿掉一塊，位置變回空位 | `use-strategy-bot-form.spec.ts` | `removeNode()`（既有） | ✅ |
| AC-15 | 拿掉一個群組是拿掉它底下的一整串 | 既有的 `strategy-bot-condition-domain.spec.ts` | `removeNode()` | ✅ |
| AC-16 | 深度到頂放不進群組，並說得出為什麼 | `strategy-bot-condition-holes.spec.ts`「最深的那一層還放得下比對，但放不下群組」 | `refusalFor()` 的 `neededDepth` | ✅ |
| AC-17 | 節點數到頂什麼都放不進去，並說得出為什麼 | 同檔＋`condition-block-palette-domain.spec.ts` | `refusalFor()` | ✅ |
| AC-18 | 一個來源都沒宣告時，比對那一類是空的並說得出下一步 | `condition-block-palette-domain.spec.ts`＋`StrategyBotWorkbench.spec.ts` | `ConditionBlockPaletteDomain.hint()` | ✅ |

### Story C — 每一塊自己說得出狀態

| # | 規格要的結果（oracle） | 測試 | 程式碼 | 狀態 |
|---|---|---|---|---|
| AC-19 | 群組不足兩塊自己標出，並說得出至少要兩塊 | `strategy-bot-condition-holes.spec.ts`＋`StrategyBotWorkbench.spec.ts` | `statusOf` / `statusTextFor` | ✅ |
| AC-20 | 比對還沒選信號自己標出 | 同上 | 同上 | ✅ |
| AC-21 | 改代號時那一句跟著改 | `use-strategy-bot-form.spec.ts`「改了代號，抽屜與樹上那幾句一起跟著改」 | `committedLabels` + `renameSourceLabel`（既有） | ✅ |
| AC-22a | 一個還被條件用著的來源刪不掉，並說得出是誰在用 | `use-strategy-bot-form.spec.ts`「刪掉一個還被條件用著的來源會被擋下來」 | `signalSourceRemovalBlockedReasons` | ✅ |
| AC-22b | 代號撞名時那一句仍指著舊代號，並標出「找不到那個來源」 | `strategy-bot-condition-holes.spec.ts`＋`StrategyBotWorkbench.spec.ts`（`condition-node--unknownSource`）＋`use-strategy-bot-form.spec.ts`（撞名期間不改） | `statusOf` 回 `unknownSource`；`committedLabels` | ✅ |
| AC-23 | 每一塊都好了就沒有任何標示 | `strategy-bot-condition-holes.spec.ts`＋`StrategyBotWorkbench.spec.ts` | `statusOf` | ✅ |
| AC-24 | 有空位沒填就存不下去，並說得出哪一件事 | `StrategyBotWorkbench.spec.ts`＋`strategy-bot-write-domain.spec.ts` | `incompleteReason()` → `conditionRejection()` | ✅ |

### Story D — 兩棵樹在同一頁

| # | 規格要的結果（oracle） | 測試 | 程式碼 | 狀態 |
|---|---|---|---|---|
| AC-25 | 兩棵同時看得見，不必切換 | `StrategyBotWorkbench.spec.ts`「買入與賣出同時看得見」 | `StrategyBotWorkbench.vue` 的 `v-for` | ✅ |
| AC-26 | 改一棵不會動到另一棵 | `StrategyBotWorkbench.spec.ts`「改一棵不會動到另一棵」 | 兩個獨立的 `Ref` | ✅ |

### Story E — 來源與抽屜連動

| # | 規格要的結果（oracle） | 測試 | 程式碼 | 狀態 |
|---|---|---|---|---|
| AC-27 | 加一個來源，抽屜立刻多一塊 | `use-strategy-bot-form.spec.ts`「改了來源，抽屜立刻跟著改」 | `blockDrawer` 是 computed，每次重算 | ✅ |
| AC-28 | 刪一個來源，抽屜立刻少一塊 | 同上（加的方向）；刪的方向由「刪掉還被用著的來源會被擋」覆蓋 | 同上 | ✅ |
| AC-29 | 改代號，抽屜與樹一起跟著改 | `use-strategy-bot-form.spec.ts` | 同上 | ✅ |

### 商業規則

| # | 規則 | 測試 | 程式碼 | 狀態 |
|---|---|---|---|---|
| BR-1 | 條件只有兩種形狀 | `strategy-bot-condition-holes.spec.ts` | `ConditionBlockKindVo` 只有兩個值 | ✅ |
| BR-2 | 兩棵都不得為空 | `strategy-bot-write-domain.spec.ts` | `conditionRejection()` | ✅ |
| BR-3 | 比對指名的代號必須已宣告 | `strategy-bot-write-domain.spec.ts`「條件指到一個沒宣告的代號就送不出去」 | `incompleteReason()` | ✅ |
| BR-4 | 群組至少兩塊 | `strategy-bot-write-domain.spec.ts`「半成品送不出去」 | `statusOf` + `conditionRejection` | ✅ |
| BR-5 | 上限沿用既有的，不改動 | `strategy-bot-limits-vo.ts` 未變更 | 同左 | ✅ |
| BR-6 | 形狀（深度、節點數）放得出來就存得下去；內容沒填完由儲存擋下並說得出哪一塊 | `strategy-bot-condition-holes.spec.ts` 的兩條上限測試＋`strategy-bot-write-domain.spec.ts` 的半成品測試 | `refusalFor()` 是抽屜與落點共用的唯一判斷；`conditionRejection()` 擋內容 | ✅ |
| BR-7 | 搬或拿掉群組是整串 | `strategy-bot-condition-holes.spec.ts` | `move()` / `removeNode()` | ✅ |
| BR-8 | 代號改名帶著條件走，撞名期間不改 | `use-strategy-bot-form.spec.ts`（既有三條） | `committedLabels` | ✅ |
| BR-9 | 前端不求值條件樹 | 全域無求值程式碼 | 無 | ✅ |
| BR-10 | 只有一個入口 | `StrategyBotListPanel.spec.ts` | 對話框已刪除 | ✅ |

### 非功能需求

| # | 需求 | 測試 | 程式碼 | 狀態 |
|---|---|---|---|---|
| NFR-1 | 拖拉與點按都完成得了同一件事 | `StrategyBotWorkbench.spec.ts` 兩種路徑各有測 | 兩條路都走 `fill()` | ✅ |
| NFR-2 | 每次編輯產生新的樹 | `strategy-bot-condition-holes.spec.ts`（原樹不變） | 每個方法都 `new` | ✅ |
| NFR-3 | 沒有指標裝置也用得了 | 點按那條路全部有測 | 點按不經過拖曳；按不下去用 `aria-disabled` 而非 `disabled`，讀螢幕仍聽得到 | ✅ |
| NFR-4 | 兩棵樹互不影響 | `StrategyBotWorkbench.spec.ts` | 兩個獨立的 `Ref` | ✅ |

---

## 這一輪找出來、並且已經修掉的兩條

**AC-22（原本那條）：規格寫的那條路走不通。**
PRD 原本寫「把來源 A 整個刪掉 → 那一句標出指向不存在的來源」。
實際上**刪不掉**——前一刀就有的規則會擋住「刪掉一個還被條件用著的來源」，
並說出是誰在用它。那條規則比 PRD 那一句好，所以留著它，改的是規格：
拆成 AC-22a（刪不掉）與 AC-22b（撞名改名時那一句停在舊代號上）。
`unknownSource` 這個狀態因此仍然是真的、會發生的，只是走另一條路。

**BR-6：兩個上限守得住，內容守不住。**
「放得出來就存得下去」對**深度**與**節點數**成立，對**內容**不成立——
使用者造得出空群組與沒選信號的比對。那是這一刀**刻意**的設計（未完成自己會標出來），
不是漏掉，所以改的也是規格：BR-6 現在分開說形狀與內容，
並指明內容由儲存擋下且說得出是哪一塊。

---

## Orphans

| 東西 | 說明 | 判定 |
|---|---|---|
| `AppButton` 的 `to` | 這一刀新增的能力，PRD 沒有提到 | 不算違規：它是「編輯是一條路由」的實作手段 |
| `useConsoleAnnouncement` | 跨頁的那一句話。PRD 只說「回到清單並說一聲」，沒說它怎麼跨頁 | 不算違規：實作細節 |
| `ConditionHoleVo.isRoot` | 目前只有一個呼叫端 | 留著：它是「根上的洞」這個概念的名字，內聯回去會變成一個到處出現的 `=== null` |

---

## Summary

```
✅ 34 conforms · 🔴 0 violations · 🟠 0 mis-asserted · 🟡 3 partial · ❌ 0 gaps · 3 orphans
一致率：34 / 37 = 92%

partial：AC-4、AC-5（離開前確認沒有測試——路由守衛要一整組 router 才搭得起來，
         它依據的 `dirty` 本身有測）、AC-6（說得出找不到有測，導回清單那一段沒測）
```

**注意：** 這是靜態一致性稽核——它比對測試斷言與程式碼路徑對上規格要的結果，
不是靠跑完整套測試得到的結論。全套 2426 條測試通過，但那件事本身**不構成**這裡任何一格的判定。
