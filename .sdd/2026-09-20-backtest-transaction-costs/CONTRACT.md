# 回測的交易成本（畫面）— Contract Verification Matrix

**Contract source:** `.sdd/2026-09-20-backtest-transaction-costs/PRD.md`（Acceptance Criteria 為 oracle）
**Design map:** `.sdd/2026-09-20-backtest-transaction-costs/ARCH.md`
**Scope:** `go-trading-frontend`
**Verified:** 2026-09-20
**Ceiling:** 靜態一致性稽核。逐條把**測試斷言**與**程式路徑**各自對照規格推出的 oracle，
不以「跑完全套變綠」當判準。

---

## Clauses

### US-01 — 兩張表單都填得出那兩個費率

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-01.1 | 兩張表單都有那一組，兩格併排 | 兩格同時看得見 | `BacktestConditionFields.vue` 的 `__transaction-costs` 那一組 | `StrategyScriptBacktestPane.spec.ts`「兩個費率填了就送出去」＋ `TradingStrategyBacktestPane.spec.ts`「兩個費率在這一邊也是填得動的輸入框」 | ✅ conforms |
| AC-01.2 | 兩格預設留白 | 留白即不計 | 兩個 pane 的 `ref('')` | 兩邊各一條「預設兩格都留白」（斷言輸入框是空的，且送出去的是零） | ✅ conforms |
| AC-01.3 | 說出留白就不計、出場留白沿用進場 | 兩句話都要在 | `FormField` 的 `hint`：「留白就不計。出場留白時跟進場一樣」 | `StrategyScriptBacktestPane.spec.ts`「那一組旁邊說得出『出場留白時跟進場一樣』」 | ✅ conforms |
| AC-01.4 | 兩張表單一字不差 | 不可能只改到一邊 | 兩張表單共用 `BacktestConditionFields.vue`，那一組只有一份 | **結構上成立**，並由兩邊各自的 pane 測試各驗一次 | ✅ conforms |
| AC-01.5 | 那一組佔滿整列 | 兩格同時看得見 | `&__transaction-costs { grid-column: 1 / -1; }` | 樣式不由測試守（與出場價位那一刀同一個立場） | 🟡 partial |

### US-02 — 講不通的費率不送出

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-02.1 | 為負 → 不送出，訊息在那一組旁邊 | 請求沒發出 | `BacktestTransactionCostsDomain.validate()` | `backtest-transaction-costs-domain.spec.ts` 拒絕表格 ＋ 兩個 pane 各一條（斷言 `proxy.runBacktest` **沒有**被呼叫，且訊息在 `.backtest-condition-fields__transaction-costs` **裡面**） | ✅ conforms |
| AC-02.2 | 超過 100 → 同上 | — | 同上 | 同上；`StrategyScriptBacktestPane.spec.ts` 逐字斷言整句 | ✅ conforms |
| AC-02.3 | 說得出是哪一格 | 句子本身說 | `TransactionCostRateDomain` 帶著名字 | `backtest-transaction-costs-domain.spec.ts`「拒絕指向那一組」＋「說不通的理由一次只講一個」 | ✅ conforms |
| AC-02.4 | 正好 100 送得出去 | — | `greaterThan` 而非 `greaterThanOrEqual` | 領域層與 pane 層各一條 | ✅ conforms |
| AC-02.5 | 後端指名那一組 → 訊息落在同一處 | 不是籠統的拒絕 | `backtest-proxy.ts` 的 `BACKTEST_FIELD_TRANSLATIONS` 多一列 | `backtest-proxy.spec.ts`「後端指名交易成本時，說明落在那一組旁邊」 | ✅ conforms |
| — | 超過 100 的**理由**與隔壁那組不同 | 講成本，不是講價格 | `TransactionCostRateDomain` 自己的句子 | 領域層「超過一百的理由講的是成本，不是價格」＋ pane 層逐字斷言整句 | ✅ conforms |

