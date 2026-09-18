# 回測的止損止盈（畫面）— Architecture Design

**切片**：`2026-09-18-backtest-exit-levels`
**依據**：[BRIEF.md](BRIEF.md)、[PRD.md](PRD.md)
**範圍**：`go-trading-frontend`

---

## 1. Design Goal & Guiding Principle

### 一句話

**兩格輸入框，兩個新模型，以及一次把「那兩句話」從私有搬成共用的重構。**

### 這一刀唯一真正的設計決定：那兩句拒絕的話搬家

上一刀（機器人的部位規劃）在 `PositionPlanDomain` 裡寫了一個私有方法
`distanceRejection`，並在註解裡說明它為什麼是私有的：

> 兩個出口共用，因為兩邊要擋的是同樣兩件事…兩份之後會有一邊放過另一邊擋著的值。

那時它**只有一個呼叫者**（那一個模型的兩個出口），所以私有是對的——
這個專案的規則本來就說「只被一個公開方法用到的私有方法，直接 inline」，
而它當時被兩個出口用，剛好過得了門檻。

**現在有了第二個呼叫者**，而它在另一個模型裡。同一段邏輯要服務兩張表單，
私有就擋住了它。

**所以搬。** 搬成一個自己的 Domain Model：

```
ExitDistanceDomain(距離, 名字).validationMessage(): string | null
```

而 `PositionPlanDomain` 對它的用法，與它**已經在做的那件事一字不差**——
它的押多少那兩條規則就是委派給回測那一列在用的 `PositionSizingDomain`，
理由寫在那個檔案裡：

> 「百分比要大於零且不超過一百」這句話在這個專案裡只該有一份，
> 而多一份的那一天，兩張表單會對同一個 150 給出兩種說法。

**這一刀對距離做的是同一件事，理由同一句話。**
這不是一次「順手的重構」，這是那句話本來就要求的結果。

### 第二個決定：零的判斷一律 `greaterThan(0)`

`decimal.js` 把零當成正的（`new Decimal(0).isPositive() === true`），
Go 的 `shopspring/decimal` 不是。**上一刀在這裡踩過一次**：
一個空的部位資金被前端讀成「有一組規劃」、被後端讀成「沒有」——
兩端對同一份資料給出兩個答案，而沒有任何地方報錯。

這一刀的兩格也是同一種「零就是沒有」的欄位，所以**一律 `greaterThan(0)`**，
並在用到的每一處寫明理由。

---

## 2. Change Scope

### 新增（5 個檔案）

| 檔案 | 角色 |
|:---|:---|
| `app/domain/models/vo/trade-exit-reason-vo.ts` | 出場原因的三個取值 |
| `app/domain/models/domains/exit-distance-domain.ts` | **一個出場距離講不講得通**。兩張表單共用 |
| `app/domain/models/domains/backtest-exit-levels-domain.ts` | 這一次重演的那兩個距離，驗證並說成這張表單的話 |
| `tests/domain/models/domains/exit-distance-domain.spec.ts` | — |
| `tests/domain/models/domains/backtest-exit-levels-domain.spec.ts` | — |

### 修改

| 檔案 | 改什麼 |
|:---|:---|
| `app/domain/errors/backtest-field-error.ts` | 欄位聯集多 `'exitLevels'` |
| `app/domain/models/domains/position-plan-domain.ts` | 私有 `distanceRejection` **委派**給新模型 |
| `app/domain/models/dto/backtest-request-dto.ts` | 多兩個精確小數 |
| `app/domain/models/dto/trading-strategy-backtest-request-dto.ts` | 同上 |
| `app/domain/models/domains/backtest-request-domain.ts` | 驗證並持有那兩個 |
| `app/domain/models/domains/trading-strategy-backtest-request-domain.ts` | 同上 |
| `app/domain/models/entities/backtest.ts` | `Backtest` 多兩個筆數；`ClosedTrade` 多一個出場原因 |
| `app/domain/models/domains/backtest-domain.ts` | 兩個筆數往 DTO；出場原因翻成中文 |
| `app/domain/models/dto/backtest-summary-dto.ts`、`closed-trade-dto.ts` | 對外多三格 |
| `app/infrastructure/proxy/backtest-proxy.ts` | 大於零才送；wire 多三個欄位；欄位名多一條翻譯 |
| `app/components/molecules/BacktestConditionFields.vue` | 多兩格＋一句說明＋一則錯誤 |
| `app/components/molecules/BacktestSummaryCard.vue` | 多兩格（大於零才出現） |
| `app/components/molecules/BacktestTradeTable.vue` | 多一欄 |
| `app/components/organisms/StrategyScriptBacktestPane.vue` | 兩個 ref、傳進 DTO、接錯誤 |
| `app/components/organisms/TradingStrategyBacktestPane.vue` | 同上 |

### 一個字都不改

- 交易模式在兩個畫面上的行為（一邊兩顆按鈕、一邊一句話）。
- 押多少、初始資金、時間區間的每一條規則與每一句話。
- 既有測試的每一條斷言。

---

## 3. New Classes / Modules

### `ExitDistanceDomain` — 這一刀的核心

```ts
export class ExitDistanceDomain {
  constructor(
    private readonly distance: Decimal,
    private readonly name: string,
  ) {}

  /** 講不通時說出理由；講得通時 null。 */
  validationMessage(): string | null
  /** 有沒有這個出場。零就是沒有。 */
  get isSet(): boolean
}
```

