# Contract Traceability Matrix — 合約機器人自動下單（網頁）

Contract: `PRD.md`（§3 Gherkin、§4 Core Business Rules／Edge Cases、§5 UI、§6 NFR）
Design map: `ARCH.md`
Glossary: `.sdd/UL-MAP.md`（機器人持倉、下單結果、自動下單）
Implementation: branch `feat/contract-auto-order-execution` vs `main`
Oracle: 13 AC ＋ 7 BR ＋ 2 NFR ＋ 2 UI = **24 clauses**

> **這是一份靜態稽核**：判斷來自閱讀 PRD、程式碼與測試，不是執行結果。唯一執行過的只是
> `npx vitest run tests/domain/models/domains/contract-auto-order-result-domain.spec.ts`（12 passed）作為佐證。
> 每一條的 oracle 都是**讀程式碼之前**、只從規格文字寫下的。
>
> 行號以審查當下（2026-10-04，HEAD `a7bf5f4` 對應的前端分支）為準。
> 縮寫：
> `MDK` = `app/domain/models/domains/market-data-kind-domain.ts`；
> `AOP` = `app/domain/models/domains/auto-order-position-domain.ts`；
> `CAOR` = `app/domain/models/domains/contract-auto-order-result-domain.ts`；
> `Switch` = `app/components/molecules/StrategyBotAutoOrderSwitch.vue`；
> `History` = `app/components/molecules/StrategyBotRunHistory.vue`；
> `Proxy` = `app/infrastructure/proxy/strategy-bot-proxy.ts`；
> 測試：`tMDK` = `tests/domain/models/domains/market-data-kind-domain.spec.ts`、`tAOP` = `…/auto-order-position-domain.spec.ts`、
> `tCAOR` = `…/contract-auto-order-result-domain.spec.ts`、`tSwitch` = `tests/components/molecules/StrategyBotAutoOrderSwitch.spec.ts`、
> `tHistory` = `tests/components/molecules/StrategyBotRunHistory.spec.ts`、`tPage` = `tests/components/templates/StrategyBotWorkbenchPage.spec.ts`、
> `tProxy` = `tests/infrastructure/proxy/strategy-bot-proxy.spec.ts`、`tList` = `tests/components/organisms/StrategyBotListPanel.spec.ts`。

## Out of Scope（PRD §1）

現貨自動下單的畫面；網頁上手動平倉或撤單；自動記交易日誌；**清單頁顯示機器人持倉**。

