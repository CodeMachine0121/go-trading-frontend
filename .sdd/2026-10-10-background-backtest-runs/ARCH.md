# 回測送出後在列表裡看進度與結果（網頁）— Architecture Design

**Status:** Confirmed（autonomous run — decisions recorded below）
**Source PRD:** `.sdd/2026-10-10-background-backtest-runs/PRD.md`
**Tech context:** Nuxt 3 · Vue 3 · TypeScript strict · Clean/Onion（`app/{application,domain,infrastructure,components,composables}`）· Vitest · decimal.js · 後端路由以 `go-trading/.sdd/2026-10-10-background-backtest-runs/ARCH.md` 為準

---

## 1. Design Goal & Guiding Principle

- **In one sentence:** 三個回測區塊的送出改成「拿到輪次就插進列表」，列表由一個共用的 `useBacktestRuns` 以行情助手那套自我停止的輪詢維持最新，點開一筆才去取完整成績單並交給既有的 `BacktestResultSections` 畫。
- **Guiding principle:** **既有的成績單畫面與 domain 零改動。** 後端回的 `result` 形狀與今天四個回測端點的回覆相同，`BacktestDomain`／`BacktestResultSectionDto` 直接重用；新加的只有「輪次」這一個概念（entity → domain → dto）與一個列表組件。狀態詞、進度、摘要句子都在 `BacktestRunDomain` 組好，組件不判斷狀態字串。

---

## 2. Change Scope

| Area | Action | What / Why |
| :--- | :--- | :--- |
| `domain/models/entities/backtest-run.ts` | **Add** | 輪次原樣：`id`、`kind`、`status`、`progressPercent`、`symbol`、`interval`、`startTime`、`endTime`、`leverage`／`tradingMode`（合約才有）、`strategyScriptId`／`tradingStrategyId`、`subjectName`、`submittedAt`、`finishedAt`、`totalReturnRate`／`maximumDrawdown`（`Decimal \| null`）、`tradeCount`、`failureReason`；`toDomain()` |
| `domain/models/domains/backtest-run-domain.ts` | **Add** | 狀態徽章（`label`、`tone`）、`isActive`（queued／running）、`canCancel`、「要跑什麼」一句、摘要一句（完成：報酬率／回撤／筆數；失敗：原因；已取消）；`toDto()` |
| `domain/models/dto/backtest-run-dto.ts`、`backtest-run-page-dto.ts`、`backtest-run-detail-dto.ts` | **Add** | 列表每列；分頁（`runs`、`totalCount`）；明細＝`BacktestRunDto` ＋ `result: BacktestResultSectionDto[] \| null`（用既有 `BacktestDomain` 切段） |
| `domain/models/vo/backtest-run-status-vo.ts`、`dto/backtest-run-list-query-dto.ts`、`domains/backtest-run-list-query-domain.ts` | **Add** | 五種狀態；列表查詢（`status`、`strategyScriptId`、`tradingStrategyId`、`limit`）——查詢是元件交給 application 的輸入所以是 DTO，筆數收斂與「再顯示更多」放在它的 Domain Model |
| `domain/interface/i-backtest-run-proxy.ts` | **Add** | `list(query)`、`get(id)`、`cancel(id)` |
| `domain/interface/i-backtest-proxy.ts`、`infrastructure/proxy/backtest-proxy.ts` | **Modify** | 四個 run 方法改回 `BacktestRun`（202 的輪次 wire）；wire 型別改名 `BacktestRunWire` |
| `infrastructure/proxy/backtest-run-proxy.ts` | **Add** | `GET /backtest-runs`、`GET /backtest-runs/{id}`、`POST /backtest-runs/{id}/cancel`；列表用 `background: true`；`result` 用既有 `BacktestWire` 解析 |
| `domain/service/backtest-service.ts`、`application/backtest-application.ts` | **Modify** | `runBacktest*` → `submitBacktest*`（回 `BacktestRunDto`）；新增 `listRuns(query)`、`getRun(id)`（切段成 sections）、`cancelRun(id)` |
| `composables/use-backtest-runs.ts` | **Add** | 每個列表一份自己的狀態（每頁只掛一個列表，離開再回來一律從後端重讀，所以不用跨頁的 `useState`）：`runs`、`totalCount`、`loading`、`failure`；`load()`、`prepend(run)`、`cancel(id)`；有 active 的就 `setTimeout` 輪詢（間隔 3 秒），無 active 或離開（`onUnmounted`／`stopPolling`）就停；離開畫面時還在路上的那一次回來也不再排下一次 |
| `composables/use-latest-run.ts`、`use-backtest-run.ts`、`use-trading-strategy-backtest-run.ts` | **Modify** | 送出成功的結果從「成績單」改成「輪次」：`submittedRun` ref；錯誤分支多「每人上限滿」（後端 429）；移除 `backtest-running-alert` 鎖按鈕的邏輯（改為送出中短暫 disabled 即可） |
| `components/molecules/BacktestRunStatusBadge.vue` | **Add** | 包 `AppBadge`，吃 `label`／`tone`／`progressPercent` |
| `components/organisms/BacktestRunPanel.vue` | **Add** | 「我的回測」那一塊：持有 `useBacktestRuns`＋`useBacktestRunDetail`，畫 `BacktestRunList` 與 `BacktestRunDetailDialog`，吃範圍、空狀態句與剛送出的那一筆；兩個 pane 與總覽頁共用 |
| `components/organisms/BacktestRunList.vue` | **Add** | 列表（loading／failure／empty／rows）、每列徽章＋要跑什麼＋送出時間＋摘要＋取消鈕；emit `open(id)`；手機換兩行 |
| `components/organisms/BacktestRunDetailDialog.vue` | **Add** | 點開一筆：取明細，完成畫 `BacktestResultSections`，失敗／已取消畫原因 |
| `components/organisms/StrategyScriptBacktestPane.vue`、`TradingStrategyBacktestPane.vue` | **Modify** | 送出後顯示「已送出，輪次 #N」並 `prepend`；下方放 `BacktestRunList`（範圍＝該腳本／該策略）；說明文字改 |
| `pages/backtest-runs/index.vue`、`components/templates/BacktestRunsPage.vue` | **Add** | 總覽：狀態篩選、分頁（limit＋總數，每頁 20）、空狀態、點開 |
| 側欄導覽、`locales/{zh-TW,en}/backtest.ts` | **Modify** | 「回測紀錄」一格；新文字 |
| `tests/` | **Add / Modify** | `backtest-run-domain.spec`、`backtest-run-proxy.spec`、`backtest-application.spec`（submit／list／get／cancel）、`use-backtest-runs.spec`（輪詢起停，仿 `use-assistant-conversation.spec`）、`BacktestRunList.spec`、兩個 pane 的 spec 改成「送出後顯示已送出並插列表」；只跑受影響的 spec，`--maxWorkers=2` |
| `BacktestResultSections`、`BacktestSummaryCard`、`BacktestEquityCurveChart`、`BacktestTradeTable`、`BacktestDomain` | **Not touched** | 成績單畫面零改動 |
| 行情助手、交易日誌比對 | **Not touched** | 後端維持當場算 |

