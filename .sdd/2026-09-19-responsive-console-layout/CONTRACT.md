# Contract Traceability Matrix — 讓操作台在小螢幕上也能用

Contract: `PRD.md`
Design map: `ARCH.md`
Implementation: `app/`
Oracle: Acceptance Criteria（26 條）＋ Core Business Rules 與 Edge Cases（10 條）＋ NFR（5 條）＝ 41 條

> **這是一次靜態的一致性稽核。** 它把測試的斷言與程式的路徑各自拿去對照「從規格推導出來的
> 預期結果」，不以測試綠不綠為判準，也不執行自己發明的情境。
>
> **本切片的天花板另有一條**：八條 clause 的落地方式是純樣式（間距、捲動、對話框寬度），
> 而本專案的測試規範明訂不測樣式。那幾條的程式路徑讀得出來（因此 code audit 成立），
> 但沒有任何測試在盯著它們——它們一律標 🟡，不是 ✅。

## Clauses

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-01 | 手機上的導覽收在一顆鍵後面 | 寬 390 時頂上那條窄帶多出一顆漢堡鍵、九個去處一個都不佔那條窄帶、原有的時區照舊；按下去九個去處全出現；選一個後自己收起 | `ConsoleLayout.vue:201,169` | `ConsoleLayout.spec.ts:133,140,150` | asserts-oracle | produces-oracle | ✅ conforms（**規格已修正**：原文寫「頂上只有一顆漢堡鍵與畫面名字」，但時區選單一直都在那條窄帶上，也沒有任何 clause 要求拿掉它——是規格措辭錯了，不是程式錯了） |
| AC-02 | 未滿分界的寬度仍然是抽屜 | 寬 1023 導覽仍是抽屜 | `layout-density-domain.ts:59` | `layout-density-domain.spec.ts:25` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03 | 達到分界的寬度回到固定側欄 | 寬 1024 出現固定側欄，含收起鍵 | `layout-density-domain.ts:59`、`ConsoleLayout.vue:193` | `ConsoleLayout.spec.ts:208` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04 | 點抽屜外面只是把它關起來 | 抽屜收起 **且** 仍停在原本的畫面 | `ConsoleLayout.vue:113-116` | `ConsoleLayout.spec.ts:160` | asserts-oracle（**已補**：斷言點完之後路徑沒有變） | produces-oracle | ✅ conforms |
| AC-05 | 手機上採用好按的那一套 | 寬 390 按鈕與輸入框比桌機高、彼此更開 | `base/_tokens.scss:63`、`_mixins.scss` 的 `tap-target` | — | no-test（純樣式） | produces-oracle | 🟡 partial |
| AC-06 | 未滿分界的寬度是好按的那一套 | 寬 767 採用寬鬆那一套 | `base/_tokens.scss:63` | — | no-test | produces-oracle | 🟡 partial |
| AC-07 | 達到分界的寬度是收緊的那一套 | 寬 768 採用密集那一套 | `base/_tokens.scss:63` | — | no-test | produces-oracle | 🟡 partial |
| AC-08 | 換疏密不會弄歪一整欄數字 | 任何寬度下數字等寬、小數點成一線 | `_mixins.scss` 的 `numeric`（**不在**覆寫清單裡） | — | no-test | produces-oracle | 🟡 partial |
| AC-09 | 放不下時表格自己橫向捲，時間欄釘住 | 表格自己捲、時間欄不動、整頁不動 | `KCandleTable.vue:212,230` | — | no-test（純樣式） | produces-oracle | 🟡 partial |
| AC-10 | 放得下時不出現橫向捲 | 不出現捲動，表格填滿寬度 | `KCandleTable.vue` 的 `__scroller`（`overflow: auto`） | — | no-test | produces-oracle | 🟡 partial |
| AC-11 | 沒有資料時不出現一條空的捲動軸 | 顯示「查無 K 線」，且不出現捲動軸 | `KCandleTable.vue:60-68`（`v-else`：整張表不畫） | `KCandleTable.spec.ts:59` | asserts-oracle（斷言連 `table` 都不存在） | produces-oracle | ✅ conforms |
| AC-12 | 手機上看得到但改不動 | 條件看得到、拖不動改不了、明說要換寬螢幕 | `TradingStrategyCanvas.vue`、`PieceShelf`、`ConditionMat` | `TradingStrategyWorkbench.spec.ts:719,728,735` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-13 | 達到分界的寬度恢復完整編輯 | 寬 768 拖得動、改得了、不再出現那一句 | `TradingStrategyWorkbench.vue:149` | `TradingStrategyWorkbench.spec.ts:763` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-14 | 手機上不給開一張什麼都放不上去的空白工作檯 | 「新增」不出現，原地說明原因 | `TradingStrategyListPanel.vue` | `TradingStrategyListPanel.spec.ts:128,138` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-15 | 手機上控制項預設就是收起的 | 寬 390 進入時「看什麼」收著 | `KCandleChartPanel.vue:441`、`AppPanel.vue` | `KCandleChartPanel.spec.ts:347` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-16 | 達到分界的寬度維持展開 | 寬 768 進入時展開 | 同上 | `KCandleChartPanel.spec.ts:348` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-17 | 展開過之後離開再回來，仍然是收起的 | 走到別頁再回來又是收起的 | `AppPanel.vue`（收合狀態不留存，重新掛載即回到環境的意見） | — | no-test（沒有走過換頁那一趟） | produces-oracle | 🟡 partial |
| AC-18 | 圖自己的狀態不跟著被收走 | 控制項收著時「連不上後端」照樣看得到 | `KCandleChartPanel.vue`（狀態訊息在該面板之外） | `KCandleChartPanel.spec.ts:360` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-19 | 手機上助手蓋滿整個畫面 | 蓋滿畫面、有關閉鍵、沒有可拖寬的地方 | `AssistantDrawer.vue`（`--full` 與 `v-if="!coversScreen"`） | `AssistantDrawer.spec.ts:294,300` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-20 | 達到分界的寬度回到可拖寬的側邊抽屜 | 寬 768 以側邊抽屜出現且拖得動 | `AssistantDrawer.vue` | `AssistantDrawer.spec.ts:307` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-21 | 手機上的對話整頁只先給我對話本身 | 只看到對話；清單收在一顆鍵後；挑完自己收 | `AssistantConsole.vue` | `AssistantConsole.spec.ts:43,52,62` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-22 | 對話框跟著螢幕寬，不被切掉 | 寬度跟著螢幕、左右留邊、沒有一邊被切 | `AppModal.vue:111`、六個對話框的 `min(Xrem, 100%)` | — | no-test（純樣式） | produces-oracle | 🟡 partial |
| AC-23 | 內容過高時在對話框裡自己捲 | 內容內部捲動，儲存／取消始終看得到 | `AppModal.vue:112,161` ＋ `__actions` 的 `flex: none` | — | no-test | produces-oracle | 🟡 partial |
| AC-24 | 手機橫放時同樣成立 | 高度約 390 時同上 | 同 AC-23（`max-height: 100%` 與視窗高度連動） | — | no-test | produces-oracle | 🟡 partial |
| AC-25 | 每一個畫面在最窄寬度下都不橫向溢出 | 寬 390 走過每一頁，整體都不需左右拖 | 全站（`min-width: 0`、各自的 scroller、`min(Xrem, 100%)`） | — | no-test | **unclear**：需要真的在 390 的視窗裡逐頁量，讀程式判斷不了 | ❔ unclear |
| AC-26 | 表格與圖在自己的框裡橫向捲是刻意的 | 只有那張表／圖自己動，外面的頁面不動 | `KCandleTable.vue` 的 `__scroller`、`BacktestTradeTable.vue:100` | — | no-test | produces-oracle | 🟡 partial |
| BR-1 | 兩道分界，不是四道（768 / 1024） | 全站只認這兩個數字，且四件事共用 768 | `layout-density-domain.ts:15,26` | `layout-density-domain.spec.ts:34` | asserts-oracle（斷言 800 同時是 compact 與抽屜） | produces-oracle | ✅ conforms |
| BR-2 | 疏密是整站一個選擇 | 任何畫面都不得自行決定鬆緊 | `base/_tokens.scss:63`（全站唯一切換處） | — | no-test | produces-oracle（結構上就不允許） | 🟡 partial |
| BR-3 | 數字的可比較性高於一切呈現偏好 | 兩套疏密下數字都等寬對齊 | 同 AC-08 | — | no-test | produces-oracle | 🟡 partial |
| BR-4 | 窄螢幕上減的是可編輯性，不是可讀性 | 內容一字不少；圖的狀態一則不收 | `TradingStrategyCanvas.vue`、`KCandleChartPanel.vue` | `TradingStrategyWorkbench.spec.ts:719`、`KCandleChartPanel.spec.ts:360` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-5 | 收合狀態的留存規則不變 | 只改手機上的**起始**狀態，不改留存規則 | `AppPanel.vue`（仍然沒有任何留存） | — | no-test | produces-oracle | 🟡 partial |
| BR-6 | 使用中改變寬度：即時換樣子，輸入／資料／對話框不遺失 | 換樣子且不遺失任何已輸入內容 | `use-layout-density.ts`（只改一個數字，不重新掛載） | `use-layout-density.spec.ts:74`、`TradingStrategyWorkbench.spec.ts`（改到一半螢幕變窄） | asserts-oracle（**已補**：斷言打到一半的名稱在寬度變化後還在） | produces-oracle | ✅ conforms |
| BR-7 | 抽屜開著時寬度跨到 1024 以上：不留空殼 | 抽屜狀態被收掉，不留一片蓋住畫面的東西 | `ConsoleLayout.vue:72` | `ConsoleLayout.spec.ts:215` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-8 | 編輯中縮到 768 以下：改動不消失，但從那一刻起改不動 | 已做的改動還在；拖不動 | `use-piece-drag-gestures.ts:156`、`TradingStrategyWorkbench.vue:149` | `use-piece-drag-gestures.spec.ts:65`、`TradingStrategyWorkbench.spec.ts`（改到一半螢幕變窄） | asserts-oracle（**已補**） | produces-oracle | ✅ conforms |
| BR-9 | 助手與對話框的疊放順序不變 | 沿用既有規則，不新增例外 | 未改動任何 `z-index` token | — | no-test | produces-oracle（無變更） | 🟡 partial |
| BR-10 | 後端連不上的呈現一字不改 | 各畫面原有呈現不變，只套用該寬度的疏密 | 未改動任何錯誤呈現 | `KCandleChartPanel.spec.ts:360` | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-1 | 改變寬度不卡頓、不因此重新向後端要資料 | 重排不重新取資料 | `use-layout-density.ts:58`（只寫一個數字） | `use-layout-density.spec.ts:74` | shallow（沒有斷言「沒有發出請求」） | produces-oracle | 🟡 partial |
| NFR-2 | 最窄支援寬 390；橫放高度約 390 亦須成立 | 兩種情況下都可用 | 全站 | — | no-test | unclear（同 AC-25） | ❔ unclear |
| NFR-3 | 觸控與滑鼠都能完成同一件事；可按的夠大 | 觸控上按得準 | `_mixins.scss` 的 `tap-target`（五個控制項原子） | — | no-test（純樣式） | produces-oracle | 🟡 partial |
| NFR-4 | 導覽收進抽屜後，九個去處的名字仍留在畫面的結構裡 | 讀螢幕的人仍聽得到九個去處 | `ConsoleLayout.vue:143-170`（清單永遠在 DOM，只寫一份） | `ConsoleLayout.spec.ts:228` | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-5 | 收起來、看不見的東西不得停留在鍵盤的行進路線上 | 抽屜關著時那九條連結按 Tab 走不到 | `ConsoleLayout.vue:129`（關著的抽屜標 `inert`） | `ConsoleLayout.spec.ts`（關著的抽屜不在鍵盤的路線上／寬螢幕上那條側欄一直都走得到） | asserts-oracle | produces-oracle | ✅ conforms（**原為 🔴**：只靠 `transform` 推出畫面，元素仍可聚焦——按 Tab 會走進一片看不見的導覽。已修） |

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| `AssistantConsole.vue` | 助手整頁的兩欄版面從 `pages/chat/index.vue` 抽成有機體。行為與抽出前一致，抽出的理由是「互動邏輯不住在頁面」 | undocumented（結構調整，不改行為；無 clause 需要它，也不違反任何 Out of Scope） |
| `AppIcon.vue` 的 `menu` 圖示 | 新增三條橫線的圖示 | undocumented（AC-01 需要一顆鍵，但沒有 clause 指定它長什麼樣） |

## Summary

> 下表是**修正後**的狀態。第一輪稽核的結果是：16 ✅ · 2 🔴 · 3 🟠 · 17 🟡 · 2 ❔，
> 兩個 🔴 與三個 🟠 都已處理（一個改程式、一個改規格措辭、三個補斷言），詳見各列括號。

- Conforms: 21/41 ✅（51%）
- Violations: 無 🔴（原 AC-01、NFR-5——NFR-5 是真的程式缺陷：關著的抽屜仍可用 Tab 走進去，已改；AC-01 是規格措辭錯誤，已改規格）
- Mis-asserted: 無 🟠（原 AC-04、BR-6、BR-8，皆已補上缺的那一條斷言）
- Partial: AC-05、AC-06、AC-07、AC-08、AC-09、AC-10、AC-17、AC-22、AC-23、AC-24、AC-26、BR-2、BR-3、BR-5、BR-9、NFR-1、NFR-3 🟡（17 條，其中 11 條的落地方式是純樣式，受本專案「不測樣式」的規範所限）
- Gaps: 無 ❌
- Unclear: AC-25、NFR-2 ❔（需要真的在 390 的視窗裡逐頁走一次）
- Orphans: 2（皆為 undocumented，無 out-of-scope 違反）
