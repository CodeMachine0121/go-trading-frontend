# 操作台的去處與說法 — Architecture Design

**切片**：`2026-09-20-console-destinations-and-wording`
**規格來源**：[PRD.md](PRD.md)（Acceptance Criteria 為 oracle）
**共識來源**：[BRIEF.md](BRIEF.md)

---

## 1. Design Goal & Guiding Principle

### 一句話

**這一刀只動最外兩層**：`ConsoleLayout` 的那張去處表、幾個 `.vue` 的字串，
以及一顆原子按鈕多出來的一種外形。**Domain 只有一處要動**（拿掉觀察清單那條切片），
而那一處是**刪**，不是改。

### 四個支配這一刀的決定

#### 決定一：觀察清單是**整條垂直切片刪掉**，不是把頁面藏起來

留著 application / service / proxy 而只拿掉那一頁，會得到一組
「沒有人呼叫、但每次重構都要跟著改」的死程式碼——而它還有四份測試在保證它是活的。

`isWatched` 不跟著走：它住在 `TradingSymbol` 上，是後端在**交易標的**上回的一件事實，
與那一頁無關。`TradingSymbolProxy` 一行不動。

> **一個反例澄清邊界**：`WatchlistService` 讀的是**可查交易標的**那一份
> （`TradingSymbolProxy`），所以刪掉它不會讓任何一個還活著的畫面少一條讀取的路——
> 那條路 `TradingSymbolService` 自己也有一份。

#### 決定二：改名只改**畫面的名字**，不改**型別的名字**

`/indicator-calculations` 這一頁改叫「策略腳本」、網址改成 `/strategy-scripts`，
但 `IndicatorCalculationPanel`、`IndicatorCalculationApplication`、
`IndicatorCalculationService`、`IIndicatorCalculationProxy`、
`IndicatorCalculationRequestDomain`…**一個都不改名**。

理由不是怕麻煩：**「執行指標計算」在後端 UL-MAP 上仍然是一個有效的業務動作**，
而那些型別描述的正是那個動作。改的是「這一整頁在畫面上叫什麼」——
那一頁上還有腳本庫、市集入口、參數宣告與回測，指標計算只是它能做的其中一件事。

因此這一刀在程式碼裡的足跡是：**`app/pages/indicator-calculations/` 改名成
`app/pages/strategy-scripts/`，其餘每一個檔名與型別名照舊。**

#### 決定三：新的那顆鍵是 **`AppButton` 的一種 variant 加一種 shape**，不是一個新元件

`.claude/rules/component-design.md` 的第一條：一個 UI 概念只有一個元件，
長相由使用端以 variant / shape / slot 決定。所以：

- `AppButton` 多一種 shape：**`squircle`**（介於 `default` 與 `circle` 之間的大圓角）。
- `AppButton` 多一種 variant：**`accent`**（漸層底＋柔光）。
  它是「整個畫面上最想被按的那一顆」的長相，不是「助手專用的長相」——
  所以它叫 `accent` 而不是 `assistant`：原子不認識任何領域概念。
- 柔光是 `_tokens.scss` 上新增的一筆 **`shadow('glow')`**。
  元件裡不寫任何 `rgb()`（stylelint 直接擋）、也不寫任何色碼。

`AssistantTriggerButton` 自己只多兩樣東西：那顆四角星，與底下那行 `AI`。
它**不覆寫 `AppButton` 的底色**——那會讓原子的 variant 形同虛設。

#### 決定四：那顆鍵的**大小與拖曳規則一個字都不動**

`TRIGGER_SIZE_PIXELS = 64` 是一個正方形的邊長，而 squircle 仍然是正方形。
`AssistantTriggerPositionDomain.clampedInto` 讀的就是這個數字，所以
**domain 層與 composable 層在這一刀裡完全沒有變更**。

換皮不該碰到規則——這是這一段最重要的一件事。

---

## 2. 檔案清單

### 2.1 刪除（觀察清單那一整條）

| 檔案 | 為什麼 |
|:---|:---|
| `app/pages/watchlist/index.vue` | 那一頁 |
| `app/components/organisms/WatchlistPanel.vue` | 那一塊 |
| `app/components/molecules/WatchlistEntryForm.vue` | 只有它在用 |
| `app/application/watchlist-application.ts` | 只有那一頁在用 |
| `app/domain/service/watchlist-service.ts` | 只有那一個 application 在用 |
| `app/infrastructure/proxy/watchlist-proxy.ts` | 只有那一個 service 在用 |
| `app/domain/interface/i-watchlist-proxy.ts` | 只有那一個實作 |
| `app/domain/models/dto/watchlist-entry-dto.ts` | 只有那一條切片在用 |
| `tests/components/organisms/WatchlistPanel.spec.ts` | 跟著走 |
| `tests/domain/service/watchlist-service.spec.ts` | 跟著走 |
| `tests/infrastructure/proxy/watchlist-proxy.spec.ts` | 跟著走 |

