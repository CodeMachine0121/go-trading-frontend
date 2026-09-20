# 操作台的去處與說法 — Contract Verification Matrix

**Contract source:** `.sdd/2026-09-20-console-destinations-and-wording/PRD.md`（Acceptance Criteria 為 oracle）
**Design map:** `.sdd/2026-09-20-console-destinations-and-wording/ARCH.md`
**Scope:** `go-trading-frontend`
**Verified:** 2026-09-20
**Ceiling:** 靜態一致性稽核。逐條把**測試斷言**與**程式路徑**各自對照規格推出的 oracle，
不以「跑完全套變綠」當判準。

> 這一刀有一類特別的條款：**措辭**。措辭沒有行為，所以它只能由「逐字斷言」守住，
> 而不是由結構守住。凡是只靠人眼讀過一遍的，一律標 🟡，並說出它為什麼沒有被釘住。

---

## Clauses

### US-01 — 觀察清單整個不見了

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-01.1 | 側欄上沒有它 | 那張表少一列 | `ConsoleLayout.vue` 的 `DESTINATIONS` | `ConsoleLayout.spec.ts`「提供各畫面之間的導覽，而且是照那個順序」逐字列出全部九個 ＋「觀察清單已經不是一個去處了」 | ✅ conforms |
| AC-01.2 | 底部那一排與「更多」都沒有它 | 同一張表 | 同上（兩份導覽讀同一張表） | 「常用的四個直接露出來」＋「其餘五個收在『更多』那張紙裡」逐個 testid 斷言 | ✅ conforms |
| AC-01.3 | `/watchlist` 不存在 | 檔案不在 | `app/pages/watchlist/` 已刪 | Nuxt 檔案路由：**檔案不在就沒有那條路由**，結構上成立。另由「觀察清單已經不是一個去處了」斷言沒有任何一條連結指向它 | ✅ conforms |
| AC-01.4 | 整條垂直切片一起走 | 沒有孤兒 | 八個 `app/` 檔案 ＋ 三份測試已刪；`dependencies.ts` 少一段組裝與一個 provide | `bun run typecheck` 與 `bun run lint` 全綠＝**沒有任何地方還 import 它們**（少刪一個就是編譯錯誤） | ✅ conforms |
| AC-01.5 | `追蹤中` 留著 | 挑標的時仍看得到 | `TradingSymbol`、`TradingSymbolProxy`、`SymbolField` 一行未動 | `trading-symbol.spec.ts`、`SymbolField.spec.ts` 既有斷言未動且全綠 | ✅ conforms |
| — | 那一頁走了之後，沒有一句話還指著它 | 不留死路 | `SymbolField.vue` 那句 hint 改成「換一個市場看看」；`live-k-candle-update.ts` 的註解跟著改 | `SymbolField.spec.ts`「這個市場一檔都沒有時說得出原因」加兩條：`toContain('換一個市場看看')`、`not.toContain('觀察清單')` | ✅ conforms |

### US-02 — 交易策略是側欄上自己的一格

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-02.1 | 側欄上有它 | 那張表多一列 | `DESTINATIONS` 多一列 `/trading-strategies` | 「提供各畫面之間的導覽，而且是照那個順序」 | ✅ conforms |
| AC-02.2 | 排在市集與機器人之間 | 順序本身是規則 | 那張表的第六列 | 同上——斷言的是 `toEqual([...])` 一整個**有序**陣列，不是 `toContain` | ✅ conforms |
| AC-02.3 | 圖示與別人都不一樣 | 一眼分得開 | `AppIcon` 新增 `merge` | `AppIcon.spec.ts`「每個圖示畫的都不一樣」把 `merge`、`sparkle`、`store`、`standing-bot` 一併納入那份名單 ＋ `ConsoleLayout.spec.ts`「側欄上每一格的圖示都不一樣」 | ✅ conforms |
| AC-02.4 | 機器人清單標頭那顆鍵拿掉 | 一個去處一個入口 | `StrategyBotListPanel.vue` 那段 `AppButton` 已刪 | `StrategyBotListPanel.spec.ts`「標頭上沒有通往交易策略的鍵」（testid 與字串各斷一次） | ✅ conforms |
| AC-02.5 | 每一列那條連結留著 | 那不是導覽 | 同檔 `bot-trading-strategy` 那條 `NuxtLink` 未動 | `StrategyBotListPanel.spec.ts` 既有的那條斷言未動且全綠 | ✅ conforms |
| AC-02.6 | 「先去拼一份」那條路留著 | — | `StrategyBotForm.vue` 未動 | `StrategyBotForm.spec.ts` 既有斷言未動且全綠 | ✅ conforms |

