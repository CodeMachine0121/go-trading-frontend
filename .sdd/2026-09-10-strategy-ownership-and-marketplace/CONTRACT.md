# 策略歸屬與策略市集（畫面這一端）— Contract Verification

**Contract source:** `.sdd/2026-09-10-strategy-ownership-and-marketplace/PRD.md`
**Design map:** `.sdd/2026-09-10-strategy-ownership-and-marketplace/ARCH.md`
**Glossary:** `.sdd/UL-MAP.md`
**Kind:** static conformance audit —每一條的預期結果先從規格寫出來，再分別去看測試斷言了什麼、
程式碼產出什麼。測試套件的顏色不是任何一條的判斷依據。

---

## Clauses

### US-01 — 每一發都要說我是誰

| ID | Clause | Oracle | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AC-01.1 | 登入之後策略清單載得出來 | 清單顯示出來 | `backend-api-proxy.ts:88`（每一發附上身分） | `backend-health-proxy.spec.ts`（`記著一段登入時，每一發都帶著它`）＋策略面板既有的清單測試 | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-01.2 | 登入之後算得出指標 | 算出指標結果 | 同上（同一份基底） | 同上；指標計算面板既有的計算測試 | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-01.3 | 登入過期時被帶回登入的地方 | 畫面切到登入的地方並顯示「請重新登入」 | `backend-api-proxy.ts:104`＋`use-user-session.ts:signOutBecauseSessionExpired` | `backend-health-proxy.spec.ts`（通知被叫到）＋`use-user-session.spec.ts`（`清掉共用的那一份，並把人帶回登入畫面`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-01.4 | 登入過期時不把它說成算式的問題 | 不顯示任何關於算式的錯誤 | `signed-out-error.ts`（自己一種型別） | `backend-health-proxy.spec.ts`（斷言它**不是**一般拒絕、也不是伺服器錯誤） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-01.5 | 從未登入不先發一次注定被擋的請求 | 直接請他先登入，且沒有向系統要任何資料 | `middleware/signed-in.global.ts`（既有，本切片未改） | `tests/middleware/signed-in.global.spec.ts`（既有） | `asserts-oracle` | `produces-oracle` | ✅ conforms |

### US-02 — 策略清單分成兩段

| ID | Clause | Oracle | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AC-02.1 | 兩段各就各位 | 「我的策略」有甲，「我加入的」有乙 | `available-strategies-dto.ts`；`StrategyLibraryDialog.vue` | `StrategyLibraryDialog.spec.ts`（`自己的與加入的分成兩節，各有小標題`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-02.2 | 挑自己的那一支會載進編輯器 | 算式出現在編輯器裡，並成為使用中的那一支 | `use-strategy-library.ts:loadStrategy` | `IndicatorCalculationPanelStrategy.spec.ts`（既有的載入測試） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-02.3 | 挑加入來的那一支不會載進編輯器 | 編輯器內容完全沒變，並說明它只能拿去算或套到圖上 | `use-strategy-library.ts:selectStrategy` | `IndicatorCalculationPanelStrategy.spec.ts`（`挑加入來的那一支不會載入編輯器`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-02.4 | 加入來的那一列沒有會改動它的動作 | 沒有改名／刪除／發佈，有移除 | `StrategyLibraryDialog.vue`（那一節只畫一顆按鈕） | `StrategyLibraryDialog.spec.ts`（`只有「移除」，一個會改動它的動作都沒有`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-02.5 | 一支都沒有時指路到市集 | 顯示「還沒有任何策略」並指路市集 | `StrategyLibraryDialog.vue`（空狀態那一句） | `StrategyLibraryDialog.spec.ts`（兩半都斷言） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-02.6 | 連不上系統不等於一支都沒有 | 顯示連不上，不顯示「還沒有任何策略」 | `StrategyLibraryDialog.vue`（兩種空狀態互斥） | `StrategyLibraryDialog.spec.ts`（`連不上後端時說連不上，不呈現空清單的說法`，既有） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-02.7 | 加入來的策略照樣套得到圖上 | 圖上畫出它的指標線 | `chart-applicable-strategy-dto.ts`＋`chart-indicator-service.ts` | `KCandleChartPanelIndicators.spec.ts`（`挑得到，也套得上——套用不需要算式，而它正好沒有`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |

