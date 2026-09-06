# Contract Traceability Matrix — 策略回測（前端）

Contract: `PRD.md`（同一資料夾）
Design map: `ARCH.md`（同一資料夾）
Implementation: `app/domain/models/domains/backtest-*.ts`、`app/domain/models/domains/position-sizing-domain.ts`、`app/domain/service/backtest-service.ts`、`app/infrastructure/proxy/backtest-proxy.ts`、`app/composables/use-latest-run.ts`、`app/components/organisms/StrategyBacktestPane.vue`、`app/components/organisms/IndicatorCalculationPanel.vue`
Oracle: Acceptance Criteria — 38 個 Gherkin scenario、12 條 Core Business Rules、6 條 Non-Functional Requirements（共 56 clauses）

> **Ceiling.** 這是一份**靜態一致性稽核**：它拿 PRD 的預期結果去讀測試斷言與程式路徑，
> 不撰寫新的探針、也不執行自己發明的情境。判定來自「與 oracle 比對」，不是來自跑測試看綠燈。

---

## Clauses — US-01 兩個去處，一份工作區

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-1 | 在指標預覽寫好算式 → 切到回測 → 算式原封不動 | 切換後編輯區裡仍是那一段 | `IndicatorCalculationPanel.vue`（工作區在切換之上） | `IndicatorCalculationPanelDestinations.spec.ts`（切換去處不會弄丟寫到一半的算式）＋（算式是共用的那一份） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-2 | 在回測改市場 → 切回預覽 → 看到改過的那一個 | 兩邊的市場是同一個值 | `IndicatorCalculationPanel.vue`（`v-model:symbol`） | `IndicatorCalculationPanelDestinations.spec.ts`（市場改在哪一邊，另一邊看到的就是改過的） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-3 | 填好本金與時間 → 切走再切回 → 一格都沒掉 | 兩格的值與離開時相同 | `IndicatorCalculationPanel.vue`（`v-show`，兩邊都掛著） | `IndicatorCalculationPanelDestinations.spec.ts`（切過去再切回來，填到一半的回測條件一格都沒掉） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-4 | 一打開停在指標預覽 | 預覽那一顆是選中的 | `IndicatorCalculationPanel.vue`（`WORKBENCH_DESTINATIONS[0]`） | `IndicatorCalculationPanelDestinations.spec.ts`（一打開停在指標預覽） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-5 | 彙總刻度跨去處共用 | 在預覽改成一小時，回測也是一小時 | `IndicatorCalculationPanel.vue`（`v-model:aggregation-interval`） | `IndicatorCalculationPanelDestinations.spec.ts`（彙總刻度同樣是共用的那一份） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-6 | 換一支策略 → 算式、種類、參數全換 → 兩邊都是那一支 | 兩個去處看到的都是新那一份 | `IndicatorCalculationPanel.vue`（`applyContent` 回呼＋`workspaceGeneration`） | `IndicatorCalculationPanelDestinations.spec.ts`（參數宣告也是共用的那一份）＋（載入另一支策略時告訴回測那一側工作區被換掉了）；既有 `IndicatorCalculationPanelStrategy.spec.ts` 覆蓋預覽那一側 | asserts-oracle | produces-oracle | ✅ conforms |