### US-03 — 那一頁叫策略腳本

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-03.1 | 側欄那一格寫「策略腳本」 | 逐字 | `DESTINATIONS` 第四列 | 「提供各畫面之間的導覽」逐字（`toEqual` 逐字逐序，`toContain` 分不開相鄰的前綴——這正是那條測試被改寫的原因） | ✅ conforms |
| AC-03.2 | 那一頁標題寫「策略腳本」 | 逐字 | `pages/strategy-scripts/index.vue` 的 `title` | **沒有頁面層測試**（這個專案的頁面只做接線，一律不測） | 🟡 partial |
| AC-03.3 | 網址是 `/strategy-scripts` | 檔案位置 | `app/pages/indicator-calculations/` → `app/pages/strategy-scripts/` | Nuxt 檔案路由：結構上成立。側欄那一列的 `to` 由 `ConsoleLayout.spec.ts` 的 testid（`tab-/strategy-scripts`）間接釘住 | ✅ conforms |
| AC-03.4 | 圖表上那句指路改口 | 逐字 | `ChartIndicatorPanel.vue`「到策略腳本畫面寫一支存起來」 | **沒有逐字斷言**——既有測試只驗那一塊在不在 | 🟡 partial |
| AC-03.5 | 後端端點不動 | 請求一個字不變 | `indicator-calculation-proxy.ts` 的 `INDICATOR_CALCULATIONS_ENDPOINT` 未動 | `indicator-calculation-proxy.spec.ts` 逐字斷言 `http://localhost:8080/indicator-calculations`，未動且全綠 | ✅ conforms |

### US-04 — 訊號就叫訊號

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-04.1 | 四句拒絕說「訊號來源」 | 逐字 | `trading-strategy-write-domain.ts` 四句 | `trading-strategy-write-domain.spec.ts` 的拒絕表格逐字斷言其中一句；其餘三句**只由型別與人眼守著** | 🟡 partial |
| AC-04.2 | 重演那一頁三句說「訊號來源」 | 逐字 | `TradingStrategyBacktestPane.vue` | `TradingStrategyBacktestPane.spec.ts`「彙總刻度是一句話，不是挑得動的選單」斷言 `toContain('訊號來源')` | ✅ conforms |
| AC-04.3 | 工作檯那句 | 逐字 | `use-trading-strategy-workbench.ts` | **沒有逐字斷言** | 🟡 partial |
| AC-04.4 | 機器人清單那句 | 逐字 | `StrategyBotListPanel.vue` | **沒有逐字斷言** | 🟡 partial |
| AC-04.5 | 回測規則那幾句 | 逐字 | `backtest-rule-vo.ts` | `backtest-rule-vo.spec.ts` 既有斷言未觸及這幾個字 | 🟡 partial |
| AC-04.6 | 「一個信號」那個選項不跟著改 | 它是後端的選項名稱 | `indicator-result-type-domain.ts` 的 `label` 未動 | `indicator-result-type-domain.spec.ts` 逐字斷言那個 label，未動且全綠——**這一條是被釘死的**，所以誤改會當場紅 | ✅ conforms |