## Clauses

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-01 | 合約機器人說會真的下單（例 1） | 合約機器人頁面，開關旁一字不差寫著「打開後，機器人說出新結論時會用你的幣安帳戶真的開倉、平倉，並掛上止損止盈。關掉只會停止下新的單，已經開的倉位不會被平掉。」；頁面上沒有「尚未生效」 | `MDK:136-138`（contract `autoOrderNotice`）、`MDK:208`、`Switch:50-55`、`StrategyBotWorkbenchPage.vue:104`；`notInEffect` 鍵已從兩份 locale 刪除（`grep 尚未生效 app` 無結果） | `tMDK:88-97`（zh 全文 `toBe`）、`tPage:170-180`（合約頁 `toContain` 前段）、`tSwitch:20-25`（notice 取代舊句） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02 | 現貨機器人說目前還不會下單（例 2） | 現貨機器人頁面，開關旁寫著「現貨機器人目前還不會自動下單，仍只送 Telegram 通知。」 | `MDK:76-78`、`Switch:50-55` | `tMDK:88-97`（zh 全文）、`tPage:170-180`（現貨頁 `toContain`）、`tList:544` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03 | 有倉位（例 3） | 持倉為多 0.002 → 頁面上看到「機器人持倉：多 0.002」 | `AOP:16-19`、`strategy-bot-domain.ts:44-46`、`Switch:58-66`、`locales/traditional-chinese/strategy-bot.ts:29` | `tAOP:8`、`tSwitch:27-31`、`tPage:182-191`（整頁、VO `long 0.002` → 文字全等） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04 | 空手（例 4） | 持倉為空手 → 看到「機器人持倉：空手」 | `AOP:25`、`Switch:58-66` | `tAOP:10,12`（「空手」）、`tSwitch:27-31`（前綴＋標籤的組法） | asserts-oracle（分段斷言：標籤＝空手、列＝前綴＋標籤） | produces-oracle | ✅ conforms |
| AC-05 | 現貨機器人沒有這一格（例 5） | 現貨機器人頁面沒有「機器人持倉」這一格 | `Proxy:386-389`（缺欄 → `null`）、`strategy-bot-domain.ts:44`、`Switch:59`（`v-if`） | `tProxy:565-569`（缺欄 → null）、`tSwitch:33-37`（null → 不畫） | asserts-oracle | produces-oracle（依賴後端對現貨不回 `autoOrderPosition`；後端 `strategy_bot_dto.go:36` 為 `omitempty` 指標且註明 spot bots have none。前端不自行以種類擋） | ✅ conforms |
| AC-06 | 開倉成交（例 6） | 第 52 輪底下寫著「成交 · 做多 · 開倉 0.002 @ 85000 · 止損 83725 · 止盈 87550」 | `CAOR:52-74`、`strategy-bot-run-record-domain.ts:30`、`History:105-112` | `tCAOR:33-43`（zh、en 全文）、`tHistory:44-52`（畫出 text） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-07 | 反手成交（例 7） | 「成交 · 反手做空 · 平倉 0.002 @ 84000 · 開倉 0.003 @ 84000」 | `CAOR:52-74` | `tCAOR:45-53`（同形狀、數字不同：85100／85090，全文 `toBe`） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-08 | 沒有下單（例 8） | 狀態 notPlaced、原因「餘額不足」（Given 無動作）→「沒有下單 · 餘額不足」 | `CAOR:50,52-74`（空動作不寫） | `tCAOR:70-75` 斷言的是**帶動作**的變體「沒有下單 · 做多 · 餘額不足」 | mis-asserted（例 8 的輸入／輸出沒有被斷言） | produces-oracle（對 PRD 的 Given）；見下方「跨 repo 觀察」 | 🟠 mis-asserted |
| AC-09 | 放棄（例 9） | 「放棄 · 訊號已經過時，沒有下單」 | `CAOR:20,73` | `tCAOR:55-68`（只斷言單獨的「放棄」，沒有原因） | shallow | produces-oracle；見「跨 repo 觀察」 | 🟠 mis-asserted |
| AC-10 | 止損沒掛上要醒目（例 10） | 該輪下單結果以警示（危險）樣式顯示，另一行寫著「止損或止盈沒有掛上，請立刻到幣安自己處理」 | `CAOR:78-84`、`History:105-122`、`History:266-294` | `tCAOR:81-90`（tone danger＋zh/en 全文）、`tHistory:54-61`（另一行、`role=alert`） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-11 | 還在等（例 11） | 「等待下單」 | `CAOR:10,14` | `tCAOR:55-68`（pending → 等待下單、neutral） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12 | 沒有下單的那一輪不多畫（例 12） | 第 51 輪沒有下單結果這一段 | `Proxy:206-207`、`strategy-bot-run-record-domain.ts:30`、`History:106` | `tProxy:535-541`、`tHistory:63-67` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-13 | 平倉了但新方向沒開成（例 13） | 「平倉了但新方向沒開成 · 平倉 0.002 @ 84000 · 已平倉，但做空沒開成：餘額不足」 | `CAOR:16-18,52-74` | `tCAOR:55-68`（只斷言狀態詞） | shallow（平倉段＋原因的組合沒被斷言） | produces-oracle；見「跨 repo 觀察」 | 🟠 mis-asserted |
| BR-01 | 說明照種類，不照開關 | 同一種機器人，開關開或關說明都一樣；不同種類說法不同 | `MDK:208`（只由種類決定）、`Switch:50-55`（不讀 `enabled`） | `tSwitch:20-25`（true／false 同一句）、`tMDK:88-97` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-02 | 機器人持倉的說法 | long→「多 數量」、short→「空 數量」；方向空白或數量為零→「空手」；只有合約機器人有 | `AOP:13-26`、`Proxy:386-389` | `tAOP:7-19`（long／short／qty 0／未知方向）、`tProxy:555-569` | asserts-oracle | produces-oracle（「只有合約」靠後端，同 AC-05） | ✅ conforms |
| BR-03 | 狀態詞 | pending→等待下單、filled→成交、partiallyDone→平倉了但新方向沒開成、notPlaced→沒有下單、abandoned→放棄；認不得→等待下單 | `CAOR:10-21,46-47` | `tCAOR:55-68`（五種＋`teleported`＋`constructor`）、`tCAOR:39` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-04 | 一句話的順序 | 以「 · 」串：狀態、動作、平倉、開倉、止損、止盈、原因，各自有才寫 | `CAOR:52-74` | `tCAOR:33-53,70-79,92-94` | shallow（沒有任何案例同時有止損／止盈與原因，「原因排在止損止盈之後」未被斷言） | produces-oracle | 🟠 mis-asserted |
| BR-05 | 語氣 | 成交→成功、等待下單→中性、平倉了但沒開成／沒有下單／放棄→警告；止損或止盈沒掛上→危險色並另寫一行，**不論狀態** | `CAOR:14-21,78-84`、`History:107,266-294` | `tCAOR:55-68,81-90`、`tHistory:44-61` | shallow（「不論狀態」只測了 filled；元件只斷言 `--success` 類別，`--warning`／`--danger` 未斷言） | produces-oracle | 🟠 mis-asserted |
| BR-06 | 數字照原樣、不四捨五入 | 交易服務給的數字字串原樣出現在畫面上 | `Proxy:363-365`（`new Decimal(string)`）、`CAOR` 與 `AOP` 用 `Decimal.toString()` | `tProxy:503-533`（`84971.9` 等原樣）、`tCAOR` 全文斷言 | asserts-oracle | produces-oracle（風險：decimal.js 的 `toString()` 在 \|x\| < 1e-7 時會寫成指數記號，例如 `1e-7`；目前合約價量不會落在那裡） | ✅ conforms |
| BR-07 | 舊版交易服務沒有這兩格 | 沒有持倉格、沒有下單結果，畫面與今天一樣，不壞 | `Proxy:206-207,386-387`、DTO 預設 `null`（`strategy-bot-dto.ts`、`strategy-bot-run-record-dto.ts`） | `tProxy:535-541,565-569`、`tSwitch:33-37`、`tHistory:63-67` | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-01 | 繁中與英文都要有措辭 | 說明（兩種）、持倉標籤與詞、五種狀態詞、動作、平倉／開倉／止損／止盈、警示都有英文 | `MDK:76-78,136-138`、`AOP:18-25`、`CAOR:10-31,57-83`、`locales/english/strategy-bot.ts:31` | `tSwitch:84-98`（假 notice、持倉、前綴）、`tAOP`（en）、`tCAOR:40,52,74,78,88`（Filled、Not placed、Reverse to short、警示） | shallow（兩種真實說明的英文、Pending／Closed, new side not opened／Given up 的英文未被斷言） | produces-oracle | 🟠 mis-asserted |
| NFR-02 | 警示不只靠顏色 | 止損止盈沒掛上時另有一行文字 | `History:115-122`（另一行＋`role="alert"`） | `tHistory:54-61` | asserts-oracle | produces-oracle | ✅ conforms |
| UI-01 | 持倉與說明在開關下方 | 說明與「機器人持倉」一行位於自動下單開關那一區、開關之下 | `Switch:32-66`（`__control` 之後依序是 notice、position） | — | no-test（DOM 順序未斷言） | produces-oracle | 🟡 partial |
| UI-02 | 下單結果是註腳，警示與「衝突」同樣式底 | 與建議部位同一層級的一行；警示多一塊與衝突提醒同形的底 | `History:96-122`（緊接在 `run-history-plan` 之後的同層 `<p>`）、`History:286-304`（`__protection-warning` 與 `__attention` 同形，換成 danger 色） | — | no-test（樣式／層級屬視覺，未有斷言） | produces-oracle | 🟡 partial |