### US-03 — 留白時畫面與這一刀之前一模一樣

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-03.1 | 兩格留白 → 請求不含那兩格 | 零不上線 | `transactionCostsBody()` | `backtest-proxy.spec.ts`「留白的費率**根本不出現在請求裡**」（`not.toHaveProperty` 兩格） | ✅ conforms |
| AC-03.2 | 只填進場 → 只送進場 | — | 同上 | `backtest-proxy.spec.ts`「只填進場那一格就只送那一格」 | ✅ conforms |
| AC-03.3 | 沒收過錢 → 成績單不多那一格 | — | `BacktestDomain` 給 `null` ＋ `v-if="… !== null"` | `backtest-domain.spec.ts`「沒收過錢時累計成本是 null」＋ `BacktestSummaryCard.spec.ts`「沒收過錢就不多那一格」 | ✅ conforms |
| AC-03.4 | 沒收過錢 → 明細不多那兩欄 | — | `showTransactionCosts` prop | `BacktestTradeTable.spec.ts`「沒收過錢就一欄都不多」 | ✅ conforms |
| — | 既有的每一張成績單逐字不變 | 最硬的一條 | 全部新欄位都是選填／零值 | **既有 2874 條測試一條斷言都沒改**（只改了建構子的引數個數） | ✅ conforms |

### US-04 — 成績單與明細說得出那筆錢

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-04.1 | 收過錢 → 成績單多累計成本 | — | `BacktestSummaryCard.vue` | `BacktestSummaryCard.spec.ts`「收過錢才多那一格」（斷言 `'210.00'`） | ✅ conforms |
| AC-04.2 | 收過錢 → 明細每列兩筆成本 | — | `BacktestTradeTable.vue` | `BacktestTradeTable.spec.ts`「收過錢才多那兩欄」 | ✅ conforms |
| AC-04.3 | 賺賠是淨額，而且要說出來 | 表頭說明 | 表頭在收過錢時寫「賺賠（已扣成本）」 | `BacktestTradeTable.spec.ts`「收過錢時賺賠那一欄說明自己是淨額」 | ✅ conforms |
| AC-04.4 | 金額寫法與其他金額一字不差 | 同一個進位規則 | `BacktestDomain.amount()`（既有方法，未新增第二套） | `backtest-domain.spec.ts`「累計成本照金額的規則寫出來」與「每一筆交易的兩筆成本也照金額的規則寫出來」（皆斷言兩位小數） | ✅ conforms |

---

## 稽核過程中補上的缺口

**`ClosedTradeDto` 的引數順序一度是錯的。** 兩筆成本本來被插在 `exitReasonLabel`
**之前**，而兩者都是字串——TypeScript 一個字都沒抱怨，出場原因那一欄默默變成了 `'0.00'`。
抓到它的是既有的出場原因測試（`'0.00'` 不是 `'訊號'`），而不是任何新寫的斷言。
**那正是既有測試不改一條斷言的價值**：它守的不是新功能，是新功能沒有弄壞的舊功能。
成本已移到參數列末端。

---

## 沒有 orphan

| 新增 | 指回 |
| :--- | :--- |
| `TransactionCostRateDomain` | AC-02.1〜02.4 |
| `BacktestTransactionCostsDomain` | AC-02.\* |
| `BacktestField` 的 `'transactionCosts'` | AC-02.5 |
| 兩個請求 DTO／Domain 的兩個費率 | AC-01.\*、AC-03.1 |
| `transactionCostsBody()` | AC-03.1、AC-03.2 |
| `Backtest.totalTransactionCost`、`ClosedTrade` 的兩筆成本 | AC-04.\* |
| `BacktestSummaryDto.totalTransactionCost`（`string \| null`） | AC-03.3、AC-04.1 |
| `ClosedTradeDto` 的兩筆成本 | AC-04.2 |
| `BacktestTradeTable` 的 `showTransactionCosts` | AC-03.4、AC-04.2 |
| `__paired-inputs`／`__paired-input` | 排版重複的整併，不對應 AC |

---

## 已知且刻意的落差

| 落差 | 依據 |
| :--- | :--- |
| 畫面一個數字都不算 | PRD Out of Scope ＋ R-6。累計成本、逐筆成本、淨額全部由後端算 |
| 版面（佔滿整列）不由測試守 | 與出場價位那一刀同一個立場：樣式由人看，不由斷言釘 |
| 每筆最低手續費沒有格子 | 後端不支援 |
| 不預填常見費率 | 預設值就是替使用者改掉了他的成績單 |