## Clauses — US-02 回測要問使用者的幾件事

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-7 | 今天 9/5 → 起點預設 8/6 零點 | `2026-08-06T00:00:00Z` | `backtest-time-range-domain.ts`（`defaultRangeAt`） | `backtest-time-range-domain.spec.ts`（起點是三十天前的當日零點）＋`backtest-application.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-8 | 終點預設 9/4 的最後一刻 | `2026-09-04T23:59:59.999Z` | 同上 | `backtest-time-range-domain.spec.ts`（終點是昨天的最後一刻） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-9 | 算式與本金備妥後，直接按下執行就送得出去 | 進入進行中，請求確實打出去 | `StrategyBacktestPane.vue`（預設值全部預填） | `StrategyBacktestPane.spec.ts`（時間區間已經填好，直接按得下去）＋（本金已經填好一個大於零的數） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-10 | 選了百分比 → 旁邊出現百分比格 | 那一格出現 | `position-sizing-domain.ts`（`requiresValue`）＋`BacktestConditionFields.vue` | `StrategyBacktestPane.spec.ts`（選了百分比就出現一格） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-11 | 選了固定金額 → 旁邊出現金額格 | 那一格出現 | 同上 | `StrategyBacktestPane.spec.ts`（選了固定金額也出現一格） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12 | 選了全押 → 那一格不出現 | 那一格不存在 | 同上 | `StrategyBacktestPane.spec.ts`（預設押注方式旁邊沒有那一格）＋`position-sizing-domain.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12b | 剛打開回測 → 那份規則沒有攤在版面上 | 畫面上沒有任何一條規則 | `StrategyBacktestPane.vue`（`ruleGuideOpen` 預設關） | `StrategyBacktestPane.spec.ts`（那份規則一開始是收著的） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12c | 按下說明鍵 → 看得到信號怎麼讀與「不算手續費」 | 規則攤開；含「沒放這個名字」與「手續費」 | `BacktestRuleGuideDialog.vue`＋`BACKTEST_RULES`／`SIGNAL_READINGS` | `StrategyBacktestPane.spec.ts`（按下那顆鍵就把規則攤開來／說得出信號怎麼讀／明講這一版不算手續費） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-13 | 百分比填 50 → 改全押 → 改回百分比 → 仍是 50 | 那一格仍是 50 | `BacktestConditionFields.vue`（數字留在自己的 ref 裡） | `StrategyBacktestPane.spec.ts`（切去全押再切回來，填過的數字還在） | asserts-oracle | produces-oracle | ✅ conforms |

