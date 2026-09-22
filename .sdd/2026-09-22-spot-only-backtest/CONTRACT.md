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
| AC-2 | 交易策略回測面板沒有那三格 | 同上 | 同上（兩個面板共用同一個元件） | `T/components/organisms/TradingStrategyBacktestPane.spec.ts`「沒有那三格可以填」 | asserts-oracle *(初稿誤記，見第二輪)* | produces-oracle | ✅ conforms |
| AC-3 | 交易策略工作台不再問交易模式 | 名稱／來源／兩個條件都在；模式那一組不在 | `TradingStrategyWorkbench.vue` | `T/components/organisms/TradingStrategyWorkbench.spec.ts`「這裡沒有帳戶種類可以挑」 | asserts-oracle *(第二輪補上)* | produces-oracle | ✅ conforms |
| AC-4 | 機器人的建議部位剩四格 | 四格在；槓桿不在 | `StrategyBotForm.vue` + `use-strategy-bot-form.ts` | `T/components/organisms/StrategyBotForm.spec.ts`「展開之後也沒有槓桿那一格」 | asserts-oracle *(第二輪補上)* | produces-oracle | ✅ conforms |

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
| AC-14 | *(隱含)* 樣式不留孤兒 | 移除元素後無未使用的 scoped 規則 | `BacktestConditionFields.vue` 與 `TradingStrategyWorkbench.vue` | **人工複查**（`lint:style` 抓不到孤兒規則——它檢查的是寫法，不是有沒有人用） | asserts-oracle *(初稿只查了一個檔，見第二輪)* | produces-oracle | ✅ conforms |
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

- Conforms: **21/21** clauses ✅ (100%)
- Violations: 無
- Mis-asserted: 無（**AC-3／AC-4 第二輪已補上斷言**——原本的判斷是錯的，理由見下）
- Partial: 無
- Gaps: 無
- Orphans: 0（三個已修）

### 這一刀的驗收重點

**mutation testing 抓到兩個測試缺口，兩個都補了**：

1. **那句「只做現貨」的話一開始沒有任何測試。** 把它整句改成「這一格暫時不開放」，
   2878 個測試全綠——而它是這一刀對使用者唯一可見的新東西。已補 5 條斷言。
2. **成績單沒有「不該有強平」的斷言。** 把「止盈出場」的標題改成「強平出場」，全綠——
   因為斷言驗的是 `data-testid` 而不是使用者讀得到的那三個字。已補。

### 第二輪 code review（本檔第二次修正）

**「typecheck 會擋」那個理由是錯的，已撤回。** 原文說 AC-3／AC-4 不必補斷言，
因為元件不再接受那個 prop、傳了就編不過。但那兩處被拿掉的**不是 prop**：

- AC-3 是一組 `v-for` 出來的 template DOM。任何人用一個行內陣列把它寫回來都編譯得過，
  而送出去的 write DTO 會帶著一個後端已經不收的欄位。
- AC-4 是一個輸入框，而讀它的那個案例是被**刪掉**的，不是被反轉的。

兩處都補了「畫面上找不到它」的斷言，並各配一條正向斷言——否則整張表單消失也會過。

同一輪還查出三件這份稽核記錄**不實**的事：

| 項目 | 原判 | 實況 |
| :--- | :--- | :--- |
| AC-2 | ✅，並註明由交易策略面板的測試涵蓋 | 那個檔案裡關於那三格的斷言**全部被刪掉**，而刪除還把一個 `describe` 的結尾一併帶走，使交易成本那幾條被併進上一個區塊。已重建整段，並拿掉一個元件早已不收的 prop |
| AC-14 | ✅，由 `lint:style` 把關 | `lint:style` 檢查的是寫法，**抓不到沒有人用的規則**。而工作檯上確實留著一條孤兒樣式。已刪，並把把關方式據實改成人工複查 |
| 出場距離說明 | 未列 | 那份規則說明仍在教人「做空反過來」怎麼擺止損——一個這個引擎開不出來的倉位。而它的新測試把「做空」從必須消失的拼法清單裡**特意漏掉**，所以殘留通過了。已改寫，並改為數「做空」出現幾次 |

> **Ceiling.** 靜態一致性稽核：對照 PRD 推出的預期結果分別審測試與程式碼，
> 不靠跑整套測試下結論。這一刀無法用測試驗證的那一半，是**後端真的收得下畫面送的東西**——
> 那由上游切片的 `CONTRACT.md` 負責。