**`name` 進建構子而不是進方法**，因為一個距離「叫什麼」與它「是多少」
是同時知道的兩件事，而分開傳會讓同一個距離在兩次呼叫裡拿到兩個名字。

**`isSet` 也在這裡**，而不是各自在呼叫端寫 `greaterThan(0)`：
「零就是沒有這個出場」是一條規則，而它一旦被寫在兩個地方，
其中一個遲早會寫成 `isPositive()`——那個寫法把零當成有。

### `BacktestExitLevelsDomain`

```ts
export class BacktestExitLevelsDomain {
  constructor(
    private readonly stopLossPercentage: Decimal,
    private readonly takeProfitPercentage: Decimal,
  ) {}

  /** 講不通就丟一個指著這一組的哨兵錯誤。 */
  validate(): void
}
```

與 `BacktestInitialCapitalDomain`、`BacktestTimeRangeDomain` 同一個形狀
（`validate()` 丟 `BacktestFieldError`），所以兩個 Request Domain
對它的用法與對那兩個一字不差。

---

## 4. Modified Components

### `PositionPlanDomain` 少一段程式碼

```ts
// 之前
private distanceRejection(distance: Decimal, name: string): string | null {
  if (distance.isNaN()) { … }
  if (distance.isNegative()) { … }
  if (distance.greaterThan(WHOLE_PRICE_PERCENTAGE)) { … }
  return null
}

// 之後
return new ExitDistanceDomain(this.positionPlan.stopLossPercentage, '停損距離')
    .validationMessage()
  ?? new ExitDistanceDomain(this.positionPlan.takeProfitPercentage, '停利距離')
    .validationMessage()
```

那個私有方法與 `WHOLE_PRICE_PERCENTAGE` 一起消失。
**它的註解跟著搬到新家**——那段註解說的是「為什麼兩個出口共用一份」，
而那正是新模型存在的理由，只是現在服務的是兩張表單而不是兩個出口。

### Proxy：大於零才送

```ts
...(requestDomain.stopLossPercentage.greaterThan(0)
  ? { stopLossPercentage: requestDomain.stopLossPercentage.toString() }
  : {}),
```

**留白就不出現在 body 裡。** 送一個零雖然等價（後端把零讀成沒有），
但**空字串轉成的零是巧合而不是意圖**——而巧合會在後端某天改讀法時安靜地壞掉。

### 出場原因的中文在 `BacktestDomain`

```ts
const TRADE_EXIT_REASON_LABELS: Readonly<Record<TradeExitReason, string>> = {
  signal: '訊號',
  stopLoss: '止損',
  takeProfit: '止盈',
}
```

與已經在那裡的 `POSITION_DIRECTION_LABELS` 並排，同一條規則：
畫面一旦開始判斷「這個值該寫成什麼字」，同一個判斷就會出現在每一個顯示它的地方。

---

## 5. Component Relationships

```
        ┌──────────────────────────┐
        │ ExitDistanceDomain       │  ← 這一刀新增，也是唯一的重構
        │  一個距離講不講得通       │
        └──────┬────────────┬──────┘
               │            │
    ┌──────────▼───┐   ┌────▼────────────────────┐
    │ PositionPlan │   │ BacktestExitLevels      │
    │ Domain（機器人）│   │ Domain（這一次重演）     │
    └──────────────┘   └────┬────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
    BacktestRequestDomain      TradingStrategyBacktestRequestDomain
              └──────────┬────────────────┘
                         ▼
                  BacktestProxy（大於零才送）
```

**兩張表單、一份規則。** 這張圖最上面那一格就是這一刀的全部意義。

---

## 6. Traceability

| AC | 落在哪裡 |
|:---|:---|
| AC-01〜AC-05（兩格、選填、留白不送、說明、不清掉） | `BacktestConditionFields.vue`、兩個 pane 的 ref、Proxy 的 `greaterThan(0)` |
| AC-06〜AC-08（三條拒絕與界線） | `ExitDistanceDomain` |
| AC-09（欄位名） | `BacktestExitLevelsDomain` 丟 `BacktestFieldError('exitLevels', …)` |
| AC-10〜AC-11（逐字相同、只有一份） | **`ExitDistanceDomain` 是唯一一份**；`PositionPlanDomain` 委派 |
| AC-12（一次一個理由） | `?? ` 串接，第一個非 null 就回 |
| AC-13（後端指名） | `BACKTEST_FIELD_TRANSLATIONS` 多一條 |
| AC-14〜AC-15（兩格、大於零才出現） | `BacktestSummaryCard.vue` 的 `v-if` |
| AC-16〜AC-17（明細那一欄） | `BacktestTradeTable.vue`＋`ClosedTradeDto` |
| AC-18（中文在 domain） | `TRADE_EXIT_REASON_LABELS` |

---

## 7. Extensibility & Handoff Notes

- **下一個問「一個距離」的表單**（移動停損的距離、風險百分比法的那個距離）
  直接用 `ExitDistanceDomain`。它現在是這個專案關於「一個距離講不講得通」的唯一答案。
- **哪天那兩格的規則不再一樣了**（例如止盈允許超過 100），
  那就是 `ExitDistanceDomain` 要收一個參數、或者分家的時候——
  而那一刻會很明顯，因為它的整個存在理由就是「兩邊要擋的是同樣兩件事」。
- **成績單那兩格若要在「設了但沒觸發」時也出現**，需要後端回一個
  「這一次有沒有模擬」。在那之前，交易明細那一欄已經說出了同一件事。