## Orphans

| # | Behavior | Where | Explained by a clause? | Flag |
|---|----------|-------|------------------------|------|
| O-1 | **清單頁**（選中那一台的詳細區，以及窄螢幕的行內展開）也畫出「機器人持倉」 | `app/components/organisms/StrategyBotListPanel.vue:345,400`（傳 `:position-label`） | 否 | ⚠️ **與 Out of Scope「清單頁顯示機器人持倉」相符**——規格明說不做；`tList` 也沒有測它。UL-MAP 的「機器人持倉」列只說「出現在那一台自己頁面的自動下單那一區」 |
| O-2 | 認不得的方向、或數量 ≤ 0 一律「空手」 | `AOP:16-25` | 延伸 BR-02 | benign（有測：`tAOP:12-13`） |
| O-3 | 認不得的動作詞英文照原樣中文 | `CAOR:24-32,48-50` | 延伸 NFR-01 | benign（有測：`tCAOR:77-79`） |
| O-4 | 有數量沒均價的那一段整段不寫 | `CAOR:55-64` | 延伸 BR-04「有才寫」 | benign（有測：`tCAOR:92-94`） |
| O-5 | 警示行 `role="alert"` | `History:118` | 支撐 NFR-02 | benign（有測） |
| O-6 | wire 缺 `quantity` 當 0（→空手）、缺 `protectionMissing` 當 false、wire 多出的 `openedDirection` 被忽略 | `Proxy:208-219,389` | 否（防禦性解析） | benign（部分有測：`tProxy:543-553`） |

