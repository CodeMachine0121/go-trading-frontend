# Contract Traceability Matrix — 幣安自動下單設定（網頁）

Contract: PRD.md
Design map: ARCH.md
Implementation: `app/`（設定畫面幣安交易金鑰段落、現貨／合約機器人清單與編輯頁的自動下單開關）
Oracle: Acceptance Criteria（20 clauses）＋ Core Business Rules（10）＋ NFR（1）

> Static conformance audit：依 PRD 的預期結果逐條判讀測試斷言與程式路徑，不以整包測試的綠燈為依據。
> 稽核當下發現 2 項（AC-8 違反、AC-2/AC-3 斷言過淺），已於同一輪修正並重新判讀；下表為修正後狀態，修正紀錄見最後一節。

## Clauses

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-1 | 第一次存入，幣安確認只可交易現貨（例 1） | 等待中顯示「向幣安確認中」且鍵按不下去；完成後顯示結尾 4 字、可交易市場「現貨」、設定時刻；沒有 Secret Key | `BinanceTradingKeyPanel.vue`（saving 分支）、`binance-trading-key-domain.ts`、`use-binance-trading-key.ts` saveTradingKey | Panel「等幣安確認期間說正在確認…」、「已設定時顯示結尾、可交易市場與設定時刻，沒有任何輸入格」；composable「送出兩格，成功後顯示新的那一組並清空兩格」；domain 市場標籤表 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-2 | Secret Key 留空就按存入（例 2） | Secret Key 那一格指出「必須給 Secret Key」；沒有送出 | `binance-trading-key-write-domain.ts` rejection、composable 欄位分流、Panel `:error-message="secretKeyError"` | application「空白的那一格…什麼都沒送出」；composable「$field 那一格的問題掛在那一格上」；Panel「$message 掛在那一格底下」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-3 | API Key 留空就按存入 | API Key 那一格指出「必須給 API Key」 | 同上 | 同上（apiKey 列） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-4 | 幣安說兩種交易權限都沒開（例 4） | 照原話顯示「沒有任何交易權限」那一句 | `binance-trading-key-proxy.ts` saveTradingKey catch → `BinanceTradingKeyVerificationError`；composable messageFor | proxy「幣安確認沒過（noTradingPermission）」；composable「交易服務的原因照原話顯示」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-5 | 連不上幣安或等太久 | 照原話顯示，分得出連不上幣安／等太久 | 同上（502 unreachable、504 timedOut） | proxy 同表；composable 同表 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-6 | 系統目前存不了 | 照原話顯示並說明不是使用者填錯 | proxy 503 → `SecretSealUnavailableError`；composable 補句 | proxy「系統目前存不了不是使用者填錯」；composable「系統目前存不了時照原話說…」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-7 | 讀不到目前設定時不假裝未設定 | 那一段說讀不到，不顯示「尚未設定」 | composable loadTradingKey catch；Panel `v-else-if="loadErrorMessage"` 與未設定段落的 `!loadErrorMessage` | composable「讀不到時不把它畫成…」；Panel「讀不到設定時不顯示『還沒有設定』」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-8 | 換一組被幣安拒絕，畫面仍是原本那一組（例 3） | 原話顯示「金鑰不被接受」；仍顯示結尾 a1b2，不顯示未設定 | composable save 失敗不動 `setting`；Panel 已設定紀錄在換一組時仍顯示（`v-else-if="configured"`） | composable「幣安不接受時照原話說，畫面仍是原本那一組」；Panel「換一組存不成時，畫面仍顯示原本那一組」 | asserts-oracle | produces-oracle | ✅ conforms（修正後） |
| AC-9 | 換一組時兩格都是空的（例 5） | 兩格皆空、無預填 | composable startEditing → clearForm | composable「兩格都是空的，沒有預填任何舊值」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-10 | 換一組時取消 | 回到已存那一組，填一半的字丟掉 | composable cancelEditing | composable「取消時丟掉填了一半的字…」；Panel「換一組時可以取消」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-11 | 移除並確認，所有自動下單一併關掉（例 6） | 先確認且說明機器人會一併被關掉；確認後回到未設定；之後機器人畫面顯示關閉 | Panel ConfirmDialog；composable removeTradingKey 後重讀；清單與編輯頁 onMounted 重讀 | Panel「先確認，並說明…」；composable「移除後重讀，回到尚未設定」；List「每次打開清單都向交易服務重讀…」；Workbench「%s 機器人的頁面照交易服務的狀態畫開關」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12 | 移除時取消確認 | 什麼都沒變 | Panel cancel | Panel「取消確認就什麼都不變」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-13 | 換存只開現貨的新金鑰（例 11） | 之後甲顯示關閉、乙顯示開著 | 交易服務關掉甲；畫面每次掛載重讀，`autoOrderEnabled` 照交易服務回傳 | proxy「交易服務說 $autoOrderEnabled 時讀作 $expected」；List 標記測試；Workbench 狀態測試 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-14 | 執行中的現貨機器人打開自動下單（例 9） | 開關開著，旁邊標示尚未生效 | `StrategyBotAutoOrderSwitch.vue`（不看執行狀態）；service enableAutoOrder | List「執行中的機器人也打得開…」；Workbench「執行中的機器人打得開…」；molecule 尚未生效 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-15 | 沒有金鑰時打開被拒（例 7） | 原話＋前往設定畫面的路；開關停在關閉 | proxy 409 reason → `AutoOrderRefusedError`；`auto-order-refusal-domain.ts`；molecule 連結 | List「沒有金鑰而被拒時開關停在關閉…」；application 拒絕表；molecule「缺金鑰的拒絕…」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-16 | 金鑰沒有合約交易權限時打開合約機器人被拒（例 8） | 原話「沒有合約交易權限」；開關停在關閉 | 同上（tradableMarketNotCovered，不附連結） | Workbench「合約機器人因金鑰沒有合約權限被拒…」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-17 | 確認期間金鑰剛好被換掉 | 原話；開關照最新狀態；可再按 | 同上（binanceTradingKeyChanged）；開關為受控元件，請求結束即可再按 | application 拒絕表（binanceTradingKeyChanged）；composable「再按一次時上一次的拒絕先收掉」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-18 | 關掉永遠可以（例 10） | 直接關、沒有確認或前提；開關關閉 | composable switchAutoOrder(false) → disableAutoOrder | List「關掉沒有任何確認，直接關」、「手機上在那一台底下也切得動」；Workbench「關掉直接關…」；composable「直接關掉…」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-19 | 清單看得出哪幾台開著 | 只有開著的那台標出「自動下單」 | `StrategyBotListPanel.vue:200` | List「清單上只有開著的那幾台標出『自動下單』」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-20 | 新建機器人的畫面沒有開關 | 沒有開關 | `StrategyBotWorkbenchPage.vue` `v-if="strategyBotId !== null …"` | Workbench「新建機器人的畫面沒有開關」 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-1 | Secret Key 永遠讀不回來；結尾照抄，空白時只說已設定 | 無 Secret 位置；「結尾 xxxx」／「已設定」 | entity 無 secret 欄位；domain summary | domain 結尾表；Panel 已設定測試 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-2 | 可交易市場依現貨、合約排序 | 現貨／合約／現貨、合約 | domain | domain 市場標籤表（含反序與未知值） | asserts-oracle | produces-oracle | ✅ conforms |
| BR-3 | 說明可交易市場只記存入當下 | 段落旁有此說明 | Panel description | Panel「說明可交易市場只記存入當下的狀態」 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-4 | 兩格去前後空白後空白就先擋；其他規則照原話掛在對應格或段落 | 先擋＋指名；原話依格或段落 | write domain；proxy 400 欄位辨識 | application trim/空白表；proxy 欄位規則表；composable 段落分流 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-5 | 存入期間鍵與兩格不可動、顯示確認中 | 同左 | Panel saving | Panel「等幣安確認期間…」；composable 不重送 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-6 | 成功兩格清空；失敗已存那一組維持原樣 | 同左 | composable | composable 成功清空、失敗維持、移除失敗維持 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-7 | 開關只反映交易服務的狀態，不先翻面；不因執行狀態停用 | 同左 | molecule 受控 `:model-value` | molecule「從 $enabled 按下去…但自己不先翻面」、「送出期間按不動」 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-8 | 每個開關旁一律寫尚未生效那一句 | 一字不差 | molecule | molecule 開關表（toBe 全句） | asserts-oracle | produces-oracle | ✅ conforms |
| BR-9 | 金鑰變動後機器人畫面每次打開重讀 | 掛載即向交易服務讀 | `useStrategyBots.load`、`useStrategyBotWorkbench.load`（onMounted） | List 重讀測試；Workbench 狀態測試 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-10 | 拒絕原因一律照原話 | 不改寫 | composables | composable 原話表；molecule 原話 | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-1 | Secret Key 不在任何地方回顯 | 畫面無任何位置顯示整串 Secret | entity/DTO 無 secret 欄位；輸入為 password | Panel「Secret Key 以遮蔽方式輸入」、已設定無輸入格 | asserts-oracle | produces-oracle | ✅ conforms |

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| `use-strategy-bot-auto-order.ts` failureMessageFor | 非拒絕的失敗（找不到機器人、連不上交易服務）照原話掛在那一台的開關下 | undocumented edge case（PRD §4 Edge Cases 的延伸），保留 |
| `pages/settings/index.vue` 段落導覽「幣安交易金鑰」 | 左側導覽多一格 | PRD §5 已述，非孤兒 |

## Summary

- Conforms: 31/31 clauses ✅ (100%)
- Violations: none（AC-8 稽核時為 🔴，已修正）
- Mis-asserted: none（AC-2、AC-3 稽核時 Panel 測試為 shallow，已修正）
- Partial: none
- Gaps: none
- Unclear: none
- Orphans: 1（記錄，不需處理）

## 稽核中修正

| ID | 稽核時 | 問題 | 修正 |
|----|--------|------|------|
| AC-8 | 🔴 violation | 按「換一組」後已存那一組的紀錄被收起；換存失敗時畫面上看不到結尾 a1b2 | 已設定紀錄在換一組時也顯示（「換一組」「移除」兩列在編輯中收起），表單在其下；新增 Panel 測試 |
| AC-2/AC-3 | 🟠 shallow | Panel 測試只檢查有一句欄位錯誤，錯誤綁到另一格也會過 | 改成逐格檢查錯誤掛在哪一格的輸入框旁 |
