# Contract Traceability Matrix — 帳號設定畫面

Contract: `.sdd/2026-09-10-account-settings/PRD.md`
Design map: `.sdd/2026-09-10-account-settings/ARCH.md`
Implementation: `app/{domain,application,infrastructure,composables,components,pages}`
Oracle: Acceptance Criteria（34 個情境）＋ 核心業務規則（11 條）＋ 非功能需求（3 條）

> 這是一次**靜態一致性稽核**：逐條把測試的斷言與程式的執行路徑各自對照規格導出的預期結果，
> 不是「跑一次測試看綠燈」。判定不採信 pass/fail。

## Clauses

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-1 | 從側欄進得去 | 畫面換到設定畫面，看到自己的電子郵件 | `ConsoleLayout.vue:22`（DESTINATIONS）· `pages/settings/index.vue` | `ConsoleLayout.spec.ts:44`（側欄有「設定」）· `AccountProfilePanel.spec.ts:6`（顯示電子郵件） | shallow（兩半各自測到，**沒有一則測試組起來走完這一段**） | produces-oracle | 🟠 mis-asserted |
| AC-2 | 沒登入的人被帶到登入畫面，登入後回到這裡 | 被帶到登入畫面；登入成功後回到**設定畫面**，不是首頁 | `middleware/signed-in.global.ts`（既有，全域、與路由無關） | `tests/middleware/signed-in.global.spec.ts`（既有，測的是任意受保護路徑） | asserts-oracle（規則與路由無關，設定畫面自動適用） | produces-oracle | ✅ conforms |
| AC-3 | 顯示電子郵件 | 看到 `james@example.com` | `AccountProfilePanel.vue` | `AccountProfilePanel.spec.ts:6` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-4 | 密碼那一格是一排點，並直說原因 | 一排遮住的點＋「密碼不會顯示，只能更換」 | `AccountProfilePanel.vue`（`MASKED_PASSWORD`，無資料來源） | `AccountProfilePanel.spec.ts:12/21` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-5 | 兩次新密碼一致就送得出去 | 這次更換被送出 | `password-change-domain.ts` | `PasswordChangePanel.spec.ts:21` · `password-change-domain.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-6 | 兩次新密碼不一致由畫面自己擋 | **沒有送出**；那一格底下說兩次輸入不一致 | `password-change-domain.ts:106` · `password-change-service.ts:29` | `password-change-application.spec.ts`（斷言 proxy 未被呼叫）· `use-password-change.spec.ts:84` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-7 | 目前的密碼不正確，說明掛在那一格 | 「目前的密碼」底下顯示；其他兩格沒有說明 | `use-password-change.ts:88` | `use-password-change.spec.ts:97`（並斷言不導頁） · `PasswordChangePanel.spec.ts:53` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-8 | 新密碼太短，說明掛在那一格 | 「新的密碼」底下顯示「至少要 8 個字元」 | `password-change-domain.ts:83` | `password-change-domain.spec.ts` · `PasswordChangePanel.spec.ts:53` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-9 | 新密碼與目前相同，說明掛在那一格 | 「新的密碼」底下顯示「不得與目前的密碼相同」 | `password-change-domain.ts:95` | `password-change-domain.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-10 | 送出中按不了第二次 | 按鈕按不下去；只被送出一次 | `use-password-change.ts:41` · `PasswordChangePanel.vue:44` | `use-password-change.spec.ts:65` · `PasswordChangePanel.spec.ts:35` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-11 | 換成功先說一聲再帶走 | 顯示「密碼已更換，請用新密碼重新登入」，然後回到登入畫面 | `use-user-session.ts:233`（`signOutAfterPasswordChange`）· `pages/login.vue` · `SignInPanel.vue` | `use-password-change.spec.ts:46`（notice＋導頁）· `use-user-session.spec.ts`（取走一次）· `SignInPanel.spec.ts`（畫得出來且不是紅字） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12 | 還沒設定過就明說，而且不是錯誤 | Telegram 區塊顯示「還沒有設定」，不是紅字 | `TelegramDeliveryPanel.vue` | `TelegramDeliveryPanel.spec.ts:31` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-13 | 第一次設定完，金鑰那一格清空 | 顯示已設定與結尾；金鑰那一格是空的 | `use-telegram-delivery.ts:88` | `use-telegram-delivery.spec.ts:59` · `TelegramDeliveryPanel.spec.ts:46/55` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-14 | 已經連上時那兩格是收起來的 | 看到「已連線 · 金鑰結尾 1234 · 送往聊天室 987654」；畫面上沒有那兩格 | `TelegramDeliveryPanel.vue`（連線列）· `use-telegram-delivery.ts`（`formVisible`） | `TelegramDeliveryPanel.spec.ts`（「已連上時讀起來像一列紀錄」「已連上時那兩格是收起來的」）· `use-telegram-delivery.spec.ts`（「已經連上就收起來」） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-14a | 按「更換金鑰」才把那兩格叫出來 | 金鑰那一格空的、聊天室代號填著存著的那一個 | `use-telegram-delivery.ts`（`startEditing`／`loadDeliverySetting` 預填代號） | `use-telegram-delivery.spec.ts`（「讀回來時聊天室代號就填好了，金鑰不填」）· `TelegramDeliveryPanel.spec.ts`（「按『更換金鑰』才把那兩格叫出來」） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-14b | 換到一半可以取消 | 那兩格收回去；打到一半的金鑰沒有被留下來 | `use-telegram-delivery.ts`（`cancelEditing`） | `use-telegram-delivery.spec.ts`（「取消就把填到一半的金鑰收掉」）· `TelegramDeliveryPanel.spec.ts`（「換到一半可以取消」） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-14c | 還沒設定過時那兩格直接攤開，而且沒有取消 | 那兩格在；沒有「取消」 | `use-telegram-delivery.ts`（`formVisible`） | `use-telegram-delivery.spec.ts`（「還沒設定過就直接攤開」）· `TelegramDeliveryPanel.spec.ts`（「還沒設定過時那兩格直接攤開」） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-15 | 後端存不了金鑰時如實轉達，並說明不是使用者填錯 | 顯示那句話＋「這不是你填錯了什麼」 | `use-telegram-delivery.ts:170` | `use-telegram-delivery.spec.ts:71` · `TelegramDeliveryPanel.spec.ts:229` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-16 | 輸入框預先填好一句可以直接送的話 | 已經有一句話，而且改得掉 | `use-telegram-delivery.ts:9`（`DEFAULT_TEST_MESSAGE`） | `use-telegram-delivery.spec.ts:94` · `TelegramDeliveryPanel.spec.ts:119/189` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-17 | 送得出去 | 顯示送出成功 | `use-telegram-delivery.ts:141` | `use-telegram-delivery.spec.ts:106` · `TelegramDeliveryPanel.spec.ts:165` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-18 | 還沒設定過就按不下去 | 那顆鍵按不下去，旁邊寫要先完成設定 | `use-telegram-delivery.ts:57`（`canSendTestMessage`） | `use-telegram-delivery.spec.ts:98` · `TelegramDeliveryPanel.spec.ts:127` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-19 | 送出中一次只送一則 | 按鈕按不下去；只被送出一次 | `use-telegram-delivery.ts:57` | `use-telegram-delivery.spec.ts:168` · `TelegramDeliveryPanel.spec.ts:142` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-20 | 金鑰不被接受 | 顯示「金鑰不被接受，請重新填一次整串金鑰」 | `delivery-failure-domain.ts` | `delivery-failure-domain.spec.ts` · `telegram-delivery-application.spec.ts` · `TelegramDeliveryPanel.spec.ts:173` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-21 | 找不到聊天室 | 顯示「找不到這個聊天室，請確認聊天室代號」 | 同上 | 同上 · `use-telegram-delivery.spec.ts:118` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-22 | 連不上 Telegram | 顯示「連不上 Telegram，請稍後再試」 | 同上 | 同上 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-23 | 等太久 | 顯示「太久沒有回答，這一則當作沒送成」 | 同上 | 同上 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-24 | 四種原因不會講成同一句 | 四次顯示的說明各不相同 | `delivery-failure-domain.ts`（Record 四筆） | `delivery-failure-domain.spec.ts`（斷言四句相異） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-25 | 空白送不出去 | 那顆鍵按不下去，旁邊說訊息不得為空白 | `test-message-domain.ts:40` | `test-message-domain.spec.ts` · `use-telegram-delivery.spec.ts:144` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-26 | 剛好 4096 個字元送得出去 | 那顆鍵按得下去 | `test-message-domain.ts:44` | `test-message-domain.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-27 | 4097 個字元被擋下並顯示目前字數 | 按不下去；顯示上限與目前 4097 個字 | `test-message-domain.ts:44` | `test-message-domain.spec.ts` · `use-telegram-delivery.spec.ts:144` · `TelegramDeliveryPanel.spec.ts:149` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-28 | 確認之後移除／取消什麼都不變 | 回到「還沒有設定」；取消則什麼都不變 | `TelegramDeliveryPanel.vue`（`ConfirmDialog`）· `use-telegram-delivery.ts:93` | `TelegramDeliveryPanel.spec.ts:97/108` · `use-telegram-delivery.spec.ts:82` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-29 | 連不上後端要明講，且不把 Telegram 區塊畫成「還沒有設定」 | 顯示連不上與該怎麼辦；不顯示空狀態 | `use-telegram-delivery.ts:66` · `TelegramDeliveryPanel.vue` | `use-telegram-delivery.spec.ts:46` · `TelegramDeliveryPanel.spec.ts:39` | asserts-oracle | produces-oracle（Telegram 區塊）；**整頁層級**靠側欄既有的連線指示器 | 🟡 partial |
| BR-1 | 這一頁需要登入，被擋下的人登入後回到這一頁 | 見 AC-2 | `middleware/signed-in.global.ts`（既有） | 既有中介層測試 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-2 | 密碼看不到是刻意的，要直說 | 見 AC-4 | `AccountProfilePanel.vue` | `AccountProfilePanel.spec.ts:12` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-3 | 「再打一次」是畫面自己的規則 | 見 AC-6 | `password-change-domain.ts:106` | `password-change-application.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-4 | 後端的拒絕掛回出問題的那一格 | 見 AC-7 | `use-password-change.ts:88` | `use-password-change.spec.ts:97/110` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-5 | 換密碼成功要先說一聲再導走 | 見 AC-11 | `use-user-session.ts:233` | `use-password-change.spec.ts:46` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-6 | 送出中按鈕停用 | 見 AC-10、AC-19 | 兩個 composable 的 `pending`／`sending` | `use-password-change.spec.ts:65` · `use-telegram-delivery.spec.ts:168/190` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-7 | 金鑰那一格永遠是空的 | 見 AC-13、AC-14 | `use-telegram-delivery.ts:88` | `use-telegram-delivery.spec.ts:59` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-8 | 「還沒有設定」是空狀態，連不上後端是錯誤，兩者不能長得一樣 | 見 AC-12、AC-29 | `TelegramDeliveryPanel.vue`（三個互斥區塊） | `TelegramDeliveryPanel.spec.ts:23/31/39` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-9 | 四種原因顯示四句不同的話，靠值分辨不讀訊息文字 | 見 AC-24 | `delivery-failure-domain.ts`（Record 以取值為鍵） | `delivery-failure-domain.spec.ts`（含「認不得的取值」那一則） | asserts-oracle | produces-oracle | ✅ conforms |
| BR-10 | 訊息長度畫面自己先擋 | 見 AC-25…AC-27 | `test-message-domain.ts` | `test-message-domain.spec.ts` · `use-telegram-delivery.spec.ts:144`（斷言 proxy 未被呼叫） | asserts-oracle | produces-oracle | ✅ conforms |
| BR-11 | 移除要先確認 | 見 AC-28 | `TelegramDeliveryPanel.vue` | `TelegramDeliveryPanel.spec.ts:97` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-12 | Edge Case：三個區塊各說各的，一個錯誤不覆蓋另一個 | 三份獨立狀態 | 三個 composable／props 各自持有 | `TelegramDeliveryPanel.spec.ts:39`（讀取錯誤不影響其他區塊的呈現） | shallow（沒有一則測試同時讓兩個區塊出錯） | produces-oracle（狀態結構上就是分開的） | 🟠 mis-asserted |
| NFR-1 | 進入畫面只讀一次目前設定 | 一次 `loadDeliverySetting` | `pages/settings/index.vue`（`onMounted` 一次） | — | no-test | produces-oracle | 🟡 partial |
| NFR-2 | 完整金鑰不留在畫面上，也不寫進瀏覽器儲存 | 存好即清空；任何儲存都沒有它 | `use-telegram-delivery.ts:88`（`ref`，非 `useState`／`localStorage`） | `use-telegram-delivery.spec.ts:59`（清空）；「不寫進瀏覽器儲存」無測試 | shallow | produces-oracle | 🟠 mis-asserted |
| NFR-3 | 密碼三格不記住、不自動填、離開即消失 | 不寫進任何儲存 | `PasswordChangePanel.vue` 的三個 `ref`；`autocomplete` 用 `current-password`／`new-password` | — | no-test | produces-oracle | 🟡 partial |

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| `use-telegram-delivery.ts:201`（`messageFor` 的兜底） | 沒見過的失敗說「發生未預期的錯誤」 | PRD 未列；合理的防禦性文案，非違規 |
| `TelegramDeliveryPanel.vue`「更換設定／儲存設定」兩種鍵名 | 已設定時鍵名不同 | PRD 未列；建議補一條 AC |
| `pages/settings/index.vue` 的 `#timezone`／`#status` 插槽 | 沿用其他畫面的外框 | 慣例，非違規 |