### US-05 — 止損與停損各自回到自己的房間

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-05.1 | 回測那兩格說「止損距離／止盈距離」 | 逐字 | `backtest-exit-levels-domain.ts` 與 `backtest-proxy.ts` 傳給 `ExitDistanceDomain` 的名字 | `backtest-exit-levels-domain.spec.ts` 四條拒絕逐字 ＋ 新增「說的是『止損』而不是『停損』」（`not.toContain('停損')`）；`StrategyScriptBacktestPane.spec.ts` 與 `TradingStrategyBacktestPane.spec.ts` 各再驗一次**畫面上真的長這樣** | ✅ conforms |
| AC-05.2 | 回測規則那幾句 | 逐字 | `backtest-rule-vo.ts` | `backtest-rule-vo.spec.ts` 既有的「一律算止損」那一條守住其中一句；改掉的那兩句沒有斷言 | 🟡 partial |
| AC-05.3 | 機器人那句說明說「停損與停利」 | 逐字 | `StrategyBotForm.vue` 那個問句 | `StrategyBotForm.spec.ts`「那個問句說的是『停損與停利』」（`toContain` ＋ `not.toContain('止損')`） | ✅ conforms |
| AC-05.4 | 執行紀錄那一行說「停損／停利」 | 逐字 | `StrategyBotRunHistory.vue` | `StrategyBotRunHistory.spec.ts`「那兩個數字叫『停損』與『停利』」四條斷言（兩正兩反） | ✅ conforms |
| — | 兩組詞**互相**不得越界 | 反向也要守 | — | 兩邊各有一條 `not.toContain` 的反向斷言（止損那邊不准有停損，停損那邊不准有止損）——**單向斷言擋不住把兩邊都改成同一個詞** | ✅ conforms |

### US-06 — 回測跑起來還是叫回測

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-06.1 | 那顆鍵跑起來寫「回測中…」 | 逐字，且與閒著時同一個詞 | `BacktestConditionFields.vue` | `StrategyScriptBacktestPane.spec.ts`「那顆鍵從頭到尾用同一個詞」——**三個時點各 `toBe` 一次**（閒著→跑→跑完），所以只改其中一個詞會紅 | ✅ conforms |
| AC-06.2 | 進行中那句說明 | 逐字 | 兩個 pane | **沒有逐字斷言**（既有測試只驗那一塊在不在） | 🟡 partial |
| AC-06.3 | 「回測了 N 根」 | 逐字 | 兩個 pane | **沒有逐字斷言** | 🟡 partial |
| AC-06.4 | 「拿去回測」 | 逐字 | `TradingStrategyBacktestPane.vue` | **沒有逐字斷言** | 🟡 partial |

### US-07 — 助手叫 AI-Assistant

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-07.1 | 側欄那一格 | 逐字 | `DESTINATIONS` 第八列 | 「提供各畫面之間的導覽，而且是照那個順序」 | ✅ conforms |
| AC-07.2 | 底部那一格 | 逐字 | 同一張表 | 「常用的四個直接露出來」`tab-/chat` 斷言 `AI-Assistant` | ✅ conforms |
| AC-07.3 | `/chat` 那一頁的標題 | 逐字 | `pages/chat/index.vue` | **沒有頁面層測試** | 🟡 partial |
| AC-07.4 | 抽屜的標頭與無障礙名稱 | 逐字 | `AssistantDrawer.vue` | `AssistantDrawer.spec.ts`「標頭說的是它叫什麼：AI-Assistant」（`aria-label` `toBe` ＋ 內文 `toContain`） | ✅ conforms |
| AC-07.5 | 那一枚的無障礙名稱 | 說得出名字與可拖 | `AssistantTriggerButton.vue` 的 `label` | `AssistantTriggerButton.spec.ts`「說得出自己是誰，也說得出它可以被拖」 | ✅ conforms |
| AC-07.6 | 句子裡的「助手」不改 | 反向條款 | `AssistantPendingNotice.vue` 等未動 | `AssistantPendingNotice.spec.ts` 既有的「助手正在查…」斷言未動且全綠——**它就是那條反向保護** | ✅ conforms |

