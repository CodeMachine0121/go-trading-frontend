# 回測的交易成本（畫面）— Architecture Design

**切片**：`2026-09-20-backtest-transaction-costs`
**規格來源**：[PRD.md](PRD.md)（Acceptance Criteria 為 oracle）
**共識來源**：[BRIEF.md](BRIEF.md)
**範本切片**：`2026-09-18-backtest-exit-levels` — 這一刀的形狀與它幾乎一模一樣，
所以**每一個做法都照抄它**，不發明新的。

---

## 1. Design Goal & Guiding Principle

### 一句話

**照著出場價位那一刀走一遍：一個驗證用的 Domain Model、一個共用元件裡的欄位組、
一個「沒有就不顯示」的成績單格子。畫面一個數字都不算。**

### 三個支配這一刀的決定

#### 決定一：兩條規則各自有自己的 Domain Model，而不是共用出場距離那一個

`ExitDistanceDomain` 已經在擋「負的」與「超過 100」，形狀一模一樣。
但它的句子是**為距離寫的**——「那會讓價格變成負數」。
費率超過 100 的問題不是價格變成負數，是**收得比成交金額還多**。

共用就得把句子參數化，而拿到錯句子的人會跑去看錯的地方。
所以新增一個 `TransactionCostRateDomain`，與 `ExitDistanceDomain` 並排、
各說各的話，並各自提供 `isSet`（那個 `greaterThan(0)` 而非 `isPositive()` 的教訓要沿用）。

#### 決定二：那一組欄位放進**兩張表單共用的那個元件**

`BacktestConditionFields.vue` 是兩張重演表單共用的分子。
出場價位那一組就在裡面，費率這一組也一樣——兩張表單一字不差因此是**結構上的事實**，
不是一條要靠人記得的規矩。

它一條規則都不判斷（既有立場）：哪一格出問題由外面告訴它。

#### 決定零：開倉次數不是新資料，是**一路被丟掉的**資料

後端算了 `positionOpenCount`、proxy 讀進來了、`Backtest` entity 也存著它——
然後 `BacktestSummaryDto` 沒有這一格，於是它在轉成畫面形狀的那一步安靜地消失。

所以這一段不是「多接一個欄位」，是**把一條斷掉的線接回去**：
DTO 補一格、`BacktestDomain` 多傳一個、畫面多畫一格。沒有新的取數、沒有新的算術。

它一律顯示而不是「大於零才出現」——與打架棒數那幾格刻意不同。
那幾格是**只在特定玩法下才有意義**的數字（沒模擬出場時止損筆數恆為零）；
開倉次數與交易次數是同一個層級的基本事實，而**它等於零本身就是資訊**。

#### 決定三：「沒收過錢就不顯示」用 **`null`** 表達，不用 `> 0`

打架棒數與止損出場筆數是**數字**，所以它們用 `> 0` 判斷。
累計成本進到畫面時已經是**格式化過的字串**（`'210.00'`），
而字串沒有「大於零」這件事——`'0.00'` 與 `'210.00'` 對元件一樣是字串。

所以 DTO 上它是 `string | null`，`null` 就是沒收過錢。
這與勝率那一格的先例一字不差（一筆都沒平倉時是「不適用」而不是 `'0%'`）：
**要不要顯示是領域知識，不是樣式**，所以決定留在 Domain Model 裡。

---

## 2. Change Scope

### 新增（2 個檔案）

| 檔案 | 內容 |
|:---|:---|
| `app/domain/models/domains/transaction-cost-rate-domain.ts` | `TransactionCostRateDomain`（一個費率講不講得通、有沒有設） |
| `app/domain/models/domains/backtest-transaction-costs-domain.ts` | `BacktestTransactionCostsDomain`（那一組的驗證，丟指向 `transactionCosts` 的哨兵錯誤） |

### 修改

| 檔案 | 改什麼 |
|:---|:---|
| `domain/errors/backtest-field-error.ts` | `BacktestField` 多一個 `'transactionCosts'` |
| `domain/models/dto/backtest-request-dto.ts` | 多兩個費率 |
| `domain/models/dto/trading-strategy-backtest-request-dto.ts` | 多兩個費率 |
| `domain/models/domains/backtest-request-domain.ts` | 驗證並帶著那兩個費率 |
| `domain/models/domains/trading-strategy-backtest-request-domain.ts` | 同上 |
| `domain/models/entities/backtest.ts` | `Backtest` 多累計成本；`ClosedTrade` 多兩筆成本 |
| `domain/models/domains/backtest-domain.ts` | 把三個新數字格式化進 DTO；累計成本為零時給 `null` |
| `domain/models/dto/backtest-summary-dto.ts` | 多 `totalTransactionCost: string \| null` |
| `domain/models/dto/closed-trade-dto.ts` | 多兩筆成本（字串） |
| `infrastructure/proxy/backtest-proxy.ts` | 只送真的填了的那幾格；讀回三個新數字；欄位名對照多一列 |
| `components/molecules/BacktestConditionFields.vue` | 多一組欄位與一個錯誤訊息 prop |
| `components/molecules/BacktestSummaryCard.vue` | 累計成本那一格（`null` 就不畫） |
| `components/molecules/BacktestTradeTable.vue` | 兩欄成本（沒收過錢就不畫），賺賠表頭說明是淨額，空狀態分兩種說法 |
| `components/organisms/StrategyScriptBacktestPane.vue` | 兩個 ref、兩個 v-model、一個錯誤 prop |
| `components/organisms/TradingStrategyBacktestPane.vue` | 同上 |

### 一個字都不改