---

## 3. New Classes / Modules

| Name | Kind | Responsibility | Satisfies |
| :--- | :--- | :--- | :--- |
| `BacktestRun` | Entity | 輪次原樣 | US-01～04 |
| `BacktestRunDomain` | Domain Model | 徽章、可否取消、要跑什麼、摘要句 | US-02、03 |
| `BacktestRunDto` / `BacktestRunPageDto` / `BacktestRunDetailDto` | DTO | 列表、分頁、明細 | US-02～04 |
| `IBacktestRunProxy` / `BacktestRunProxy` | Proxy | 三個端點 | US-02～04 |
| `useBacktestRuns` | Composable | 範圍化列表狀態與自我停止的輪詢 | US-02 |
| `BacktestRunStatusBadge` | Molecule | 徽章 | US-02 |
| `BacktestRunList` | Organism | 列表與取消 | US-01、02 |
| `BacktestRunDetailDialog` | Organism | 點開看成績單 | US-03 |
| `BacktestRunsPage` + `pages/backtest-runs/index.vue` | Template / Page | 總覽 | US-04 |

---

## 4. Extensibility & Handoff Notes

- **Most likely next requirement:** 比較兩筆輪次。
- **Where it lands:** `BacktestRunDetailDto.result` 已是 sections；比較畫面就是兩組 sections 並排，列表多一個「選取」狀態。
- **Do not hardcode:** 輪詢間隔（3 秒）放 `useBacktestRuns` 的常數；每頁 20 由後端預設。
- **Known debt / deferred:** 每個 `BacktestRunPanel`（區塊下方與總覽頁共用的「我的回測」那一塊）各自一份列表狀態與一個輪詢迴圈；目前每頁只掛一個。

---

## 5. Traceability

| PRD Scenario | Fulfilled by |
| :--- | :--- |
| US-01 送出後列表多一筆／欄位錯誤／每人上限滿／三個區塊相同 | `useLatestRun.submittedRun` → pane 顯示「已送出」→ `useBacktestRuns.prepend`；429 → 「你同時最多 N 筆」 |
| US-02 進度自己更新／全部結束停／不閃進度條／取消／已結束沒按鈕／離開再回來 | `useBacktestRuns` 輪詢（`background: true`）、`BacktestRunDomain.canCancel`、`BacktestRunList` |
| US-03 點開完成／失敗／已取消 | `BacktestRunDetailDialog` + `BacktestApplication.getRun` 切段 |
| US-04 總覽、篩、分頁、空狀態 | `BacktestRunsPage` |
| US-05 說明文字 | 兩個 pane 的 locale 文字 |

---

## 6. Risks & Open Decisions

- 後端 202 的輪次 wire 與 `GET /backtest-runs/{id}` 的 `result` 形狀以後端 ARCH 為準；實作時先對一次 Postman。
- 英文措辭：Queued／Running／Succeeded／Failed／Cancelled；「已送出，輪次 #N」→「Submitted as run #N」。