### 2.2 搬移

| 從 | 到 |
|:---|:---|
| `app/pages/indicator-calculations/index.vue` | `app/pages/strategy-scripts/index.vue` |

### 2.3 修改

| 檔案 | 改什麼 |
|:---|:---|
| `app/components/templates/ConsoleLayout.vue` | 那張去處表：拿掉觀察清單、加上交易策略、改三個名字與三個圖示、換 primary 那四個 |
| `app/plugins/dependencies.ts` | 拿掉 `watchlistApplication` 的組裝與注入 |
| `app/assets/styles/abstracts/_tokens.scss` | `$shadows` 多一筆 `glow` |
| `app/components/atoms/AppButton.vue` | 多一種 shape（`squircle`）與一種 variant（`accent`） |
| `app/components/atoms/AppIcon.vue` | 多三個圖示（`sparkle`、`merge`、`store`）、刪掉 `robot`；`library` 留著，它在策略腳本那一頁還有工作 |
| `app/components/molecules/AssistantTriggerButton.vue` | 換長相：squircle ＋ accent ＋ 四角星 ＋ `AI` 字標；名稱改 `AI-Assistant` |
| `app/components/organisms/AssistantDrawer.vue` | 標頭與無障礙名稱改 `AI-Assistant`；記號改四角星 |
| `app/components/molecules/AssistantMessage.vue` | 頭像改四角星 |
| `app/components/molecules/AssistantPendingNotice.vue` | 頭像改四角星 |
| `app/components/organisms/AssistantConversationThread.vue` | 頭像改四角星 |
| `app/pages/chat/index.vue` | 標題改 `AI-Assistant` |
| `app/app.vue` | 那段說明裡的「行情助手」跟著改 |
| `app/components/organisms/StrategyBotListPanel.vue` | 拿掉「我的交易策略」那顆鍵；「訊號變了」 |
| `app/components/molecules/StrategyBotRunHistory.vue` | 停損／停利 |
| `app/components/organisms/StrategyBotForm.vue` | 部位規劃那句說明：停損與停利 |
| `app/components/molecules/BacktestConditionFields.vue` | 「回測中…」 |
| `app/components/organisms/StrategyScriptBacktestPane.vue` | 「回測中…」「回測了 N 根」 |
| `app/components/organisms/TradingStrategyBacktestPane.vue` | 同上，加「訊號來源」三處、「拿去回測」 |
| `app/components/organisms/TradingStrategyPieceShelf.vue` | 「不吐訊號」 |
| `app/components/molecules/ChartIndicatorPanel.vue` | 指路改成「策略腳本畫面」 |
| `app/components/molecules/StrategyScriptLibraryDialog.vue` | 指路改成「到 Marketplace 看看」 |
| `app/pages/marketplace/index.vue` | 標題改 `Marketplace` |
| `app/composables/use-trading-strategy-workbench.ts` | 「當不了訊號來源」 |
| `app/domain/models/domains/trading-strategy-write-domain.ts` | 四句拒絕：訊號來源 |
| `app/domain/models/domains/backtest-exit-levels-domain.ts` | 止損距離／止盈距離 |
| `app/infrastructure/proxy/backtest-proxy.ts` | 同上（同一組驗證的另一個呼叫點） |
| `app/domain/models/vo/backtest-rule-vo.ts` | 訊號／止損／止盈／回測 |
| `scripts/shots.mjs` | 少一張、改一條路徑 |
| `.sdd/UL-MAP.md` | 見第 4 節 |

### 2.4 測試

| 檔案 | 改什麼 |
|:---|:---|
| `tests/components/templates/ConsoleLayout.spec.ts` | 那張表換了：名字、路徑、primary 四格、「更多」五條 |
| `tests/components/molecules/AssistantTriggerButton.spec.ts` | 形狀改 squircle、名稱說得出 `AI-Assistant`；**拖與按那幾條一字不動** |
| `tests/components/organisms/AssistantDrawer.spec.ts` | 標頭 |
| `tests/components/organisms/StrategyBotListPanel.spec.ts` | 那顆鍵不見了 |
| `tests/components/molecules/StrategyBotRunHistory.spec.ts` | 停損／停利 |
| `tests/components/organisms/StrategyBotForm.spec.ts` | 那句說明 |
| `tests/components/organisms/TradingStrategyWorkbench.spec.ts`、`tests/composables/use-trading-strategy-workbench.spec.ts`、`tests/domain/models/domains/trading-strategy-write-domain.spec.ts` | 訊號來源 |
| `tests/domain/models/domains/backtest-exit-levels-domain.spec.ts`、`tests/infrastructure/proxy/backtest-proxy.spec.ts`、兩個 backtest pane 的測試 | 止損距離／止盈距離、回測中 |
| `tests/domain/models/vo/backtest-rule-vo.spec.ts` | 訊號／止損 |
| `tests/components/atoms/AppIcon.spec.ts`、`tests/components/atoms/AppButton.spec.ts` | 新的圖示與新的外形 |
| `tests/composables/use-assistant-drawer.spec.ts` | 那條假路由改名 |
| `tests/components/molecules/StrategyScriptLibraryDialog.spec.ts` | 空狀態那句指路改成 `Marketplace` |
| `tests/components/molecules/SymbolField.spec.ts` | 那句不再指向觀察清單 |