## Summary

- Conforms: 44/48 clauses ✅（92%）
- Violations: 無
- Mis-asserted: `AC-1`、`BR-12`、`NFR-2`
  - `AC-1`：兩半各自有測試（側欄有那一項、卡片顯示電子郵件），但**沒有一則測試把整頁組起來走完**。
  - `BR-12`：三份狀態在結構上就是分開的，但沒有一則測試同時弄壞兩個區塊來證明它。
  - `NFR-2`：「存好即清空」有測試；「不寫進瀏覽器儲存」只靠人工檢視（程式裡確實只有 `ref`）。
- Partial: `AC-29`（整頁層級的「連不上」靠側欄既有指示器，本切片沒有頁面測試）、`NFR-1`、`NFR-3`
- Gaps: 無
- Unclear: 無
- Orphans: 3（皆非違規；兩個建議日後補進 PRD）

**最值得補的一則**：一個 `pages/settings/index.vue` 的頁面測試，一次收掉 `AC-1`、`AC-29` 與 `NFR-1`。
這個專案目前沒有任何頁面層級的測試（每一頁都只測到它的 organism），所以這是既有的取捨而不是本切片的疏漏。

**這次稽核的天花板**：靜態一致性稽核。它閱讀測試的斷言與程式的執行路徑並各自對照規格，
**不自行撰寫或執行新的探針**。動態證明請走 `/tdd`。
