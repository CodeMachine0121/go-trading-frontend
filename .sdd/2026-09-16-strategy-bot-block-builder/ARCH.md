# Architecture — 策略機器人積木工作台

**PRD:** `./PRD.md`
**前一刀:** `../2026-09-16-strategy-bot-console/ARCH.md`（清單、播放／停止／刪除、執行紀錄沿用，不動）

---

## 1. 設計目標

把「拼一棵條件樹」從**一組按鈕**換成**把積木放進洞裡**，而且：

1. **洞不進資料。** 存出去的形狀一個位元都不變——洞是**看樹的方式**，不是樹的一部分。
2. **拼得出來的形狀一定存得下去。** 上限的判斷發生在「這個洞收不收這塊」，
   不是發生在儲存。
3. **元件不做判斷。** 元件收到的是一份**已經答完的形狀**：哪裡是洞、哪一塊有問題、
   抽屜裡哪幾塊現在放得進去。元件只負責畫。

第 3 點是這份設計的主軸。目前的條件編輯器元件自己在算 `canAddComparison`、
`canAddGroup`、`canWrapInGroup`，而那幾個判斷再過一版就會跟 domain 的規則分岔。

---

## 2. 變更範圍

### 新增

| 位置 | 型別 | 職責 |
|---|---|---|
| `domain/models/vo/` | `ConditionHoleVo` | 一個可以放積木的**位置**：哪個群組底下的第幾格 |
| `domain/models/vo/` | `ConditionBlockVo` | 抽屜裡的**一塊**：一句比對（指名某個來源）或一個群組（且／或） |
| `domain/models/dto/` | `ConditionNodeViewDto` | 一個節點**畫出來的樣子**：它是洞、是比對還是群組，以及它自己的狀態 |
| `domain/models/dto/` | `ConditionBlockOptionDto` | 抽屜裡一塊的樣子：放不放得進去，放不進去的話那句話是什麼 |
| `domain/models/domains/` | `ConditionBlockPaletteDomain` | 給定一棵樹、已宣告的代號、一個被點的洞 → 這一刻抽屜長什麼樣 |
| `components/molecules/` | `StrategyBotConditionHole.vue` | 一個畫出來的洞 |
| `components/molecules/` | `StrategyBotBlockDrawer.vue` | 積木抽屜 |
| `components/organisms/` | `StrategyBotConditionTree.vue` | 一棵樹（遞迴），取代 `StrategyBotConditionEditor.vue` |
| `components/organisms/` | `StrategyBotWorkbench.vue` | 整個工作台：三段＋兩棵樹＋抽屜 |
| `composables/` | `use-strategy-bot-workbench.ts` | 工作台的狀態與動作（含被點的洞、拖到一半的那一塊） |
| `pages/strategy-bots/` | `new.vue`、`[id].vue` | 兩條進得去的路，共用同一個工作台 |

### 修改

| 位置 | 改什麼 |
|---|---|
| `domain/models/domains/strategy-bot-condition-domain.ts` | 加 `holes()`、`fill()`、`move()`、`accepts()`、`toViewDto()`；`canAddComparisonUnder` 一族由 `accepts()` 取代 |
| `composables/use-strategy-bot-form.ts` | 條件那一段改走洞與積木；其餘兩段不動 |
| `composables/use-strategy-bots.ts` | `openCreateForm` / `openEditForm` 改成**走頁面**，不再開對話框 |
| `components/organisms/StrategyBotListPanel.vue` | 編輯與新增改成連結；拿掉對話框 |

### 刪除

| 位置 | 為什麼 |
|---|---|
| `components/organisms/StrategyBotFormDialog.vue` | 整頁取代它。**留著就是第二個入口**，兩邊都要維護、遲早不一致（BR-10） |
| `components/molecules/StrategyBotConditionEditor.vue` | 由 `StrategyBotConditionTree.vue` 取代 |

### 明確不動

- **後端一切。** 路由、DTO 形狀、規則全部原樣。
- 機器人清單、播放／停止／刪除、執行紀錄、立即運算、Telegram 設定。
- 信號來源那一段的規則（代號不得重複、上限、撞名期間不改條件）——
  只有它**呈現在哪裡**變了。

---

## 3. 核心設計：洞是看樹的方式，不是樹的一部分

存出去的樹裡，一個群組的子條件永遠是**填好的節點**。洞是從那棵樹**推出來**的：

```
樹（存得下去的形狀）        畫出來的樣子
────────────────────       ──────────────────────
null                   →   ┊ 洞（根） ┊

全部成立                →   全部成立
 ├ A＝買入                   ├ A＝買入
 └ B＝買入                   ├ B＝買入
                            └ ┊ 洞 ┊     ← 每個群組尾端固定一個
```

規則只有兩條：

- **樹是空的** → 根上一個洞。
- **每一個群組的尾端固定一個洞**（除非該群組已經到節點或深度上限）。

這樣做的代價是使用者只能**往後接**，不能插在中間。那是刻意的：
且與或**沒有順序**，插在中間與接在尾端得到的是同一個條件，
而多一種放法就多一種要畫、要測、要解釋的東西。