---

## 3. 那張去處表改成什麼

```ts
const DESTINATIONS = [
  { to: '/',                   label: '連線狀態',     icon: 'connection',   primary: false },
  { to: '/k-candles',          label: 'K 線瀏覽',     icon: 'table',        primary: false },
  { to: '/k-candles/chart',    label: 'K 線圖表',     icon: 'candles',      primary: true  },
  { to: '/strategy-scripts',   label: '策略腳本',     icon: 'formula',      primary: true  },
  { to: '/marketplace',        label: 'Marketplace',  icon: 'store',        primary: false },
  { to: '/trading-strategies', label: '交易策略',     icon: 'merge',        primary: false },
  { to: '/strategy-bots',      label: '策略機器人',   icon: 'standing-bot', primary: true  },
  { to: '/chat',               label: 'AI-Assistant', icon: 'sparkle',      primary: true  },
  { to: '/settings',           label: '設定',         icon: 'settings',     primary: false },
] as const
```

**仍然是九個**：少了觀察清單、多了交易策略。底部那一排因此仍然是四格加一顆「更多」，
`ConsoleLayout` 的版面規則一行都不必動。

**`merge` 這個圖示畫的是幾條線併成一條**——那正是一份交易策略在做的事：
幾個訊號來源匯成一個結論。它刻意不是積木：積木是**工作檯**的說法，
而側欄指的是「交易策略」這個東西本身。

**`Marketplace` 換掉了 `library` 那顆圖示**：清單那一顆在策略腳本那一頁上已經有工作了
（自己的策略腳本庫），而「我存了哪幾支」與「外面有人在分享什麼」是兩件事。
一個圖示只能說一件事，所以市集拿到自己的一顆店面（`store`），`library` 留在原位。

**三個英文名字的規則是同一條**：`AI-Assistant`、`Marketplace` 是**去處**的名字，
而「助手」、「市集」是**那個東西**的名字。導覽、標題與指向它的路標用前者，
句子裡用後者——所以「已經分享到市集」「讀取市集中…」一個字都不改。

---

## 4. UL-MAP 要跟著改的幾列

| 列 | 怎麼動 |
|:---|:---|
| 觀察清單 | **刪** |
| 加入觀察清單 / 從觀察清單移除（Business Actions） | **刪** |
| 追蹤中 | 留，但補一句「這一側只讀不寫」 |
| 助手整頁 | User-Facing Label 改 `AI-Assistant` |
| 助手抽屜 | 標頭那個名字改 `AI-Assistant` |
| 底部分頁列 | 那四個改成 K 線圖表、策略腳本、策略機器人、`AI-Assistant`；其餘五個換名單 |
| 疏密分界 | 「行情助手蓋不蓋滿畫面」→「`AI-Assistant` 蓋不蓋滿畫面」 |
| 去處 / 工作區 / 回測 / 工作檯去處 | 「指標計算那一頁」→「策略腳本那一頁」 |
| 信號來源 / 來源代號 / 零件 | 定義文字裡的「信號來源」→「訊號來源」（Technical Name 不動） |
| 列出策略腳本（Business Actions） | 「進入指標計算畫面」→「進入策略腳本畫面」 |
| 策略腳本市集 | User-Facing Label 改 `Marketplace`，並記下它換了圖示、以及名字與「市集」的分工 |
| **新增**：策略腳本畫面 | 這一頁自己的一列 |
| **新增**：交易策略畫面 | 這一頁自己的一列（它現在是側欄上的一個去處） |
| **新增**：助手記號 | 四角星，說明它為什麼不是機器人頭 |

---

## 5. 這一刀**不動**的東西（刻意列出來）

| 不動 | 為什麼 |
|:---|:---|
| `AssistantTriggerPositionDomain`、`AssistantTriggerService`、`use-assistant-trigger` | 換皮不碰規則。那顆鍵仍然是 64 見方，夾回範圍的算式因此一個字都不必改 |
| `IIndicatorCalculationProxy` 與它打的 `/indicator-calculations` 端點 | 那是後端的名字，而後端那件事仍然叫指標計算 |
| `TradingSymbolProxy` 與 `isWatched` | 追蹤中是交易標的身上的事實，不是觀察清單那一頁的東西 |
| 指標值種類那個選項名稱「一個信號」 | 後端 UL-MAP 白紙黑字的選項名稱 |
| 「每根涵蓋」 | 這一側刻意記在自己 UL-MAP 上的說法 |
| 句子裡的「助手」 | 後端那個角色就叫助手 |
| `standing-bot` 那顆圖示 | 它是策略機器人的，留著 |