### US-03 — 替策略寫一段說明

| ID | Clause | Oracle | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AC-03.1 | 寫下說明並存起來 | 儲存成功，讀回來就是那一段 | `StrategyNameDialog.vue`；`strategy-write-domain.ts`；`strategy-proxy.ts` | `StrategyNameDialog.spec.ts`（`說明與名字一起交出去`）；`strategy-proxy.spec.ts`（送出的 body 含說明） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-03.2 | 不寫說明也存得起來 | 儲存成功，這支沒有說明 | `strategy-write-domain.ts`（去空白）；`strategy-write-dto.ts`（預設空字串） | `StrategyNameDialog.spec.ts`（`說明留空也送得出去`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-03.3 | 說明太長時不弄丟其他內容 | 就地說太長，算式與名稱一個字都沒變 | 長度由系統那一側把關；`use-strategy-library.ts:writeStrategy` 失敗時不動畫面內容（既有規則，且既有測試已涵蓋「任何存檔失敗都不動內容」） | 既有的存檔失敗測試（不分是哪一個欄位太長） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-03.4 | 改掉說明 | 新的說明存下來 | `renameStrategy` 走同一條存檔路徑 | 無 | `no-test` | `produces-oracle` | 🟡 partial |

### US-04 — 逛市集

| ID | Clause | Oracle | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AC-04.1 | 市集上看得到別人分享的策略 | 看到它，帶著說明、旋鈕、指標值種類、分享者與分享時刻 | `MarketplaceStrategyCard.vue`；`published-strategy-dto.ts` | `StrategyMarketplacePanel.spec.ts`（`列出市集上的每一支…`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-04.2 | 市集上看不到算式 | 畫面上沒有任何算式 | `published-strategy-dto.ts`（型別上沒有那一欄） | `StrategyMarketplacePanel.spec.ts`（`卡上沒有算式`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-04.3 | 加入一支 | 加入成功，日常挑策略的地方出現它 | `strategy-marketplace-proxy.ts:adoptStrategy` | `StrategyMarketplacePanel.spec.ts`（`加入一支之後說出來，並重新讀一次`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-04.4 | 已經加入的那一支顯示的是移除 | 那顆按鈕是「移除」 | `marketplace-listing-domain.ts`（判斷）＋卡片 | `StrategyMarketplacePanel.spec.ts`（`收下過的那一支給的是「移除」`）；`marketplace-listing-domain.spec.ts` | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-04.5 | 移除只影響自己 | 自己的清單沒有它，市集上仍然有它 | `strategy-marketplace-proxy.ts:abandonStrategy` | `StrategyMarketplacePanel.spec.ts`（`移除只影響自己——那一支還在市集上`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-04.6 | 空的市集不是錯誤 | 顯示「市集上還沒有任何策略」，不顯示錯誤 | `StrategyMarketplacePanel.vue`（兩種空狀態互斥） | `StrategyMarketplacePanel.spec.ts`（`空的市集不是錯誤`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-04.7 | 市集依分享時刻由新到舊 | 順序是乙、甲 | 順序由系統那一側決定；`marketplace-listing-domain.ts` 原樣沿用 | `marketplace-listing-domain.spec.ts`（`順序照市集給的來，不重新排`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-04.8 | 自己分享的那一支也在市集上 | 看到它，且標明是自己的 | `marketplace-listing-domain.ts`（不過濾自己的） | `StrategyMarketplacePanel.spec.ts`（`自己分享的那一支標明是自己的…`）；`marketplace-listing-domain.spec.ts`（`自己分享的那一支留在清單上`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-04.9 | 自己分享的那一支沒有加入或移除 | 兩顆都沒有 | `MarketplaceStrategyCard.vue`（`row.mine` 時走第三條分支） | 同上那一則（斷言兩顆都不存在） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-04.10 | 連不上系統不等於市集是空的 | 顯示連不上，不顯示「市集上還沒有任何策略」 | `StrategyMarketplacePanel.vue` | `StrategyMarketplacePanel.spec.ts`（`讀不到市集時說連不上，不顯示成空市集`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |

### US-05 — 發佈與收回

| ID | Clause | Oracle | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AC-05.1 | 分享的是使用中的那一支 | 發佈成功，同一顆換成「收回」 | `IndicatorCalculationPanel.vue:shareActiveStrategy`；`use-strategy-library.ts:publishStrategy` | `IndicatorCalculationPanelStrategy.spec.ts`（`分享的是眼前那一支，不必先打開清單`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-05.1a | 分享完不會彈出策略清單 | 策略清單沒有被打開 | `use-strategy-library.ts:changePublication`（收尾不開任何對話框） | `IndicatorCalculationPanelStrategy.spec.ts`（`分享完不會彈出策略清單`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-05.1b | 沒有使用中的那一支時按不下去 | 那一顆是禁用的 | `IndicatorCalculationPanel.vue`（與「重新命名」同一條 `disabled`） | `IndicatorCalculationPanelStrategy.spec.ts`（`沒有使用中的那一支時按不下去`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-05.2 | 已分享時那一顆是收回 | 那顆按鈕是「收回」，且沒有「分享」 | `IndicatorCalculationPanel.vue`（`published` 決定畫哪一顆） | `IndicatorCalculationPanelStrategy.spec.ts`（`分享過的那一支，眼前那顆變成「收回」`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-05.2a | 清單說得出哪幾支在外面 | 那一列標示「已分享」，且沒有那兩顆按鈕 | `StrategyLibraryDialog.vue`（只留標記） | `StrategyLibraryDialog.spec.ts`（`分享過的那一支標出「已分享」`／`清單上沒有分享或收回那兩顆`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-05.3 | 收回之前先問一次 | 出現確認，且寫明加入過它的人都會失去它 | `use-strategy-library.ts:askToWithdraw`；`IndicatorCalculationPanel.vue`（確認框文字） | `IndicatorCalculationPanelStrategy.spec.ts`（`收回要先問，而且說清楚後果`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-05.4 | 確認之後收回 | 收回成功，那顆按鈕換回「分享」 | `use-strategy-library.ts:confirmWithdraw`＋`refreshActiveStrategy`（讓使用中的那一支跟上剛讀回來的） | `IndicatorCalculationPanelStrategy.spec.ts`（`確認之後才真的收回，而且那顆按鈕換回「分享」`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-05.5 | 取消之後什麼都沒發生 | 那一列仍標示已分享，市集上仍然有它 | `closeDialog` | `IndicatorCalculationPanelStrategy.spec.ts`（`取消之後什麼都沒發生`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-05.6 | 加入來的那一支分享不了 | 它不會成為使用中的那一支，「分享」維持禁用 | `use-strategy-library.ts:selectStrategy`（加入來的不載入）＋那一顆的 `disabled` | `IndicatorCalculationPanelStrategy.spec.ts`（`挑加入來的那一支不會載入編輯器`＋`沒有使用中的那一支時按不下去`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-05.7 | 分享過的策略仍然改得動 | 儲存成功、仍標示已分享、編輯器沒被鎖住 | 儲存路徑不看 `published` | `IndicatorCalculationPanelStrategy.spec.ts`（`分享過的策略仍然改得動，而且改完還是分享狀態`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |

### US-06 — 沒存過的算式照舊算得動

| ID | Clause | Oracle | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AC-06.1 | 直接算一段還沒存的算式 | 算出指標結果 | `indicator-calculation-request-domain.ts`（自帶算式那一條）；面板照舊送編輯器內容 | `IndicatorCalculationPanel.spec.ts`（既有的計算測試，全部走這條路） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-06.2 | 按計算不等於存檔 | 策略的數量沒有變 | 計算那條路一個字都不寫策略 | `IndicatorCalculationPanel.spec.ts`（`算一段還沒存的算式，不會多出任何一支策略`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-06.3 | 算的是畫面上這一份 | 算的是編輯器裡改過的內容 | 面板每次從 `scriptBody` 讀 | `IndicatorCalculationPanel.spec.ts`（既有：改字之後計算送出的是改過的） | `asserts-oracle` | `produces-oracle` | ✅ conforms |

---

### US-07 — 在市集裡找一支