## 跨 repo 觀察（不計入統計，但影響 AC-08／09／11／13 的實際畫面）

後端 `go-trading/internal/domain/models/domains/contract_auto_order_domain.go` 的 `ActionInWords()` **永遠回一個動作詞**
（沒做任何事時也回「做多／做空」、只平倉時回「平多／平空」），並由 `entities/contract_auto_order.go` 的 `ToResultDto` 原樣送出。
前端照 BR-04「動作有才寫」，因此在真實後端下：

- 例 8 會畫成「沒有下單 · 做多 · 餘額不足」（PRD 寫「沒有下單 · 餘額不足」）——`tCAOR:70-75` 斷言的其實正是這個真實變體；
- 例 9 會是「放棄 · 做多 · 訊號已經過時，沒有下單」；
- 例 13 會是「平倉了但新方向沒開成 · 平多 · 平倉 0.002 @ 84000 · 已平倉，但做空沒開成：餘額不足」；
- 例 11 會是「等待下單 · 做多」（PRD 用「寫著」，包含仍成立）。

前端對 PRD 的 Given 是正確的；不一致在 PRD 例子與後端行為之間。需要拍板：要嘛 PRD 例 8／9／13 補上動作段，
要嘛前端（或後端）在 notPlaced／abandoned／partiallyDone 不寫動作。

## Summary

| Status | Count | IDs |
|--------|-------|-----|
| ✅ conforms | 16 | AC-01～07、AC-10～12、BR-01～03、BR-06、BR-07、NFR-02 |
| 🔴 violation | 0 | — |
| 🟠 mis-asserted | 6 | AC-08、AC-09、AC-13、BR-04、BR-05、NFR-01 |
| 🟡 partial | 2 | UI-01、UI-02 |
| ⚪ gap / unclear | 0 | — |
| **Total** | **24** | |

- **Conformance：16 / 24 = 66.7%**（只計 AC＋BR＋NFR 的 22 條：16 / 22 = 72.7%）。
- **Code audit：24 / 24 produces-oracle**——沒有任何行為偏離規格；所有非 conforms 都是測試沒有釘住 oracle。
- **Orphans：6**，其中 **1 條與 Out of Scope 相符**（O-1：清單頁顯示機器人持倉）。
- 跨 repo：PRD 例 8／9／13 的字串與後端「永遠帶動作詞」不一致，待拍板。

## 修正後（2026-10-04）

| 條款 | 修正 | 狀態 |
|---|---|---|
| AC-08／09／13 | PRD 與 BRIEF 例 8、9、13 改成和後端一致：句子帶動作詞（後端一律送動作）；domain spec 逐字斷言三句 | ✅ conforms |
| BR-04 | 新增「原因排在止損止盈之後」的完整句子斷言 | ✅ conforms |
| BR-05 | 危險語氣在 filled／partiallyDone／pending 都斷言；元件斷言 warning／danger／neutral 的 class | ✅ conforms |
| NFR-01 | 兩種自動下單說明與四個狀態詞都斷言英文 | ✅ conforms |
| UI-01 | 斷言 DOM 順序：開關 → 說明 → 持倉 | ✅ conforms |
| UI-02 | 斷言下單結果緊接在建議部位之後 | ✅ conforms |
| O-1（Out of Scope） | 清單頁拿掉 `:position-label`，並以測試鎖住清單頁不畫持倉 | 已移除 |
| BR-06 風險 | 數字改用 `toFixed()`，極小數不再寫成科學記號，並加測試 | ✅ |

**修正後：24 / 24 conforms（100%）**，0 orphan 違規。