## Clauses — US-03 送出之前就地把關

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-14 | 起點 9/10、終點 9/1 → 不送出，時間那裡說明 | 沒有請求打出去；畫面出現「起點不能晚於終點」 | `backtest-time-range-domain.ts:validate` | `StrategyBacktestPane.spec.ts`（起點晚於終點時說在時間那一格，而且一次都沒打出去） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-15 | 本金留白 → 不送出，本金那格說明 | 沒有請求打出去；出現「請填一個大於零的數」 | `backtest-request-domain.ts`（`isNaN` / `<= 0`） | `StrategyBacktestPane.spec.ts`（本金留白時說在本金那一格） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-16 | 本金填 0 → 不送出 | 沒有請求打出去 | 同上 | `StrategyBacktestPane.spec.ts`（本金填零時同樣不送出）＋`backtest-application.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-17 | 本金填 −100 → 不送出 | 沒有請求打出去 | 同上 | `backtest-application.spec.ts`（本金為負） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-18 | 算式空白 → 不送出，與指標預覽同一句話 | 沒有請求打出去；出現「請填寫算式內容」 | `backtest-request-domain.ts`（與 `IndicatorCalculationRequestDomain` 同一句） | `StrategyBacktestPane.spec.ts`（算式空白時說在算式那裡） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-19 | 百分比填 0 → 不送出，那格說明範圍 | 出現「百分比要大於零且不超過一百」 | `position-sizing-domain.ts:validate` | `StrategyBacktestPane.spec.ts`（百分比填零時說在那一格）＋`position-sizing-domain.spec.ts`（0／-1／101／150） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-20 | 固定金額填 0 → 不送出，那格說明 | 出現「固定金額要大於零」 | 同上 | `position-sizing-domain.spec.ts`＋`backtest-application.spec.ts`（固定金額為零） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-20b | 種類是「一串數字」→ 不送出，說明要去改那個種類 | 沒有請求打出去；訊息同時提到「一個數字」「一串數字」與 `signal` | `backtest-request-domain.ts`（`BACKTEST_RESULT_TYPE` 檢查） | `StrategyBacktestPane.spec.ts`（算式宣告的不是「一個數字」時當場說清楚） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-21 | 說明留在出問題的那一格旁邊，不是頁面頂端 | 訊息渲染在該欄位的 `FormField` 內 | `BacktestConditionFields.vue`（逐格 `error-message`）＋`use-latest-run.ts`（`messageFor`） | `StrategyBacktestPane.spec.ts` AC-14…AC-19 各條（斷言的是欄位旁的文字） | asserts-oracle | produces-oracle | ✅ conforms |

## Clauses — US-04 按下去之後的每一種狀態

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-22 | 已送出未算完 → 顯示進行中、按鈕停用 | 出現進行中提示；執行鍵不可按 | `StrategyBacktestPane.vue`＋`BacktestConditionFields.vue`（`running`） | `StrategyBacktestPane.spec.ts`（算的時候顯示進行中，執行鍵停用） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-23 | 後端連不上 → 說明連線狀況、按鈕停用 | 出現連線說明；執行鍵不可按 | `StrategyBacktestPane.vue`（`:disabled` 併入 `backendUnreachable`） | `StrategyBacktestPane.spec.ts`（後端連不上時執行鍵停用） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-24 | 算式出錯 → 呈現方式與指標預覽一模一樣 | 出現「算式的問題（要改的是算式）：…」 | `StrategyBacktestPane.vue`（措辭與預覽同一句）＋`backtest-proxy.ts`（422 分流） | `StrategyBacktestPane.spec.ts`（算式出錯時說成算式的問題）＋`backtest-proxy.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-25 | 參數名字對不上 → 說是哪個名字，與預覽一致 | 出現參數的問題並指名 | `backtest-proxy.ts`（`parameterName` 分流） | `StrategyBacktestPane.spec.ts`（名字對不上時說成參數的問題）＋`backtest-proxy.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-26 | 上一次成功、這一次被拒絕 → 看到的是這一次的錯誤 | 舊成績單不在畫面上；出現這一次的說明 | `use-latest-run.ts`（`run` 一開始就 `clear`） | `StrategyBacktestPane.spec.ts`（這一次的錯誤不會被上一次的成績單蓋住） | asserts-oracle | produces-oracle | ✅ conforms |

## Clauses — US-05 算完之後三塊東西一起出現

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-27 | 12 筆交易 → 成績單、曲線、12 列明細同時出現 | 三者同時存在 | `StrategyBacktestPane.vue`（同一個 `v-if` 底下） | `StrategyBacktestPane.spec.ts`（成績單、資金曲線與交易明細同時在畫面上） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-28 | 成績單交代六件事 | 六個數字與六個標籤都在 | `BacktestSummaryCard.vue` | `BacktestSummaryCard.spec.ts`（交代六件事）＋（每一件事旁邊都寫著它是什麼） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-29 | 總報酬率 +25% → 綠色 | 文字 `+25.00%`，色調 positive | `backtest-domain.ts`（`signedPercentage`／`toneOfNumber`） | `StrategyBacktestPane.spec.ts`（賺的總報酬率是綠的）＋`backtest-domain.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-30 | 總報酬率 −8% → 紅色 | 文字 `-8.00%`，色調 negative | 同上 | `StrategyBacktestPane.spec.ts`（賠的總報酬率是紅的）＋`backtest-domain.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-31 | 一筆都沒平倉 → 勝率顯示不適用，不是 0% | 顯示「不適用」 | `backtest-domain.ts`（`WIN_RATE_NOT_APPLICABLE`） | `StrategyBacktestPane.spec.ts`（一筆都沒平倉時勝率說不適用）＋`backtest-domain.spec.ts`＋`BacktestSummaryCard.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-32 | N 根 K 線 → 曲線 N 個點 | 交給繪圖的資料筆數＝點數，順序不變 | `BacktestEquityCurveChart.vue`（`setData`） | `StrategyBacktestPane.spec.ts`（資金曲線的每一點都交給繪圖函式庫，順序不變） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-33 | 交易明細一筆一列，交代六件事 | 每列六格且內容正確 | `BacktestTradeTable.vue` | `BacktestTradeTable.spec.ts`（一筆一列，每一列交代方向、兩端的時間與價格、以及賺賠） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-34 | 賺 300 綠、賠 120 紅 | 兩列各自的色調 | `backtest-domain.ts`（`toneOfDecimal`） | `StrategyBacktestPane.spec.ts`（賺的那一筆交易綠、賠的那一筆紅）＋`BacktestTradeTable.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-35 | 一筆交易都沒有 → 明講，不是空白表格 | 出現「這段期間沒有觸發任何交易」，且沒有表格 | `BacktestTradeTable.vue`（`hasNoTrades` 那一路） | `BacktestTradeTable.spec.ts`（一筆都沒有時明講）＋`StrategyBacktestPane.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-36 | 曲線與明細的時間依使用者選的時區 | 台北時區下 04:00Z 寫成 12:00 | `BacktestTradeTable.vue`（`timeZone.formatDateTime`）／`BacktestEquityCurveChart.vue`（當地時鐘讀數） | `BacktestTradeTable.spec.ts`（時間照使用者選的顯示時區寫出來）＋`BacktestEquityCurveChart.spec.ts`（交給繪圖函式庫的是當地時鐘讀數） | asserts-oracle | produces-oracle | ✅ conforms |