| ID | Clause | Oracle | Implementation | Test | Test audit | Code audit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AC-07.1 | 打一個詞就只剩對得上的 | 只顯示「二十根均線」，看不到「布林通道」 | `marketplace-search-domain.ts:matching`；`StrategyMarketplacePanel.vue:visibleRows` | `StrategyMarketplacePanel.spec.ts`（`打一個詞就只剩對得上的`）；`marketplace-search-domain.spec.ts`（`一個詞只留下對得上的`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-07.2 | 沒有打字就是全部 | 兩支都看得到 | 同上（一個詞都不剩時原樣交回) | `StrategyMarketplacePanel.spec.ts`（`沒有打字就是全部`）；`marketplace-search-domain.spec.ts` | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-07.3 | 只打空白等同沒有打 | 兩支都看得到 | 切完之後一個詞都不剩 | `StrategyMarketplacePanel.spec.ts`（`只打空白等同沒有打`）；`marketplace-search-domain.spec.ts` | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-07.4 | 前後的空白不算 | 只看到「二十根均線」 | 切詞時丟掉空字串 | `marketplace-search-domain.spec.ts`（`前後的空白不算`，含全形空白） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-07.5 | 不分大小寫 | 搜「ma20」看到「MA20」 | 兩邊都轉小寫 | `marketplace-search-domain.spec.ts`（`不分大小寫`，兩個方向都測） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-07.6 | 好幾個詞時每一個都要對上 | 搜「均線 二十」看到「二十根均線」 | `terms.every` | `marketplace-search-domain.spec.ts`（`好幾個詞時每一個都要對上`＋`落在不同欄位也算`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-07.7 | 其中一個詞對不上就不算 | 搜「均線 布林」一支都看不到 | 同上 | `marketplace-search-domain.spec.ts`（`其中一個詞對不上就一列都不留`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-07.8 | 說明也在比對範圍內 | 搜「轉折」看到那一支 | 比對字串含 `description` | `StrategyMarketplacePanel.spec.ts`（`說明與分享者也搜得到`）；`marketplace-search-domain.spec.ts` | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-07.9 | 是誰分享的也在比對範圍內 | 搜「小明」看到那一支 | 比對字串含 `publisherEmail` | `StrategyMarketplacePanel.spec.ts`（同上）；`marketplace-search-domain.spec.ts` | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-07.10 | 沒寫說明不影響其他欄位 | 搜「布林」看到那一支 | 空字串串起來不影響其餘欄位 | `marketplace-search-domain.spec.ts`（`沒寫說明不影響其他欄位對得上`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-07.11 | 搜不到時說的是「沒有符合」 | 顯示「沒有符合」，且不顯示「市集上還沒有任何策略」 | `StrategyMarketplacePanel.vue`（兩種空狀態互斥） | `StrategyMarketplacePanel.spec.ts`（`搜不到時說的是「沒有符合」，不是「市集上還沒有任何策略」`——兩半都斷言） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-07.12 | 清掉搜尋，全部回來 | 每一支都看得到 | 那一句話裡的「清掉搜尋」把打的字清空 | `StrategyMarketplacePanel.spec.ts`（`搜不到時給一個清掉搜尋的去處，按下去全部回來`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-07.13 | 市集本來就空的時候說的不是「沒有符合」 | 顯示「市集上還沒有任何策略」 | 空市集連搜尋框都不給，所以那句話走不到 | `StrategyMarketplacePanel.spec.ts`（`空的市集不是錯誤`＋`市集是空的時候連搜尋框都不給`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-07.14 | 搜出來的那一張照樣加得進來 | 加入成功 | 搜尋只換掉畫出來的那一份，按鈕與動作不變 | `StrategyMarketplacePanel.spec.ts`（`搜出來的那一張照樣加得進來`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |
| AC-07.15 | 搜尋不留存 | 重新打開時框是空的，每一支都看得到 | 打的字是這一頁的狀態，不隨清單走 | `StrategyMarketplacePanel.spec.ts`（`搜尋不留存——重新打開就是全部`） | `asserts-oracle` | `produces-oracle` | ✅ conforms |

## Core Business Rules