### US-07b — 市集叫 Marketplace，圖示是一間店

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-07b.1 | 側欄那一格寫 `Marketplace` | 逐字 | `DESTINATIONS` 第五列 | 「提供各畫面之間的導覽，而且是照那個順序」 | ✅ conforms |
| AC-07b.2 | 「更多」那一條 | 逐字 | 同一張表 | 「其餘五個收在『更多』那張紙裡」`more-/marketplace` 斷言 | ✅ conforms |
| AC-07b.3 | 那一頁的標題 | 逐字 | `pages/marketplace/index.vue` | **沒有頁面層測試**（與 AC-03.2 同一個理由） | 🟡 partial |
| AC-07b.4 | 策略腳本庫那句指路 | 逐字 | `StrategyScriptLibraryDialog.vue` | `StrategyScriptLibraryDialog.spec.ts`「空的那一份說得出下一步」斷言 `toContain('Marketplace')` | ✅ conforms |
| AC-07b.5 | 圖示與 `library` 不是同一顆 | 兩顆畫的不一樣 | `AppIcon` 新增 `store`；`library` 未動 | `AppIcon.spec.ts`「每個圖示畫的都不一樣」把 `store` 與 `library` 一起納入名單——**同一份路徑貼成兩個名字會當場紅**；`ConsoleLayout.spec.ts`「側欄上每一格的圖示都不一樣」逐格讀 `data-icon` | ✅ conforms |
| AC-07b.6 | 句子裡的「市集」不改 | 反向條款 | `use-strategy-script-library.ts` 等未動 | `use-strategy-script-library` 相關測試中「已經分享到市集。」等既有斷言未動且全綠 | ✅ conforms |

### US-08 — 那顆鍵換一個長相

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-08.1 | 圓角方塊，不再是圓的 | class 換了 | `AppButton` 新增 shape `squircle`；那一枚改用它 | `AssistantTriggerButton.spec.ts`「是一枚會發光的圓角方塊，不是一顆圓球」（含 `not.toContain('app-button--circle')`）；`AppButton.spec.ts` 三種 shape 各一條 | ✅ conforms |
| AC-08.2 | 四角星 ＋ `AI` | — | 那一枚的 `__mark` | `AssistantTriggerButton.spec.ts`「掛的是四角星，不是機器人頭」（`data-icon` `toBe('sparkle')`）。那兩個字母**沒有斷言** | 🟡 partial |
| AC-08.3 | 漸層與柔光 | — | `AppButton` 的 `--accent` ＋ `shadow('glow')` | class 由兩邊各斷一次；**樣式本身不由測試守**（與這個專案既有的立場一致），另由 `lint:tokens` 保證那兩個 token 真的存在 | 🟡 partial |
| AC-08.4 | 大小仍由外面給 | 兩邊同一個數字 | 那一枚的 `placement` 未動 | `AssistantTriggerButton.spec.ts`「畫成外面說的那麼大」，未動且全綠 | ✅ conforms |
| AC-08.5 | 拖與按的行為一字不改 | **沒有回歸** | `AssistantTriggerPositionDomain`、`AssistantTriggerService`、`use-assistant-trigger` **一行未動** | `assistant-trigger-position-domain.spec.ts`、`assistant-trigger-service.spec.ts`、`use-assistant-trigger.spec.ts`、`assistant-trigger-application.spec.ts` 四份**一行未動**且全綠 | ✅ conforms |
| AC-08.6 | 四角星四處共用 | — | 側欄、抽屜標頭、兩種訊息頭像 | 側欄與抽屜各有一條；兩個頭像**沒有斷言** | 🟡 partial |
| AC-08.7 | 機器人頭刪掉、`standing-bot` 留著 | 型別上不存在 | `AppIcon` 的 `IconName` 少一個、多兩個 | `bun run typecheck` 全綠＝**沒有一處還在要它**（漏改一處就是編譯錯誤）；`AppIcon.spec.ts` 的名單納入 `standing-bot` | ✅ conforms |

### US-09 — 底部那一排指向日常動線

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-09.1 | 露出來的四格 | 逐個 | `DESTINATIONS` 的 `primary` | 「常用的四個直接露出來」四條 testid 斷言 | ✅ conforms |
| AC-09.2 | 收進「更多」的五條 | 逐個 | 同一張表 | 「其餘五個收在『更多』那張紙裡」五條 testid 斷言 | ✅ conforms |
| AC-09.3 | 九個加起來只出現一次 | 四＋五＝九 | 兩份導覽讀同一張表 | 「九個去處加起來出現一次，不多不少」＋「去處永遠看得見」（五個 tab），未動且全綠 | ✅ conforms |
| AC-09.4 | 「更多」會自己亮 | — | `insideMore` 未動 | 那兩條既有測試（停在 `/settings` 亮、停在 `/strategy-scripts` 不亮）全綠 | ✅ conforms |