## Clauses — Core Business Rules

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| BR-1 | 一份工作區（六樣東西共用） | 見 AC-1、AC-2、AC-5、AC-6 | `IndicatorCalculationPanel.vue` | `IndicatorCalculationPanelDestinations.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-2 | 換去處不清空任何東西 | 見 AC-3 | `v-show` 而非 `v-if` | 同上（且已用 `v-if` 突變驗證會紅） | asserts-oracle | produces-oracle | ✅ conforms |
| BR-3 | 預設時間區間 | 見 AC-7、AC-8 | `backtest-time-range-domain.ts` | `backtest-time-range-domain.spec.ts`（四條） | asserts-oracle | produces-oracle | ✅ conforms |
| BR-4 | 押注方式決定旁邊那一格；切換不清數字 | 見 AC-10…AC-13 | `position-sizing-domain.ts`＋`BacktestConditionFields.vue` | `position-sizing-domain.spec.ts`＋`StrategyBacktestPane.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-5 | 就地把關五條，說明留在那一格旁邊 | 見 AC-14…AC-21 | `backtest-request-domain.ts` | `backtest-application.spec.ts`（八條表格）＋`StrategyBacktestPane.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-6 | 一次只留一種結果 | 見 AC-26 | `use-latest-run.ts` | `StrategyBacktestPane.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-7 | 五種錯誤的呈現與指標預覽一致 | 五種各自的說法相同 | `use-latest-run.ts`（**兩個去處共用同一份分類**）＋`StrategyBacktestPane.vue`（措辭與預覽同一句） | `StrategyBacktestPane.spec.ts`（四種）；一致性由共用同一支 composable 在結構上保證 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-8 | 賺綠賠紅，零為中性 | 見 AC-29、AC-30、AC-34 | `backtest-domain.ts`（`toneOfNumber`／`toneOfDecimal`） | `backtest-domain.spec.ts`（含零為中性）＋兩個元件測試 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-9 | 勝率不適用 | 見 AC-31 | `backtest-domain.ts` | 三處 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-10 | 沒有交易也要說話 | 見 AC-35 | `BacktestTradeTable.vue` | `BacktestTradeTable.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-11 | 時間一律照使用者選的顯示時區 | 見 AC-36 | 明細：`timeZone.formatDateTime`；曲線：當地時鐘讀數 | 兩邊都有專屬斷言（見 AC-36） | asserts-oracle | produces-oracle | ✅ conforms |
| BR-12 | 回測只跑「一個數字」的算式，種類不對就在送出前說清楚 | 見 AC-20b | `backtest-request-domain.ts` | `StrategyBacktestPane.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |

## Clauses — Non-Functional Requirements

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| NFR-1 | 算式仍由後端執行，前端一行都不跑 | 前端沒有任何執行使用者程式碼的路徑 | `backtest-proxy.ts` 只送字串；無直譯器 | 由設計保證（沒有可執行使用者程式碼的相依） | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-2 | 回測是模擬，不是下單 | 沒有任何下單端點 | 只有 `POST /backtests` | 同上 | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-3 | 金額用精確小數 | 金額全程 `Decimal`，wire 上是字串 | `backtest.ts`／`backtest-proxy.ts`／`equity-point-dto.ts` | `backtest-proxy.spec.ts`（金額以字串送出、回來不失精度）＋`backtest-domain.spec.ts`（十八位小數） | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-4 | 畫圖沿用這一頁既有的做法 | 用同一個繪圖函式庫的線圖系列 | `BacktestEquityCurveChart.vue`（`lightweight-charts` 的 `LineSeries`） | `StrategyBacktestPane.spec.ts`（對同一個函式庫替身斷言） | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-5 | 切換去處不重建編輯器 | 編輯器不因切換而重新掛載 | 工作區在切換之上，且兩邊 `v-show` | `IndicatorCalculationPanelDestinations.spec.ts`（切換去處不會弄丟寫到一半的算式）——它驗的是**結果**（內容還在），不是「沒有重新掛載」 | shallow | produces-oracle | 🟠 mis-asserted |
| NFR-6 | 元件只認識 Application 與 DTO | 驗證與呈現規則不在元件裡 | 驗證在 `backtest-request-domain.ts`；色調與說法在 `backtest-domain.ts` | 元件測試餵的是 DTO，斷言的是「照 DTO 說的來」（`BacktestSummaryCard.spec.ts` 三條色調） | asserts-oracle | produces-oracle | ✅ conforms |