| ID | Rule | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| BR-1 | 身分是每一發的事，沒有例外清單 | 需要身分的每一條路都帶著它 | `backend-api-proxy.ts:88`（九個 proxy 共用的那一份） | `backend-health-proxy.spec.ts`（在最沒有自己意見的那條路上測，因此測到的是共用那一段） | ✅ conforms |
| BR-2 | 「請重新登入」與其他失敗分開處理 | 前者導頁，後者就地說明 | `signed-out-error.ts`；`use-user-session.ts:signOutBecauseSessionExpired` | 型別分開與導頁兩半都有測 | ✅ conforms |
| BR-3 | 加入來的策略一律唯讀 | 沒有算式可以載，也沒有任何會改動它的動作 | `published-strategy-dto.ts`（沒有 `content`）；`StrategyLibraryDialog.vue` | `StrategyLibraryDialog.spec.ts`；`IndicatorCalculationPanelStrategy.spec.ts` | ✅ conforms |
| BR-4 | 加入與移除只影響自己 | 移除之後它仍在市集上 | `strategy-marketplace-proxy.ts` | `StrategyMarketplacePanel.spec.ts` | ✅ conforms |
| BR-5 | 發佈與收回作用在使用中的那一支，而且只可能是自己的 | 加入來的載不進編輯器，所以永遠不是使用中的那一支 | `IndicatorCalculationPanel.vue`；`use-strategy-library.ts:selectStrategy` | `IndicatorCalculationPanelStrategy.spec.ts` | ✅ conforms |
| BR-6 | 收回要先確認，發佈不用 | 發佈直接做；收回先問 | `use-strategy-library.ts`（兩者刻意不對稱） | `IndicatorCalculationPanelStrategy.spec.ts`（兩則各證一邊） | ✅ conforms |
| BR-7 | 自己分享的留在市集上，但不給加入/移除 | 看得到、標明是自己的、沒有按鈕 | `marketplace-listing-domain.ts`；`MarketplaceStrategyCard.vue` | `marketplace-listing-domain.spec.ts`；`StrategyMarketplacePanel.spec.ts` | ✅ conforms |
| BR-8 | 連不上與「一支都沒有」永遠分開講 | 兩種狀態互斥呈現 | 兩處空狀態（清單、市集） | 兩處各有一則 | ✅ conforms |
| BR-9 | 按計算不等於存檔 | 計算不寫任何策略 | 計算那條路沒有寫入 | `IndicatorCalculationPanel.spec.ts` | ✅ conforms |
| BR-10 | 搜尋比對那一張上看得到的字，不分大小寫、空白不算、每個詞都要對上 | 名稱／說明／分享者都比對；指標值種類不比對 | `marketplace-search-domain.ts`（五個決定都在這一個地方） | `marketplace-search-domain.spec.ts`（含`指標值種類不比對`一則）；四個變異各被打下來（`every`→`some`、拿掉說明、不轉小寫，以及一個**沒被打下來**的多餘 `.trim()`——已移除） | ✅ conforms |
| BR-11 | 搜尋只決定看得到哪幾張 | 不改順序、不改任何策略、不影響按鈕、不留存 | `visibleRows` 是 computed，不回寫 `listingRows` | `marketplace-search-domain.spec.ts`（`順序照交進來的`、`交進來的那一份不被改動`）；`StrategyMarketplacePanel.spec.ts`（`照樣加得進來`、`加入之後搜尋條件還在`、`不留存`） | ✅ conforms |

---

## Non-Functional Requirements

| ID | Requirement | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| NFR-1 | 身分只從記著這一次登入的地方取得，不從畫面輸入來 | 一個地方負責帶上它 | `backend-api-proxy.ts`（唯一讀 session 的地方） | `backend-health-proxy.spec.ts`（沒記著時什麼都不帶） | ✅ conforms |
| NFR-2 | 市集與策略清單一次列完，不分頁 | 沒有分頁參數 | 兩條查詢都沒有參數 | 由既有的清單測試連帶涵蓋 | ✅ conforms |

---

## Orphans