| 元件 | 為什麼 |
|:---|:---|
| `ExitDistanceDomain`、`BacktestExitLevelsDomain` | 兩組規則不同（見決定一），互不干涉 |
| 資金曲線 | 它收到的數字自然變了，它的規則沒變 |
| 機器人那張表單 | 後端那一側刻意不動 |

---

## 3. New Modules

### `TransactionCostRateDomain`

```
constructor(rate: Decimal, name: string)
validationMessage(): string | null     非數字 / 負 / > 100 各一句，否則 null
get isSet(): boolean                   greaterThan(0)，不是 isPositive()
```

與 `ExitDistanceDomain` 並排、形狀一字不差，**句子不同**。
`isSet` 的 `greaterThan(0)` 是沿用那個踩過的教訓：`decimal.js` 把零當成正的。

### `BacktestTransactionCostsDomain`

```
constructor(entryCostPercentage: Decimal, exitCostPercentage: Decimal)
validate(): void   講不通就丟 BacktestFieldError('transactionCosts', 句子)
```

一次只說一個理由（這張表單每一條規則的既有立場：使用者一次只改得動一格）。
兩條規則本身委派給上面那個模型，所以同一個 101 在兩格得到同一句話。

---

## 4. Modified Components

### `backtest-proxy.ts` — 只送真的填了的那幾格

新增 `transactionCostsBody()`，形狀與既有的 `exitLevelsBody()` 一字不差：
**零不上線**。理由也一字不差——一個空輸入框轉成的零不是使用者的意思，
而是 `new Decimal('')` 的結果；不送它，「留白就不計」在線上就是字面的意思。

欄位名對照表多一列 `transactionCosts`，讓後端指名那一組時訊息落在同一個地方。

讀回來的三個數字都是選填（`?? '0'`）：比這一刀早的後端根本不說它們。

### `BacktestDomain` — 決定要不要顯示

```
totalTransactionCost = 累計成本為零 ? null : amount(累計成本)
```

零與「沒收過錢」在這裡是同一件事，而那是對的：費率留白時後端回零，
使用者也確實沒付過錢。

逐筆兩個成本一律格式化成字串（表格要不要畫那兩欄，看成績單那一格是不是 `null`）。

### `BacktestTradeTable.vue` — 兩欄，沒收過錢就不畫

多一個 prop 說「這次有沒有收過錢」，而不是讓表格自己去看每一列的成本是不是零——
那會讓表格開始判斷業務規則，而且一筆成本為零的交易不代表整次重演沒收錢。

---

### `BacktestTradeTable.vue` 的空狀態 — 兩句話，由領域挑

「還抱著一注」＝ `開倉次數 > 已平倉筆數`。那條推論靠的是「同一時間最多一個部位」
這條**領域規則**，所以它由 `BacktestDomain` 算完放進 DTO（`hasOpenPosition`），
不由元件自己拿兩個數字相減——元件一旦開始推論，那條規則就有了第二個住處。

與 `showTransactionCosts` 同一個手法：表格被**告知**事實，不去推導事實。

---

## 5. Traceability

| AC | 落在哪裡 |
|:---|:---|
| AC-01.1〜01.5 | `BacktestConditionFields.vue` 的那一組欄位（兩張表單共用） |
| AC-02.1〜02.4 | `BacktestTransactionCostsDomain` ＋ `TransactionCostRateDomain` |
| AC-02.5 | `backtest-proxy.ts` 的欄位名對照多一列 |
| AC-03.1 / 03.2 | `transactionCostsBody()` |
| AC-03.3 | `BacktestDomain` 的 `null` |
| AC-03.4 | `BacktestTradeTable.vue` 的那個 prop |
| AC-04.1 | `BacktestSummaryCard.vue` |
| AC-04.2 / 04.3 | `BacktestTradeTable.vue` |
| AC-04.4 | `BacktestDomain.amount()`（與其他金額同一個方法） |
| AC-05.1 / 05.2 | `BacktestSummaryDto.positionOpenCount` ＋ `BacktestSummaryCard.vue` |
| AC-05.3 / 05.4 | `BacktestTradeTable.vue` 的兩句空狀態 |
| AC-05.5 | `BacktestSummaryDto.hasOpenPosition`（由 `BacktestDomain` 決定） |

---

## 6. Extensibility & Handoff Notes

- 後端若日後支援**每筆最低手續費**，這裡就是那一組再多兩格，
  以及 `TransactionCostRateDomain` 旁邊多一個下限的模型。
- **畫面一個數字都不算**這條立場若要改，要整張成績單一起改，不是替某一格開特例。

### 看過但**刻意不做**的兩個重構

**一、把 `transactionCostsBody()` 與 `exitLevelsBody()` 併成一個。**
兩者各四行、做的事看起來一樣：兩個 `(值, 標籤)` 裡真的填了的才上線。
但併起來就得把「哪一個模型回答 `isSet`」變成參數，而那兩個模型回答的是兩個不同的問題——
一格留白的出場距離是**沒有那個出場**，一格留白的出場費率是**沿用進場**。
四行的重複換來的是兩條規則不會被下一個人讀成同一條，這筆交易划算。

**二、把那兩組併排欄位抽成一個元件。**
它們的樣板確實長得很像，但標題、提示、`data-testid` 與錯誤訊息各不相同——
抽出來會是一個帶六個 prop 的元件，讀起來不會比兩段各二十行的樣板清楚。
**排版**那一份重複是真的，所以那一份併掉了（`__paired-inputs`／`__paired-input`）。
**若日後出現第三組併排欄位**，那時再抽元件，而不是現在。