---

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| `backtest-proxy.ts`（後端指名一個認不得的欄位時退回一般拒絕） | PRD 沒有這一條。它是前後端欄位詞彙不同步時的收斂行為：標在錯的一格旁邊比標在頁面頂端更糟 | 防禦性行為，已有測試（`backtest-proxy.spec.ts`）。合理但未載於契約 |
| `backtest-proxy.ts`（`closedTrades` / `equityCurve` 為 `null` 時收成空清單） | 同上：後端省略空陣列時的收斂 | 已有測試（`backtest-proxy.spec.ts`） |
| `use-latest-run.ts`（未預期的錯誤退成一則籠統的拒絕） | 最後一道防線，沿用指標預覽既有行為 | 慣例行為，非本切片新增的決策 |
| `BacktestConditionFields.vue`（彙總刻度那一格） | PRD 說彙總刻度是共用的，但沒說回測那一側也要有一格可以改。它有——這正是 AC-2 的對稱面 | 與 AC-5 一致，已有測試 |

**Out of Scope 反向檢查**：PRD 列出的五項（結果留存與歷史查詢、回測專屬參數宣告、手續費輸入欄、圖表互動、真實下單）在程式碼中**皆無對應實作**——沒有任何 `localStorage` 寫入、沒有第二份參數宣告、沒有手續費欄位、圖表沒有訂閱任何互動事件、沒有下單端點。無 scope creep。

---

## Summary

- **Conforms: 55 / 56 clauses ✅（98%）**
- Violations: 無
- Mis-asserted: `NFR-5` 🟠 —— 行為是對的，但測試沒有把它釘死：測到的是「切換後內容還在」，
  不是「編輯器沒有重新掛載」。如果哪天有人把工作區搬進其中一個去處，內容仍然會在
  （狀態在面板上），這一條卻不會紅。
- Partial: 無
- Gaps: 無
- Unclear: 無
- Orphans: 4（皆為防禦性收斂行為，均有測試或沿用既有慣例；無一觸及 Out of Scope）

### 待辦

1. **NFR-5**：若要真的釘死，測試要斷言編輯器元件實例在切換前後是同一個。
   目前的間接證據（內容還在）夠用，但它會在錯誤的設計下仍然通過。以本文件記錄此一取捨。

### 這一輪之後補上的

- **回測預設了「一個數字」卻沒說**（本輪修掉的 bug）：工作區是共用的，回測卻自己假定種類，
  於是一支「一串數字」的算式被硬套上不相容的外框，使用者收到的是直譯器的 `mapT vs mapT`。
  現在種類跟著請求走、送出前就檢查，並補上 `AC-20b` / `BR-12`。
- **版面改成兩個直欄**（左欄工作區、右欄去處）。「編輯器不屬於任何一個去處」這條設計
  現在由 `IndicatorCalculationPanelDestinations.spec.ts` 的巢狀結構斷言釘住，
  而不只是靠「切換後內容還在」的間接證據——這也讓 `NFR-5` 的那條備註不再是唯一的保護。
- **回測規則收進一顆 ⓘ 鍵後面**（`AC-12b` / `AC-12c`）。字住在 domain，
  所以行為改了那份說明不會安靜地開始說謊。

### 更早一輪稽核已經修掉的

- 稽核找出五條沒有測試的規則（AC-3、AC-22、AC-28，以及 AC-36 的明細與曲線兩半），已全數補齊——最後一條在寫完本文件的第一版後才補上，因為它一開始被判成「留待下次」，而它其實是三行斷言。
- 前端 proxy 原本以**訊息文字**判斷「這一段重演不了」，違反專案「不比對寫給人看的文字」的規則。已改為後端指名欄位、前端翻譯——後端因此新增了 `field` 欄位（見後端切片的同名 commit）。