`ConditionHoleVo` 因此只需要兩個欄位：`parentNodeId`（`null` 代表根）與 `position`。

---

## 4. 深模組：元件收到的是答案，不是材料

### `StrategyBotConditionDomain.toViewDto(declaredLabels)`

一次答完元件要畫的每一件事：

```
ConditionNodeViewDto
├ kind: 'hole' | 'comparison' | 'group'
├ nodeId            （洞沒有）
├ hole              （只有洞有：parentNodeId + position）
├ operator / sourceLabel / signal
├ status: 'ok' | 'incomplete' | 'unknownSource'
├ statusText        （status 不是 ok 時那句話）
├ removable: boolean
└ children: ConditionNodeViewDto[]
```

元件**一個判斷都不做**。`status` 兩種壞法分得開，是因為使用者的下一步不同：
`incomplete` 是「還沒做完」，`unknownSource` 是「有東西壞了」。

### `ConditionBlockPaletteDomain(tree, declaredLabels, selectedHole).toDto()`

```
ConditionBlockOptionDto
├ block: ConditionBlockVo
├ label
├ enabled: boolean
└ disabledReason: string   （enabled 為 false 時那句話）
```

抽屜的「這一塊現在放不放得進去」與樹的「這個洞收不收這一塊」是**同一個判斷**，
所以它只寫在一個地方：`StrategyBotConditionDomain.accepts(hole, block)`。
抽屜問它，拖拉的落點也問它。

---

## 5. 拖拉：兩條路走進同一個方法

點按與拖拉都只是取得 `(hole, block)` 的**兩種手段**，
之後走的是同一個 `fill(hole, block)`：

```
點一下洞    → 記住 selectedHole → 點抽屜某塊 → fill(hole, block)
從抽屜拖    → dragover 問 accepts() → drop → fill(hole, block)
拖既有的一塊 → dragover 問 accepts() → drop → move(nodeId, hole)
```

拖拉用**原生 HTML5 drag and drop**，不引第三方套件：
拖的東西只有兩種、落點只有洞，而任何一個拖拉套件帶進來的是它自己的一套座標、
一套生命週期、與一套要跟著升級的東西。

`move` 的落點限制寫在 `accepts()` 裡：**一個群組不得落進自己底下**
（那會把一段樹接到自己身上）。這是洞與積木唯一畫得出無效形狀的地方，
所以判斷寫在收受端，而不是靠畫面不給拖。

---

## 6. 頁面

| 路由 | 意思 |
|---|---|
| `/strategy-bots` | 清單（不變） |
| `/strategy-bots/new` | 新拼一台 |
| `/strategy-bots/:id` | 改那一台 |

兩頁都只做接線：取得 Application、把工作台放上去。**工作台本身不知道自己是新增還是編輯**
——它收到一台機器人（或 `null`），交出一份要存的東西。

離開前的確認用 Nuxt 的路由守衛，條件是**這一頁有沒有被改過**，
而不是「有沒有填過東西」——打開一台既有的機器人本來就滿的。

---

## 7. 下一個需求會打在哪裡（延伸點）

最可能的下一個需求是**第三種積木**（例如「不成立」、或是跨來源的比較）。

它會打在三個地方，而這份設計讓那三個地方各只有一處：

1. `ConditionBlockVo` 多一種 `kind`。
2. `StrategyBotConditionDomain.accepts()` 多一條規則。
3. `toViewDto()` 多一種 `kind` 的畫法。

抽屜、拖拉、落點、狀態標示**一行都不用改**——它們問的都是上面那三個。

---

## 8. Traceability

| PRD 場景 | 由誰滿足 |
|---|---|
| Story A 全部 | `pages/strategy-bots/new.vue`、`[id].vue`、`use-strategy-bot-workbench.ts` |
| 空的條件顯示一個洞 | `StrategyBotConditionDomain.toViewDto()` → `StrategyBotConditionHole.vue` |
| 點洞看得到放得進去的東西 | `ConditionBlockPaletteDomain` → `StrategyBotBlockDrawer.vue` |
| 點抽屜／拖抽屜放進去 | `StrategyBotConditionDomain.fill()` |
| 搬一塊／搬一個群組 | `StrategyBotConditionDomain.move()` |
| 拿掉一塊／一個群組 | `StrategyBotConditionDomain.removeNode()`（既有） |
| 深度／節點數到頂 | `StrategyBotConditionDomain.accepts()` |
| 一個來源都沒宣告 | `ConditionBlockPaletteDomain` |
| 三種節點狀態 | `StrategyBotConditionDomain.toViewDto()` |
| 存不下去看得出來 | `use-strategy-bot-workbench.ts` 的 rejection（沿用既有規則） |
| 兩棵樹同時看得見 | `StrategyBotWorkbench.vue` 版面 |
| 來源與抽屜連動 | `ConditionBlockPaletteDomain` 每次由已宣告代號重算 |
| 代號改名帶著條件走 | `use-strategy-bot-form.ts` 的 `committedLabels`（既有，不動） |