| Behaviour | Where | Judgement |
| :--- | :--- | :--- |
| `ChartApplicableStrategyDto` — 圖表要的那一小塊策略 | `app/domain/models/dto/chart-applicable-strategy-dto.ts` | **不是孤兒。** 它是 AC-02.7（加入來的也套得上圖）的成立條件：圖表從此不需要算式。PRD 沒有描述它，因為那是設計層的決定，記在 ARCH §3。 |
| `refusalMeansSignedOut` — 建立身分的那幾條路自己解讀 401 | `backend-api-proxy.ts` | **不是孤兒。** 它是 BR-2（兩種失敗分開）在登入畫面上不自我矛盾的必要條件：登入被拒代表密碼錯，不是一段登入過期。ARCH 未預見這一點，已由測試釘住（`帳密對不上不算被登出`）。 |
| `MarketplaceListingRowDto` / `MarketplaceListingDomain` | `app/domain/models/{dto,domains}/marketplace-listing-*` | **不是孤兒。** AC-04.4／04.8／04.9 的判斷處。由 `/improve-codebase` 從畫面搬進來。 |

**Out of Scope 檢查：** 逐項比對 PRD §1——沒有實作市集的搜尋、分類、排行、評分、留言、複製別人的策略、分頁、變更通知，也沒有在市集頁上試跑。無違規。

---

## Summary

| Status | Count |
| :--- | ---: |
| ✅ conforms | 60 |
| 🔴 violation | 0 |
| 🟠 mis-asserted | 0 |
| 🟡 partial | 1 |
| ❌ gap | 0 |
| ❔ unclear | 0 |
| ⚠️ orphan | 0 |

**Conformance: 98% (60 / 61)**，**0 個行為是錯的**。

**第一次稽核找到、已經補上的五則 🟠（綠燈但沒有釘住那句話）：**
- **AC-01.3／BR-2** — 證了「被登出時會通知」，沒有證那個通知會把人帶到登入畫面。
  導頁原本寫在組裝根，而組裝根沒有測試。**順帶找到一個實際缺口**：那一段只導頁、
  沒有清掉全站共用的「現在是誰在用」，於是側欄會繼續顯示一個已經不算數的人。
  那件事現在住在那份共用狀態旁邊，並且有測試。
- **AC-02.5** — 空狀態只斷言了前半句，沒有斷言「指路到市集」那一半。
- **AC-02.7** — 證了「圖表不送算式」（那是成立條件），沒有走過「挑一支加入來的、套到圖上」整條路。
- **AC-05.4** — 證了收回被呼叫，沒有斷言那一列不再標示已分享。
- **AC-05.7／AC-06.2／BR-9** — 三則 🟡 一併補上。

**剩下的一則 🟡，刻意不補：** AC-03.4（改掉說明）——它與 AC-03.1 走同一條存檔路徑，
差別只在那一格原本有字；再測一次只是換一個前置條件。

**後續的一次調整（不是稽核結果，是位置改了）：** 分享與收回從策略清單搬到指標計算畫面那一排
動作上，作用對象改為使用中的那一支——想分享的幾乎總是剛調對的那一支。
搬的過程中找到一個實際缺口：重讀清單時「使用中的那一支」沒有跟著更新，
所以剛按過收回，眼前那顆還寫著「收回」。那一步現在寫在重讀那一處，
並且刻意不動 `loadedContent`（動了就等於把還沒存的修改當成已經存了）。
上表的 AC-05.1a／05.1b／05.2a 是隨之新增的條款。

**後來併進這一份契約的一段（US-07 / BR-10 / BR-11：市集搜尋）：** 它沒有另開切片——
搜尋是市集的一部分，另開一份文件只會讓「市集是什麼」分散在兩處。
那 15 則的預期結果先寫進 PRD，程式與測試才跟上；比對規則的五個決定
（切詞、比對哪幾欄、大小寫、空白、要不要全部對上）集中在一個 domain model 裡，
並且用變異一一打過：`every`→`some`、拿掉說明欄、不轉小寫都被測試抓住，
而多餘的那個 `.trim()` 沒有被抓住——因為切詞已經把前後空白處理掉了，所以它被移除。

**Ceiling:** 這是靜態一致性稽核——它讀測試斷言與程式碼路徑並與契約推導出的預期比對，
不執行自己發明的情境。要動態證明某一則，走 `/tdd`。
