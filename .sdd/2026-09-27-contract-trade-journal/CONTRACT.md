# Contract Traceability Matrix — 合約交易日誌（操作台）

Contract: PRD.md
Design map: ARCH.md
Implementation: app/（go-trading-frontend，branch feat/contract-trade-journal）
Oracle: Acceptance Criteria (77 clauses：70 AC、5 BR、2 NFR)

> 靜態一致性稽核：依 PRD 推出每條的預期結果，分別判斷測試是否斷言它、程式是否產生它；不執行自創情境。驗證過程中修正了 AC-18（補測試）、AC-19、AC-30、AC-32（程式與測試），下表為修正後狀態。

## Clauses

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-01 | 寬螢幕側欄有交易日誌 | 側欄出現「交易日誌」並通往合約交易日誌 | ConsoleLayout.vue:24 | ConsoleLayout.spec.ts 側欄是八個去處 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02 | 窄螢幕在「更多」裡 | 「更多」裡出現「交易日誌」 | ConsoleLayout.vue:39 | ConsoleLayout.spec.ts 更多裡是…交易日誌 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03 | 交易日誌上的現貨／合約開關 | 開關停在合約、按不動、說明「交易日誌目前只有合約」 | market-counterpart-domain.ts SINGLE_SIDED_DESTINATIONS | market-counterpart-application.spec.ts 只有合約那一邊的交易日誌 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04 | 列表上方的摘要 | 依序五個數字並標明最近 30 天 | contract-trade-list-domain.ts / ContractTradeListPanel.vue | application spec 摘要依序呈現…；ListPanel spec 摘要標明最近 30 天 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05 | 每一筆呈現的內容 | #27 列呈現各項，淨損益上漲色、做多做多色 | contract-trade-record-summary-domain.ts | application spec 每一列呈現交易的每一項 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06 | 自行判斷的來源 | 來源欄「自行判斷」 | contract-trade-linked-strategy-domain.ts | application spec 沒有關聯策略寫自行判斷 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-07 | 持倉中的浮動損益 | +38.20 標「浮動」、出場均價「—」 | contract-trade-record-summary-domain.ts | application spec 持倉中的損益是浮動的 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-08 | 待檢討一眼看得到 | 看得到「待檢討 N」，點了只列出那些 | list domain + use-contract-trade-journal.showPendingReview | application spec 待檢討數；ListPanel spec 待檢討；composable spec 改篩選就重讀 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-09 | 依狀態、來源與合約標的篩選 | 只列出 BTCUSDT 持倉中 | contract-trade-list-domain.ts | application spec 依狀態、來源與合約標的篩選 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-10 | 一筆都沒有 | 「還沒有任何交易」＋兩種記法，摘要不顯示 0 | list domain / ListPanel | application spec 一筆都沒有；ListPanel spec | asserts-oracle | produces-oracle | ✅ conforms |
| AC-11 | 讀取中 | 讀取中，不先閃空狀態 | ContractTradeListPanel.vue | ListPanel spec 讀取中不先閃空狀態 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12 | 連不上交易服務 | 整塊說明連不上＋重試，不呈現空狀態 | ListPanel / use-contract-trade-journal | ListPanel spec 連不上；composable spec 連不上 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-13 | 窄螢幕上的列表 | 表格自己捲、編號與標的釘左 | ContractTradeListPanel.vue（time-series-table、overflow-x） | —（樣式不測） | no-test | produces-oracle | 🟡 partial |
| AC-14 | 多筆進場即時算出均價 | 持倉 0.051、均價 97,927.6 | contract-trade-draft-domain.ts | application spec 多筆進場；draft composable spec | asserts-oracle | produces-oracle | ✅ conforms |
| AC-15 | 填了止損即時顯示距離與計畫風險 | 「往下 1.58%」、計畫風險 78.93 | draft domain / ContractTradeForm hint | application spec 填了止損… | asserts-oracle | produces-oracle | ✅ conforms |
| AC-16 | 手續費依費率自動帶出 | 手續費欄帶出 1.47 且改得動 | draft domain fees / FillEditor placeholder | application spec 手續費依吃單費率自動帶出；FillEditor spec placeholder | asserts-oracle | produces-oracle | ✅ conforms |
| AC-17 | 尚未設定費率 | 手續費 0、提示「尚未設定手續費率」＋前往設定 | draft domain / FillEditor / Form fee-rate-missing | application spec 尚未設定費率；Form spec 前往設定 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-18 | 關聯交易策略只列出自己的合約交易策略 | 選單只有合約策略與「不關聯（自行判斷）」 | ContractTradeForm.vue / listTradingStrategiesFollowableBy('contractKCandle') | Form spec 選單只列合約策略（驗證修正後補上） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-19 | 出場讓持倉歸零 | 告訴「這筆已平倉」並提供「去寫檢討」 | pages/contract-trade-journal/[id].vue closedJustNow | —（頁面只做接線，不測） | no-test | produces-oracle | 🟡 partial |
| AC-20 | 出場超過持倉 | 出場數量旁寫原話，內容保留 | proxy 欄位對映 / FillEditor fill-error | FillEditor spec 出場超過持倉；proxy spec 出場超過持倉 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-21 | 同一標的同一方向已有持倉中 | 表單上方原話＋「前往 #27 加成交」 | ContractTradeForm form-rejection | Form spec 同標的同方向… | asserts-oracle | produces-oracle | ✅ conforms |
| AC-22 | 止損放錯邊 | 計畫止損旁原話 | ContractTradeForm fieldError | Form spec 止損放錯邊；draft composable spec | asserts-oracle | produces-oracle | ✅ conforms |
| AC-23 | 窄螢幕上的成交輸入 | 一筆一張卡，不需左右捲 | ContractTradeFillEditor.vue（grid 卡片） | —（樣式不測） | no-test | produces-oracle | 🟡 partial |
| AC-24 | 未儲存就離開要先確認 | 頁面內確認「還沒儲存…」，留下時原封不動 | use-leave-confirmation.ts / new.vue | use-leave-confirmation spec | asserts-oracle | produces-oracle | ✅ conforms |
| AC-25 | 儲存中 | 儲存鍵儲存中且按不動，不記成兩筆 | ContractTradeForm trade-save / draft.save guard | draft composable spec 儲存中再按一次不會送兩次 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-26 | 預填那一輪的建議 | 上方來源說明、預填欄位可辨、進場價與數量標「請改成實際成交」 | PrefillBanner / FillEditor / draft domain prefilledFields | Form spec 預填那一輪… | asserts-oracle | produces-oracle | ✅ conforms |
| AC-27 | 改實際成交後儲存 | 進入詳情，看得到滑點 0.06% 與當時建議 | new.vue 導頁 / outcome domain | application spec 來自連結…（詳情）；導頁屬頁面接線未測 | shallow | produces-oracle | 🟠 mis-asserted |
| AC-28 | 改過內容但沒儲存就離開 | 先確認；離開後沒有新增 | use-leave-confirmation / draft | use-leave-confirmation spec；Form spec 沒按儲存不送 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-29 | 已有持倉中時改為加成交 | 打開 #27 加一筆進場，預填 97,850／0.051＋說明 | ContractTradeForm redirect / prefill domain notice | Form spec 已有持倉中；draft composable spec 對既有交易；application spec 已有持倉中 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-30 | 那一輪已不在紀錄中 | 空白新增頁＋「這一輪的建議已不在紀錄中，請手動填寫」 | use-contract-trade-draft JOURNAL_LINK_NOT_FOUND_MESSAGE（驗證中修正） | draft composable spec 那一輪不在紀錄中 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-31 | 舊的一輪沒有參考價 | 其餘預填，進場價與數量留白並說明 | prefill domain / draft | draft composable spec 舊的一輪；Banner spec | asserts-oracle | produces-oracle | ✅ conforms |
| AC-32 | 別人的機器人 | 「找不到這一輪」、無預填、提供前往交易日誌 | draft + PrefillBanner prefill-go-journal（驗證中修正） | Banner spec 找不到那一輪…前往交易日誌；draft composable spec | asserts-oracle | produces-oracle | ✅ conforms |
| AC-33 | 還沒登入 | 先登入，登入後回到同一條連結 | signed-in.global.ts（既有，記下 fullPath） | signed-in.global.spec 記下含請求的完整目的地 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-34 | 讀取預填內容中 | 顯示讀取中，不能儲存 | ContractTradeForm prefill-loading | Form spec 讀取預填中不能儲存 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-35 | 已平倉的詳情 | 結果逐項＋圖、計畫、附註、檢討區 | outcome domain / [id].vue | application spec 已平倉的詳情逐項呈現結果；OutcomePanel spec | asserts-oracle | produces-oracle | ✅ conforms |
| AC-36 | 來自連結的交易多呈現滑點與建議 | 滑點 0.06%＋參考價、建議止損止盈 | outcome domain / OutcomePanel trade-source | application spec 來自連結…；OutcomePanel spec | asserts-oracle | produces-oracle | ✅ conforms |
| AC-37 | 沒設止損 | R、最大不利、最大有利處寫「未設止損，算不出」 | measure domain | application spec 沒設止損時… | asserts-oracle | produces-oracle | ✅ conforms |
| AC-38 | 沒有結算資料 | 資金費用寫原因、淨損益標「未含資金費用」 | outcome domain | application spec 沒有結算資料 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-39 | 沒有行情資料 | 三處寫原因，圖的位置同一句 | outcome domain / OutcomePanel | application spec 沒有行情資料；OutcomePanel spec | asserts-oracle | produces-oracle | ✅ conforms |
| AC-40 | 價格路徑圖 | 標出進出場、止損止盈、最大不利／有利，跟著外觀配色 | price path domain / ContractTradePricePathChart.vue | application spec 取第一筆進場前後的行情；PricePathChart spec | asserts-oracle | produces-oracle | ✅ conforms |
| AC-41 | 持倉中的浮動損益與預估強平價 | 兩者呈現並標「估算」 | outcome domain | application spec 持倉中呈現估算的… | asserts-oracle | produces-oracle | ✅ conforms |
| AC-42 | 估不出強平價 | 「還沒有交易規格，估不出」 | measure domain | application spec 持倉中沒有交易規格 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-43 | 沒有最新價 | 「沒有最新價，無法估算」 | measure domain | application spec 持倉中沒有最新價 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-44 | 平倉後計畫鎖定 | 計畫標已鎖定、無修改入口、成交無修改入口；附註早到晚 | record domain / PlanPanel | PlanPanel spec 平倉後 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-45 | 持倉中可以修改計畫與成交 | 兩者都有修改入口 | PlanPanel | PlanPanel spec 持倉中 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-46 | 持倉中不能寫檢討 | 「平倉後才能檢討」，沒有欄位 | ReviewPanel | ReviewPanel spec 持倉中 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-47 | 關聯的策略已刪除 | 來源寫「關聯的交易策略已刪除」 | linked strategy domain / [id].vue | application spec 關聯的策略已刪除 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-48 | 刪除要先確認 | 頁面內確認文案，確認後回列表 | [id].vue ConfirmDialog＋deleteTrade | detail composable spec 刪除交易（頁面確認未測） | shallow | produces-oracle | 🟠 mis-asserted |
| AC-49 | 別人的或已刪除的交易 | 「找不到這筆交易」＋回列表 | [id].vue notFound 分支 | detail composable spec 別人的…說找不到（頁面文案未測） | shallow | produces-oracle | 🟠 mis-asserted |
| AC-50 | 寫完檢討變成已檢討 | 狀態變已檢討，待檢討數少一 | ReviewPanel emit / detail.writeReview | ReviewPanel spec；detail composable spec 寫檢討 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-51 | 執行評分只能 1 到 5 | 只能選 1–5 | ReviewPanel EXECUTION_SCORES | ReviewPanel spec 評分只能 1 到 5 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-52 | 在交易上新增一個型態標籤 | 建立並貼上 | detail.createSetupTag / PlanPanel | detail composable spec；PlanPanel spec | asserts-oracle | produces-oracle | ✅ conforms |
| AC-53 | 標籤重名 | 名稱旁原話「已有同名的型態標籤」 | use-trade-journal-settings / panel tag-error | settings composable spec 重名時原話呈現 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-54 | 預設最近 30 天 | 停在 30 天，另可選 7／90／全部 | use-contract-trade-statistics | statistics composable spec 預設最近 30 天 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-55 | 統計頁的內容 | 九項內容都呈現 | statistics domain / StatisticsPanel | application spec 呈現各數字…；StatisticsPanel spec | asserts-oracle | produces-oracle | ✅ conforms |
| AC-56 | 有交易被排除在 R 之外 | 標「3 筆沒設止損，未計入 R」 | statistics domain | application spec；StatisticsPanel spec | asserts-oracle | produces-oracle | ✅ conforms |
| AC-57 | 期間內沒有已平倉交易 | 「這段期間沒有已平倉交易」，不畫空圖、勝率不寫 0% | statistics domain / panel | application spec；StatisticsPanel spec | asserts-oracle | produces-oracle | ✅ conforms |
| AC-58 | 不適用的數字 | 獲利因子「不適用」 | statistics domain | application spec 沒有虧損交易時… | asserts-oracle | produces-oracle | ✅ conforms |
| AC-59 | 沒有來自連結的交易 | 平均進場滑點「沒有來自機器人連結的交易」 | statistics domain | application spec 沒有來自連結的交易 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-60 | 每個標的一列 | 兩列並排四項 | live comparison domain / panel | application spec；LiveComparisonPanel spec | asserts-oracle | produces-oracle | ✅ conforms |
| AC-61 | 重演中 | 實盤數字先呈現，回測欄「重演中」 | ContractTradeLiveComparisonPanel.vue（整塊重演中） | LiveComparisonPanel spec 重演中 | mis-asserted | diverges | 🔴 violation |
| AC-62 | 其中一列重演失敗 | 實盤照常、回測欄「合約行情不夠，無法重演」 | live comparison domain | application spec；panel spec | asserts-oracle | produces-oracle | ✅ conforms |
| AC-63 | 策略已刪除 | 「交易策略已刪除，無法重演」，實盤照常 | live comparison domain | application spec 策略已刪除 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-64 | 沒有已平倉實單 | 「還沒有已平倉的實單可以對照」 | live comparison domain | application spec；panel spec | asserts-oracle | produces-oracle | ✅ conforms |
| AC-65 | 勝率偏離一眼看得出 | 實盤勝率下跌色＋「比回測低 23 個百分點」 | live comparison domain | application spec；panel spec | asserts-oracle | produces-oracle | ✅ conforms |
| AC-66 | 設定手續費率 | 呈現兩個費率，之後自動使用 | settings service / composable | settings application & composable spec | asserts-oracle | produces-oracle | ✅ conforms |
| AC-67 | 還沒設定手續費率 | 「還沒設定」，不是錯誤 | setting domain / panel | settings application spec；panel spec | asserts-oracle | produces-oracle | ✅ conforms |
| AC-68 | 預設失誤標籤 | 五個預設失誤標籤 | tag domain（依交易服務回傳） | settings application spec 依類別分組 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-69 | 改名 | 標籤管理與交易都顯示新名字 | settings composable renameTag（重讀） | settings composable spec 改名後重讀清單 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-70 | 刪除使用中的標籤 | 原話「還有 4 筆交易貼著它…」 | tag proxy / settings composable | tag proxy spec；settings composable spec | asserts-oracle | produces-oracle | ✅ conforms |
| BR-1 | 畫面不自己算，唯一例外是即時預覽 | 只有 draft 預覽自算，其餘照交易服務 | draft domain 為唯一計算處 | application spec 各段 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-2 | 拒絕原話呈現在欄位旁或表單上方；內容保留 | 原話、位置正確、內容保留 | proxy 欄位對映 / Form / FillEditor | Form spec、proxy spec | asserts-oracle | produces-oracle | ✅ conforms |
| BR-3 | 預填欄位看得出；進場價與數量標「請改成實際成交」 | 同 AC-26 | draft domain prefilledFields | Form spec、FillEditor spec | asserts-oracle | produces-oracle | ✅ conforms |
| BR-4 | 狀態與方向各有樣式；損益漲跌色 | 各有 tone | status / direction / number domains | application spec、number domain spec | asserts-oracle | produces-oracle | ✅ conforms |
| BR-5 | 估算／不適用／算不出／已刪除都是文字，不以 0、—、空白代替 | 原因句子 | measure / statistics / comparison domains | application spec 各原因 | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-1 | 即時預覽隨打字更新 | 不等交易服務 | draft computed preview | draft composable spec | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-2 | 寬 390 起可讀可用、深淺兩種外觀 | 版面與配色 | 各元件 SCSS token／respond-to | — | no-test | unclear | ❔ unclear |

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| pages/contract-trade-journal/[id].vue「＋ 加成交」 | 持倉中從詳情頁直接展開加成交表單（連結以外的加成交入口） | undocumented（支撐 US-03 加成交，建議補進 PRD） |
| ContractTradePlanPanel 修正／刪除成交 | 持倉中逐筆修改或刪除成交 | 對應交易服務 PRD 的「持倉中可以修正打錯的成交」，操作台 PRD 只寫「修改入口」 |
| TradeJournalSettingsPanel 標籤刪除 | 刪除沒在用的標籤 | 對應交易服務 PRD，操作台 PRD 只寫刪除使用中被拒 |

## Summary

- Conforms: 69/77 clauses ✅ (89%)
- Violations: AC-61（重演中時實盤數字沒有先呈現：交易服務把實盤與重演放在同一個回應裡，要先呈現實盤需交易服務拆成兩段；ARCH 已列為接受的近似）
- Mis-asserted: AC-27、AC-48、AC-49（行為在頁面接線內，頁面依專案慣例不測；組件／composable 測試只覆蓋到一部分）
- Partial: AC-13、AC-19、AC-23（樣式或頁面接線，無測試）
- Gaps: 無
- Unclear: NFR-2（窄螢幕與深淺外觀需實機確認）
- Orphans: 3
