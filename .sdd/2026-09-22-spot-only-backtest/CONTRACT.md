# Contract Traceability Matrix — 畫面只做現貨回測

Contract: `.sdd/2026-09-22-spot-only-backtest/PRD.md`
Design map: `.sdd/2026-09-22-spot-only-backtest/ARCH.md`
Implementation: `app/components` · `app/composables` · `app/domain` · `app/infrastructure/proxy`
Oracle: Acceptance Criteria — 21 clauses (15 `AC-`, 4 `BR-`, 2 `NFR-`)

## Clauses

`T/` = `tests/`。

### US-01 — 表單上沒有填不得的格子

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-1 | 策略腳本回測面板沒有那三格 | 起訖／資金／押多少／止損止盈／兩個成本率都在；三格不在 | `BacktestConditionFields.vue` | `T/components/organisms/StrategyScriptBacktestPane.spec.ts`「挑不動了…」「那一組借多少的格子整組不在了」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-2 | 交易策略回測面板沒有那三格 | 同上 | 同上（兩個面板共用同一個元件） | 同上 + `T/components/organisms/TradingStrategyBacktestPane.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-3 | 交易策略工作台不再問交易模式 | 名稱／來源／兩個條件都在；模式那一組不在 | `TradingStrategyWorkbench.vue` | `T/components/organisms/TradingStrategyWorkbench.spec.ts`（該 describe 整段移除，元件已無該 prop——由 typecheck 把關） | shallow | produces-oracle | 🟠 mis-asserted |
| AC-4 | 機器人的建議部位剩四格 | 四格在；槓桿不在 | `StrategyBotForm.vue` + `use-strategy-bot-form.ts` | `T/components/organisms/StrategyBotForm.spec.ts`（槓桿那條移除；四格由既有斷言涵蓋） | shallow | produces-oracle | 🟠 mis-asserted |

### US-02 — 成績單只報它真的算得出來的

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-5 | 成績單沒有強平那一格 | 找不到「強平」 | `BacktestSummaryCard.vue` + `BacktestSummaryDto` | `T/components/molecules/BacktestSummaryCard.spec.ts`「那張卡上沒有強平出場」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-6 | 還在的那幾格照舊 | 止損出場、止盈出場、累計成本都在，數字逐格相同 | 同上（未改動的部分） | 同上（同一條的反向保險）+ 既有的兩條 | asserts-oracle | produces-oracle | ✅ conforms |

### US-03 — 畫面說得出這裡只做現貨

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-7 | 原本那一組的位置留著一句話 | 那個位置有一句話，說只做現貨 | `BacktestConditionFields.vue` | `T/components/organisms/StrategyScriptBacktestPane.spec.ts`「挑不動了，但那個位置說得出現在是哪一種」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-8 | 那句話說得出倉位怎麼走 | 說出買入開倉、賣出回現金、空手時賣出什麼都不做 | 同上 | 同檔「那句話說得出倉位怎麼走」（三句逐句斷言） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-9 | 那句話說得出這裡做不到什麼 | 說出借錢與做空是合約帳戶的事 | 同上 | 同檔「那句話說得出這裡做不到什麼」 | asserts-oracle | produces-oracle | ✅ conforms |

### US-04 — 既有的東西照舊打得開

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-10 | 既有的交易策略打得開也存得回去 | 存得起來，來源與兩個條件逐項不變 | `trading-strategy-proxy.ts`（不讀也不送那一格） | `T/infrastructure/proxy/trading-strategy-proxy.spec.ts`「後端還回著那一格時也不讀它」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-11 | 既有的機器人打得開也存得回去 | 存得起來；送出去的內容裡沒有槓桿 | `strategy-bot-proxy.ts` | `T/infrastructure/proxy/strategy-bot-proxy.spec.ts`「有部位規劃時把那一組送出去」（body 逐鍵比對，`leverage` 不在） | asserts-oracle | produces-oracle | ✅ conforms |

### US-05 — 其餘一格都不動

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-12 | 保留的那幾格逐字不變 | 位置、標籤、驗證與說明逐字相同 | 未改動 | `T/...BacktestPane.spec.ts` 的出場價位與交易成本兩個 describe（未改動且綠） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-13 | 無關的畫面逐字不變 | 逐字相同 | K 線圖、策略腳本、帳號、通知未改動 | 其餘 190+ 個 spec 檔（未改動且綠） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-14 | *(隱含)* 樣式不留孤兒 | 移除元素後無未使用的 scoped 規則 | `BacktestConditionFields.vue`（`&__leverage`、`&__trading-mode-options` 一併移除） | `bun run lint:style` + `lint:tokens`（綠） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-15 | *(隱含)* 型別不留孤兒 | 無未使用的 import 與型別 | 四個 domain model／一個 VO／一個 DTO 檔案刪除 | `bun run lint` + `typecheck`（綠） | asserts-oracle | produces-oracle | ✅ conforms |

### Section 4 — Core Business Rules

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| BR-1 | 從畫面上消失的四樣（表）；消失＝看不到也填不了 | 四處各自少掉對應的格 | 四個元件 | AC-1～AC-5 的測試合起來 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-2 | 原本那一組的位置留一句話，說三件事 | 三句都在 | `BacktestConditionFields.vue` | AC-7～AC-9 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-3 | 既有資料讀得進、改得動（一倍槓桿讀進來、不顯示、不送出） | 存得起來，送出去沒有它 | `strategy-bot-proxy.ts`／`trading-strategy-proxy.ts` | AC-10、AC-11 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-4 | **送出去的內容裡不再有那三個欄位**（R1 的機械面） | 請求 body 不含它們 | 三個 proxy + 兩個 request domain | `T/...StrategyScriptBacktestPane.spec.ts`「送出去的請求裡沒有那三個欄位」；`T/infrastructure/proxy/*.spec.ts` 三檔 | asserts-oracle | produces-oracle | ✅ conforms |

### Section 6 — Non-Functional Requirements

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| NFR-1 | 相容性：既有交易策略與機器人打得開、改得動；不需資料遷移 | 逐項可用 | 兩個 proxy | AC-10、AC-11 | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-2 | 一致性：畫面問的每一件事後端都收得下 | 不再問後端不收的東西 | 全部 | BR-4 加上後端切片的 `CONTRACT.md` | asserts-oracle | produces-oracle | ✅ conforms |

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| ~~`backtest-rule-vo.ts`~~ | 規則說明曾用整整一段教人挑四種交易模式，並建議「合約帳戶只做多選槓桿做多」 | **已改寫**（改說「重演只做現貨」），並加斷言釘住那三個名字不再出現 |
| ~~`backtest-field-error.ts`~~ | `BacktestField` 曾仍列著 `tradingMode` 與 `leverage` | **已移除** |
| ~~`TradingStrategyBacktestPane.vue:171`~~ | 仍綁著 `:trading-mode-options="[]"`，指向一個已不存在的 prop | **已移除** |
| `app/` 其餘 | 掃描 `tradingMode`／`leverage`／`liquidation`／`強平`／`名目` 的命中，只剩「只做現貨」「合約帳戶的事」這類**說明它不做什麼**的句子 | 良性 |

## Summary

**第一輪**：Conforms 13/21 · Mis-asserted 2 🟠 · Orphans 3（其中一個是真的 bug）
**修正後（本檔現況）**：

- Conforms: **19/21** clauses ✅ (90%)
- Violations: 無
- Mis-asserted: **AC-3, AC-4** 🟠 — 程式碼對，但那兩處只由 `typecheck` 把關（prop 不存在就編不過），
  沒有一條斷言說「畫面上找不到它」。**判斷：接受**，理由見下。
- Partial: 無
- Gaps: 無
- Orphans: 0（三個已修）

### 這一刀的驗收重點

**mutation testing 抓到兩個測試缺口，兩個都補了**：

1. **那句「只做現貨」的話一開始沒有任何測試。** 把它整句改成「這一格暫時不開放」，
   2878 個測試全綠——而它是這一刀對使用者唯一可見的新東西。已補 5 條斷言。
2. **成績單沒有「不該有強平」的斷言。** 把「止盈出場」的標題改成「強平出場」，全綠——
   因為斷言驗的是 `data-testid` 而不是使用者讀得到的那三個字。已補。

**AC-3／AC-4 保留為 🟠 的理由**：它們是「元件不再接受某個 prop」，
而 Vue 元件的 prop 由 `typecheck` 硬性把關——傳了就編不過。
再寫一條 `expect(find(...).exists()).toBe(false)` 只是把編譯期的保證改寫成執行期的，
而前者更強。**不為了一格綠燈補一條較弱的斷言。**

> **Ceiling.** 靜態一致性稽核：對照 PRD 推出的預期結果分別審測試與程式碼，
> 不靠跑整套測試下結論。這一刀無法用測試驗證的那一半，是**後端真的收得下畫面送的東西**——
> 那由上游切片的 `CONTRACT.md` 負責。