### 非功能

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| NFR-01 | 新的長相一律走 token | 元件內沒有字面值 | `_tokens.scss` 新增 `glow` / `glow-strong`；元件只用 `shadow()` / `color()` | `bun run lint:style`（`color-no-hex`、`function-disallowed-list` 擋 `rgb()`）＋ `bun run lint:tokens` 全綠 | ✅ conforms |
| NFR-02 | 那兩筆陰影真的編得出來 | 兩層陰影不能變成 `(a, b)` | Sass 的括號逗號列表 interpolate 後不帶括號 | `bun run build` 產出 `--shadow-glow:0 0 0 1px rgba(108,182,255,.3),0 6px 28px rgba(108,182,255,.28)`——**實際讀過編譯結果** | ✅ conforms |
| NFR-03 | `AI-Assistant` 在 390 寬放得下 | 不換行、不裁切 | 底部那一格 `white-space: nowrap`，字級 `2xs` | **以 390 寬的靜態重現頁實際量過**（五格、每格 78px，那一格的字沒有溢出）。未納入自動檢查——`bun run shots` 的溢出量測需要一份正式帳密 | 🟡 partial |
| NFR-04 | 後端契約一個字不變 | 請求與回應不變 | 沒有動任何 proxy 的端點、請求體或 wire 型別 | 每一份 proxy 測試未動且全綠 | ✅ conforms |

---

## 沒有被釘住的那幾條，為什麼

這一刀有 **13 條 🟡**，其中 11 條是同一類：**一句畫面上的話改了，而那句話沒有逐字斷言**。

這是刻意的取捨，不是遺漏：

- **替每一句畫面文字寫一條逐字斷言，是在複製那句話**，而不是在驗證它。
  那種測試唯一擋得住的是打字失誤，代價是每次改措辭都要改兩個地方——
  於是它訓練的是「改測試讓它變綠」，而不是「想清楚這句話該怎麼說」。
- 所以這裡逐字釘住的只有**兩種**：
  1. **有反向條款的**（止損⇄停損、`AI-Assistant` ⇄「助手」、
     「訊號」⇄「一個信號」）——那幾組詞錯了會讓使用者把兩件事當成一件，
     而單向斷言擋不住「兩邊都改成同一個」，所以它們一律**兩正兩反**地斷。
  2. **同一個東西在不同時點必須說同一個詞的**（那顆回測鍵的三個時點）。
- 其餘的由 `toEqual` 一整張有序去處表、由 TypeScript、由 lint 守住結構，
  措辭本身交給人眼與這份文件。

另有 2 條 🟡 屬於別的原因：

- **AC-03.2 / AC-07.3（頁面標題）**：這個專案的 `pages/` 只做接線，一律不寫頁面層測試。
  改這條規矩不屬於這一刀。
- **AC-08.3 / NFR-03（樣式與版面）**：樣式不由單元測試守，是這個專案既有的立場
  （見 `2026-09-20-backtest-transaction-costs` 的 AC-01.5）。版面則已用一份
  390 寬的靜態重現頁實際量過。

---

## 這一刀之外，順手看見但**沒有動**的一件事

`backtest-rule-vo.ts` 仍然有一條規則寫著「**這一版不算手續費、滑點與槓桿**」，
而**上一刀（`2026-09-20-backtest-transaction-costs`）已經讓回測算得出手續費了**。
`backtest-rule-vo.spec.ts` 還有一條測試叫「手續費與滑點那一條還在——它們真的仍然不算」
在替它背書。

那份說明自己的檔頭寫著：「**這份說明與真正的行為必須一起改**……說謊的說明比沒有說明更糟，
因為讀的人會照著它做決定。」

**這一刀沒有修它**，因為它不是措辭問題而是**事實問題**——要說什麼取決於後端現在到底收不收
滑點與槓桿，那是上一刀的遺留，應該回到上一刀的脈絡裡決定，而不是在一次詞彙校準裡順手改掉
一段使用者會照著做決定的說明。
