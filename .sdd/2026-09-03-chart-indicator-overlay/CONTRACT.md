# 在 K 線圖表上套用策略 — Contract Verification

**Contract source:** `.sdd/2026-09-03-chart-indicator-overlay/PRD.md`（Section 3 驗收條件）
**Design map:** `ARCH.md`（同資料夾）
**Verified:** 2026-09-03
**Ceiling:** 靜態一致性稽核——逐條把**測試的斷言**與**程式碼路徑**各自對照 PRD 導出的預期結果，
不靠整套測試的綠燈下判斷，也不執行自行發明的情境。

**獨立性關卡（Phase 2）如何被滿足：** 每一條的預期結果在**實作之前**就寫死在
`scratchpad/oracle-slice2.md`——當時本切片的程式碼一行都還不存在。下表 Oracle 欄逐條引自它。

---

## 1. Clauses

| ID | Clause（PRD scenario） | Oracle（實作前釘住） | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AC-01.1 | 挑一支就立刻算並畫出來 | O-01：清單 1 列、計算恰好 1 次、圖上多 1 條線 | `use-chart-indicators.ts:applyStrategy` | `KCandleChartPanelIndicators.spec.ts:挑一支就立刻算，不必再按任何按鈕` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.2 | 可以同時疊好幾支 | O-02：清單 2 列、圖上 2 條線 | 同上（持有的是一份清單） | 同檔:`可以同時疊兩支` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.3 | 已套用的不再出現在可挑清單 | O-03：可挑選項不含它的名字 | `use-chart-indicators.ts:selectableStrategies` | 同檔:`已經套用的那一支不再出現在可挑清單裡` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.4 | 移除一支就只移除它 | O-04：清單只剩另一支、圖上只剩它的線 | `use-chart-indicators.ts:removeStrategy` | 同檔:`移除一支時只移除它，另一支照樣留在圖上` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.5 | 一支都沒套用時圖表與先前完全一樣 | O-05：交給圖表的線是空陣列 | `KCandleChart.vue` 的 `indicators` 預設空陣列 | 同檔:`一支都沒套用時，交給圖表的線是空的`；`KCandleChart.spec.ts:一支都沒套用時，一條指標線都不畫` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01.6 | 一支策略都還沒存過 | O-06：出現說明、沒有可挑的選單 | `ChartIndicatorPanel.vue` 的空狀態 | 同檔:`一支策略都還沒存過時明說，而不是留一個空選單` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.1 | 用圖上正在畫的那批 K 線去算 | O-07：標的／刻度／根數／算到哪一刻全部來自圖上那批 | `KCandleChartPanel.vue` 組請求 + `chart-indicator-service.ts` | 同檔:`算的是圖上正在畫的那批 K 線`；`chart-indicator-service.spec.ts:拿圖上那批 K 線的每一個條件去算` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.2 | 換交易標的時每一支都重算 | O-08：再發生 1 次，帶新標的 | `reloadedChart !== null` 這一個觸發點 | 同檔:`換交易標的就重算一次` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.3 | 換到需重新取 K 線的區間時重算 | O-09：再發生 1 次 | 同上 | 同檔:`拉到需要重新取一批 K 線的區間時，也重算一次` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.4 | 圖上那批沒換就不重算 | O-10：計算次數不變 | 同上（既有取回計畫） | 同檔:`圖上那批 K 線沒換就不重算` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02.5 | 一支都沒套用時不發生任何計算 | O-11：計算次數＝0 | `recalculateAll` 走空清單 | 同檔:`一支都沒套用時，換交易標的不發生任何計算` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03.1 | 一個數字畫成水平線 | O-12：1 條水平線、值 115、名稱「均價」；曲線為空 | `chart-indicator-domain.ts:toLevelDtos` | `chart-indicator-domain.spec.ts:每個指標名稱一條水平線，帶著它的值`；`KCandleChart.spec.ts:一個數字畫成一條水平線` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03.2 | 一串數字畫成曲線，第 n 個值對第 n 根 | O-13：值與起始時間逐一對上；水平線為空 | `chart-indicator-domain.ts:pointsOf` | `chart-indicator-domain.spec.ts:第 n 個值配上第 n 根 K 線的起始時間`；`KCandleChart.spec.ts:一串數字畫成一條曲線` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03.3 | 值比 K 線少時靠右對齊 | O-14：2 個值、3 根 → 2 點，時間為**後** 2 根；最後一個值落在最後一根 | 同上 | `chart-indicator-domain.spec.ts:值比 K 線少時靠右對齊——少掉的是最前面那幾根`、`最後一個值永遠落在最後一根 K 線上`、`值比 K 線多時，多出來的那幾個落在頭部之外，不畫` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03.4 | 好幾個指標名稱就畫好幾條線 | O-15：2 條線、各有名稱、**顏色不同** | `chart-indicator-domain.ts:drawableLines` | `chart-indicator-domain.spec.ts:一次產出好幾個指標名稱就畫好幾條，且各有各的顏色`；`KCandleChartPanelIndicators.spec.ts:一支畫出兩條線時兩條都列出來` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03.5 | 是非類型挑不到 | O-16：選項被停用且標明畫不成線 | `StrategyDto.drawableOnChart` + `ChartIndicatorPanel.vue` | `KCandleChartPanelIndicators.spec.ts:是非類型的策略列得出來但挑不到` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03.6 | 一個指標名稱都沒產出不是失敗 | O-17：兩份清單都空、**沒有**失敗說明 | `ChartIndicatorDto.drawsNothing` | `chart-indicator-domain.spec.ts:一個指標名稱都沒有時兩份清單都是空的`；`KCandleChartPanelIndicators.spec.ts:算完但一個指標都沒有時明說，而不是當成失敗` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04.1 | 剛套上去就已經分得出來 | O-18：3 條線 3 種不同顏色，使用者未挑 | `chart-line-color-domain.ts` 依序取沒被用掉的 | `chart-line-color-domain.spec.ts:沒挑過時避開已經用掉的`（涵蓋到第三個顏色）；`KCandleChartPanelIndicators.spec.ts:連續套用兩支時，它們是不同顏色` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04.2 | 換一條線的顏色只換那一條 | O-19：那條變新色、另一條不變、**不重算** | `ChartIndicatorDto.withLineColor` | `chart-indicator-service.spec.ts:只換那一條，其他線不動`；`KCandleChartPanelIndicators.spec.ts:換一條線的顏色，圖上立刻換，且不重算` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04.3 | 這台瀏覽器記住挑過的顏色 | O-20：記住後再套用同一條線 → 用記住的那個 | `ChartLineColorPreferenceProxy` + `chart-indicator-domain.ts` | `KCandleChartPanelIndicators.spec.ts:重新打開畫面再套用同一支，用的是上次挑過的那個顏色`（**本次稽核補上**）；`chart-line-color-preference-proxy.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04.4 | 瀏覽器不讓存東西時照樣換色 | O-21：讀＝視為沒挑過、寫＝不拋錯 | `ChartLineColorPreferenceProxy` 的 try/catch | `chart-line-color-preference-proxy.spec.ts:瀏覽器不讓寫時…`、`不讓讀時…` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04.5 | 同一支策略畫出的兩條線是不同顏色 | O-22：同 AC-03.4 | `chart-indicator-domain.ts:drawableLines` 逐條配色 | 同 AC-03.4 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04.6 | 挑過的顏色即使被用掉也照樣採用 | O-23：記住＝X 且 X 已被用掉 → 仍用 X | `chart-line-color-domain.ts` 的優先序 | `chart-line-color-domain.spec.ts:挑過的顏色即使已經被別條線用掉了，還是用它` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05.1 | 算式跑不動時就地說明 | O-24：該支旁邊有含該原因的說明；圖上線數＝0 | `use-chart-indicators.ts` 的失敗路徑 | `KCandleChartPanelIndicators.spec.ts:算式跑不動時就地說明，且圖上沒有它的線` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05.2 | K 線根數不足時就地說明 | O-25：同上，說明含系統給的原因 | 同上（原因原樣轉達） | 同檔:`失敗的那一支留在清單上，換了資料就再試一次`（以「K 線不足」為例） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05.3 | 連不上系統時就地說明 | O-26：該支旁邊說明「連不上」 | `use-chart-indicators.ts:messageOf` | 同檔:`連不上系統時就地說明` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05.4 | 一支失敗不影響其他支 | O-27：失敗那支有說明、另一支沒有；圖上線數＝1 | 每一支各發各的請求、各自記錄成敗 | 同檔:`一支失敗不影響另一支` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05.5 | 失敗的留在清單上並在下次重算時再試 | O-28：換標的後說明消失、線數＝1 | `recalculateAll` 一視同仁 | 同檔:`失敗的那一支留在清單上，換了資料就再試一次` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05.6 | 重算失敗時上一輪那條線要收掉 | O-29：先成功（線＝1）→ 重算失敗 → 有說明且**線＝0** | `use-chart-indicators.ts` 的 catch 同時移除該支的線 | 同檔:`重算失敗時，上一批算出來的線也要收掉` | asserts-oracle | produces-oracle | ✅ conforms |

### Section 4 的核心規則（BR）

| ID | Rule | 判定 |
| :--- | :--- | :--- |
| BR-1 | 套用的單位是策略，畫線的單位是指標名稱 | 由 AC-03.4 覆蓋 ✅ |
| BR-2 | 同一支策略不重複套用 | 由 AC-01.3 + `KCandleChartPanelIndicators.spec.ts:同一支重複挑不會被套用第二次` 覆蓋 ✅ |
| BR-3 | 是非類型不可套用 | 由 AC-03.5 覆蓋 ✅ |
| BR-4 | 重算的觸發沿用既有的「要不要重新取」 | 由 AC-02.2～02.4 覆蓋 ✅ |
| BR-5 | 每一支各自成敗，並收掉上一輪的線 | 由 AC-05.4／05.6 覆蓋 ✅ |
| BR-6 | 顏色身分＝策略＋指標名稱；挑過的優先於避開重複 | 由 AC-04.3／04.6 覆蓋 ✅ |
| BR-7 | 一串數字以「這次讀了哪幾根」**靠右**對位 | 由 AC-03.2／03.3 覆蓋 ✅ |
| BR-8 | 一個指標名稱都沒產出是成功 | 由 AC-03.6 覆蓋 ✅ |

---

## 2. Orphans

| Behavior | Site | 判定 |
| :--- | :--- | :--- |
| 圖上一根 K 線都沒有時不發計算 | `use-chart-indicators.ts:87` | PRD Section 4 的 Edge Case 明列，非孤兒。已有測試 |
| 挑到選單上那個「套用一支策略…」時什麼都不做 | `ChartIndicatorPanel.vue:applyPicked` | 選單自身的空選項，非業務規則。已有測試 |
| 沒見過的失敗也說得出一句話 | `use-chart-indicators.ts:messageOf` 的 fallback | PRD 未明列，但「不吞錯誤、不留白」是專案既有規範。已有測試 |
| 取不到策略清單時圖表照畫 | `KCandleChartPanel.vue:onMounted` 的 catch | PRD 未明列。判斷理由寫在程式碼註解裡：讓一個附加功能決定主功能能不能用是錯的。已有測試 |
| 換一批指標時先整批收掉上一批 | `KCandleChart.vue:drawIndicators` | 繪圖函式庫的必要動作（沒有「清掉全部」的呼叫），非業務規則。已有測試 |

**無違反 Out of Scope 的實作。** 逐條確認：未在圖表上編輯或新增策略、未實作是非類型的呈現、
未留存已套用的清單、未做線寬／線型／副圖／數值標籤、未動指標計算畫面。

---

## 3. Summary

```
✅ 29 conforms · 🔴 0 violations · 🟠 0 mis-asserted · 🟡 0 partial · ❌ 0 gaps · ❔ 0 unclear · ⚠️ 5 orphans（皆已說明）
Conformance: 100%
```

**本次稽核找到並修掉的一處：**

- **AC-04.3**（這台瀏覽器記住挑過的顏色）原本是 🟡 **partial**：
  兩半各自有測試（儲存那一層記得住、領域那一層會優先採用），
  但**整條路徑在畫面層沒有被走過一次**——沒有任何測試證明「儲存裡的那個顏色
  真的變成圖上那條線的顏色」。補上
  `KCandleChartPanelIndicators.spec.ts:重新打開畫面再套用同一支，用的是上次挑過的那個顏色`，
  並以突變確認：讓記住的顏色不再被採用，該測試立刻紅。

**覆蓋率**（`vitest --coverage`）：本切片新增／改動的**每一個檔案**皆
100% 敘述、100% 分支、100% 行。達成過程中刪掉了兩段到不了的防衛分支
（選單找不到策略、序列在但加線能力不在），而不是替不可能的狀態寫測試。

**突變測試**：十一個針對本切片新規則的突變，第一輪有一個倖存
（「是非也被當成線畫」——原測試只涵蓋一個是非，沒涵蓋一串是非，
而後者會產出一條零點的幽靈線）。補測試後全部被殺，無倖存者。

---

## 4. 覆核後的修正（2026-09-03）

這份矩陣寫完之後又做了一次程式碼覆核，抓到五件測試與矩陣都沒問到的事。
它們都不是「條款寫錯」，而是**條款沒問到的那一格**——所以修的是程式，同時補上會紅的測試。

| # | 問題 | 為什麼矩陣當時沒抓到 | 處置 |
|---|---|---|---|
| 1 | 正在算的時候移除它，結果回來又把線加回圖上 | AC-01.4（移除只移除它）只描述「已經算完」的狀態，沒有「正在算」這個時間差 | 每一支各自記「這是第幾次要求」，移除時把號碼往前推；不是最新的那一次回來就丟掉 |
| 2 | BTC→ETH→BTC 時，慢回來的 ETH 蓋掉較新的 BTC | AC-02.2 只說「重算一次」，沒說回應可能亂序 | 同上一套機制。圖表本身早就有同一個機制，理由一模一樣 |
| 3 | 同時算好幾支時，全部拿到第一個顏色 | AC-04.1 的情境是「連續套用三支」，逐一送出時成立；上一輪全部失敗後的重算是同時送出，不成立 | 重算改成一支一支來，讓配色變成確定的 |
| 4 | 一串數字靠左對齊，滾動窗口的指標整條往左位移一個窗口 | **AC-03.3 當時就是這樣簽的**——是驗收條件本身漏想了「少掉的是哪一端」 | 改成靠右對齊，BRIEF／PRD／ARCH／UL-MAP 一併更新（見上表 AC-03.3） |
| 5 | 取行情失敗時，上一批的線留在一張空圖上 | AC-05.6 講的是「某一支重算失敗」，這裡是**圖整批取不到**，兩者不同 | 圖沒了就把線收掉，已套用的清單留著等圖回來重算 |

第 4 項動到已經簽下去的驗收條件，是使用者當面授權的（「修到好」）。
其餘四項都在既有條款的空隙裡，沒有改動任何一條原有條款的語意。
