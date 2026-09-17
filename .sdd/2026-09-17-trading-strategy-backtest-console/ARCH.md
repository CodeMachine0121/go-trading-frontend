# Architecture Design — 交易策略回測分頁

**PRD:** `.sdd/2026-09-17-trading-strategy-backtest-console/PRD.md`
**Status:** Implemented

---

## 1. Design Goal

讓「重演一份交易策略」成為既有回測那條路的**第二種受測對象**，
而不是第二條平行的路。

判準只有一條：**成績單、資金曲線、交易明細三個元件，一個都不准分兩種讀法。**
一旦分岔，兩邊就會慢慢講出兩種故事——而那正是這個切片最該避免的事。

---

## 2. Change Scope

### 新增

| 檔案 | 責任 |
| :--- | :--- |
| `app/domain/models/dto/trading-strategy-backtest-request-dto.ts` | 使用者在回測分頁填的原始輸入。**沒有彙總刻度，也沒有算式。** |
| `app/domain/models/domains/trading-strategy-backtest-request-domain.ts` | 驗證那些輸入。多一條：**還沒存過的那一份直接擋下**。 |
| `app/components/organisms/TradingStrategyBacktestPane.vue` | 回測分頁那一整塊。 |
| `app/composables/use-trading-strategy-backtest-run.ts` | 一次重演的生命週期：跑、結果、各種失敗。 |

### 修改

| 檔案 | 改動 |
| :--- | :--- |
| `app/domain/models/entities/backtest.ts` | 多一個 `conflictedCandleCount`。 |
| `app/domain/models/dto/backtest-summary-dto.ts` | 成績單多一項。 |
| `app/domain/models/domains/backtest-domain.ts` | 把它交出去。 |
| `app/domain/interface/i-backtest-proxy.ts` | 多一個能力：重演一整份。 |
| `app/infrastructure/proxy/backtest-proxy.ts` | 打 `/trading-strategies/{id}/backtests`；`signalSources` → 市場那一格。 |
| `app/domain/service/backtest-service.ts`、`app/application/backtest-application.ts` | 各多一個用例，走同一條轉換。 |
| `app/components/molecules/BacktestConditionFields.vue` | 多一個選填的 `aggregationIntervalNote`：給了就不畫選單。 |
| `app/components/molecules/BacktestSummaryCard.vue` | 打架過才多一格。 |
| `app/components/templates/TradingStrategyWorkbenchPage.vue` | 兩個分頁；存過一次就把上一張成績單清掉。 |

### 明確不動

- `StrategyScriptBacktestPane.vue` 與重演一支腳本那條路的**任何行為**。
- 成績單、資金曲線、交易明細三個元件的讀法。
- 後端回傳的形狀——兩種受測對象回來的是同一個形狀，所以只有一條正規化路徑。

---

## 3. Key Decisions

### 彙總刻度不畫成選單，而是一句話

畫一個挑得動的選單，等於在畫面上放**第二個答案**，而沒有規則說哪一個贏。
`BacktestConditionFields` 因此多一個選填的說明字串：給了它就不畫選單。
這讓「誰決定刻度」成為呼叫端的決定，而那一塊自己什麼都不判斷——它本來就什麼都不判斷。

### `signalSources` 落在市場那一格旁邊

後端說這一份的來源彼此對不起來時指的是「信號來源」，
但這張表單上**沒有那一格可以標**。市場是唯一與「要重演什麼」有關的地方，
所以翻譯表把它導到那裡。翻譯發生在 proxy，因為後端沒有理由知道這個畫面長什麼樣。

### 打架棒數是選填的

重演一支策略腳本時後端根本不說這件事——一支腳本不會與自己打架。
所以 wire 上它是選填的，沒有就是零；而零的時候那一格不出現。

### 兩條路共用一個 `toBacktest` 與一個 `backtestFailureOf`

`BacktestProxy` 內兩個私有 method，各被兩個公開 method 用到——
正好踩在「被 2 個以上公開方法共用才留成 private」的門檻上。
它們也是「兩種受測對象講同一套話」這條保證在程式裡的樣子。

---

## 4. 下一個需求會打在哪裡

最可能的下一個需求是**刻度不一致時自動對齊**，而不是擋下來。

它會打在 `sharedAggregationIntervalOf`（後端）與這裡的那句唯讀說明。
畫面這一端的成本很低——那句話換成一個說明「用哪一個刻度對齊」的控制項即可，
而 `aggregationIntervalNote` 這個選填的縫正是留給它的。

---

## 5. Traceability

| PRD 情境 | 由誰滿足 |
| :--- | :--- |
| 少兩格、刻度是一句話 | `BacktestConditionFields.vue`（`aggregationIntervalNote`）、`TradingStrategyBacktestPane.vue` |
| 重演的是眼前這一份 | `TradingStrategyBacktestRequestDto`、`backtest-proxy.ts` 的端點 |
| 三塊同時在畫面上 | `TradingStrategyBacktestPane.vue` |
| 算的時候說一聲 | `use-trading-strategy-backtest-run.ts` |
| 還沒存過就擋下 | `TradingStrategyBacktestRequestDomain`、`TradingStrategyBacktestPane.vue` |
| 打架過才多一格 | `BacktestSummaryCard.vue`、`backtest-summary-dto.ts` |
| 改存過就清掉 | `TradingStrategyWorkbenchPage.vue` 的 `savedGeneration` |
| 出錯講同一套話 | `backtest-proxy.ts` 的 `backtestFailureOf` |
| 刻度不一致落在市場旁邊 | `BACKTEST_FIELD_TRANSLATIONS` 的 `signalSources` |
| 不送刻度與算式 | `backtest-proxy.ts` 的 `runTradingStrategyBacktest` |
