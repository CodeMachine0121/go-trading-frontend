# Contract Traceability Matrix — 自動下單限價進場（網頁）

Contract: PRD.md
Design map: ARCH.md
Implementation: `app/` (branch `feature/auto-order-limit-entry`)
Oracle: Acceptance Criteria (21 scenarios) + Business Rules (6) + NFR (2) = 29 clauses

Path abbreviations: `dom/` = `app/domain/models/domains/`, `prx` = `app/infrastructure/proxy/strategy-bot-proxy.ts`,
`form` = `app/composables/use-strategy-bot-form.ts` + `app/components/organisms/StrategyBotForm.vue`,
`T-form` = `tests/components/organisms/StrategyBotForm.spec.ts`, `T-result` = `tests/domain/models/domains/contract-auto-order-result-domain.spec.ts`,
`T-write` = `tests/domain/models/domains/strategy-bot-write-domain.spec.ts`, `T-prx` = `tests/infrastructure/proxy/strategy-bot-proxy.spec.ts`.

## Clauses

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-01-1 | 新拼一台預填 0.1（例 1） | 那一格 0.1；說明含限價、撤單、0 的後果、市價平倉 | form `entrySlippageToleranceText` 預設；locale `entrySlippageToleranceHelp` | T-form「新拼一台合約機器人預填 0.1…」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01-2 | 改一台時顯示現值（例 2） | 那一格 0.3 | form `reset`；prx `toStrategyBot`；dom/strategy-bot-domain | T-form「改一台時顯示它現在的值」；T-prx「讀作 0.3」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01-3 | 0 存得下去（例 3） | 存得下去，送出 0 | dom/strategy-bot-write-domain；prx `toBody` | T-form「填 0」；T-prx「以字串 0 送出」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01-4 | 5 存得下去（例 4） | 存得下去，送出 5 | 同上 | T-form「填 5」；T-prx「5」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01-5 | 超過 5 被擋下（例 5） | 「開倉容許滑價必須介於 0 到 5 之間（單位：%）」、儲存不給按 | dom/strategy-bot-write-domain `rejection` | T-form「填 5.01」；T-write「超過 5」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01-6 | 負數被擋下（例 6） | 同上 | 同上 | T-form「-0.1」；T-write「負數」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01-7 | 清空不當成 0（例 7） | 同上 | form 清空 → NaN | T-form「填「」」；T-write「不是數字」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01-8 | 現貨機器人沒有這一格（例 8） | 沒有這一格；送出不含它 | `StrategyBotPageDto.takesAutoOrderEntrySlippageTolerance`；prx `toBody` | T-form「現貨機器人沒有這一格」；T-prx「整個鍵都不放」；market-data-kind spec | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01-9 | 交易服務拒絕時照原話說（例 9） | 顯示原話、留在這一頁 | `use-strategy-bot-workbench.save`（既有，訊息原樣） | `use-strategy-bot-workbench.spec`「被拒絕時這一頁留著」（同一路徑，不分訊息） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02-1 | 全部成交（例 10） | 主句「成交 · 做多 · 開倉 0.002 @ 84180」；進場行「全部成交 · 參考價 84154 · 限價 84238.1 · 成交 0.002／0.002 · 滑價 +0.031%」 | dom/contract-auto-order-entry-domain；dom/contract-auto-order-result-domain | T-result「全部成交」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02-2 | 還在等成交（例 11） | 狀態「等待成交」；進場行「等待成交 · 參考價 84154 · 限價 84238.1 · 成交 0／0.002」 | 同上（`WAITING_FOR_FILL_STATUS`） | T-result「還在等成交」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02-3 | 部分成交（例 12） | 「部分成交，其餘已撤單」、「成交 0.001／0.002」 | entry domain | T-result「部分成交」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02-4 | 沒有成交（例 13） | 狀態「沒有成交」、提醒語氣；進場行「沒有成交，已撤單 · … · 成交 0／0.002」 | result domain `unfilled`；entry domain | T-result「沒有成交」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02-5 | 成交得比參考價好（例 14） | 「滑價 -0.012%」 | entry domain `signedSlippage` | T-result 滑價 -0.012 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02-6 | 滑價為零（例 15） | 「滑價 0%」 | 同上 | T-result 滑價 0 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02-7 | 舊紀錄沒有進場資訊（例 16） | 沒有進場行 | entry domain 全 null → null；`StrategyBotRunHistory.vue` v-if | T-result「沒有任何進場資訊」；RunHistory spec「沒有進場資訊的那一輪」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02-8 | 認不得的進場單狀態（例 17） | 只寫「參考價 84154」 | entry domain `ENTRY_STATUSES.get` | T-result「認不得的進場單狀態」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02-9 | 註腳說明滑價正負 | 註腳說滑價以參考價為準、正值較差 | dom/market-data-kind-domain `runHistoryNote` | market-data-kind spec「註腳說明滑價的正負」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03-1 | 還有進場單掛著（例 18） | 顯示那一句；機器人仍在清單 | prx `strategyBotFailureOf`；`StrategyBotEntryOrderOutstandingError`；`use-strategy-bots.messageOf` | T-prx「刪除被還掛著的進場單擋下」；use-strategy-bots spec「說出原因與下一步」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03-2 | 進場單已收尾（例 19） | 機器人被刪、清單重讀 | 既有 `confirmDelete` → `runOnBot` → `load` | use-strategy-bots spec「確認之後才真的刪，並重讀清單」（重讀後那一台不在、沒有失敗訊息） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04-1 | 設定頁的金鑰說明 | 說明寫合約機器人打開自動下單時會用它真的下單，不寫「將來」 | locale `settings.binanceTradingKey.description` | `BinanceTradingKeyPanel.spec`「照實說合約機器人打開自動下單後會用它真的下單」 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-1 | 0～5、清空／非數字／超出一律同一句 | 同 AC-01-5～7 | write domain | T-write | asserts-oracle | produces-oracle | ✅ conforms |
| BR-2 | 只有合約機器人送出；現貨不送 | 同 AC-01-8 | page DTO 旗標 | T-form、T-prx | asserts-oracle | produces-oracle | ✅ conforms |
| BR-3 | 舊交易服務沒回 → 0.1 | 讀作 0.1 | prx fallback | T-prx「undefined／null 讀作 0.1」 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-4 | 已成交缺而要求有 → 讀作 0 | 成交 0／0.002 | entry domain | T-result「沒有成交量但有要求數量」 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-5 | 刪除被擋靠原因分辨，不讀訊息 | 原因 `autoOrderEntryOutstanding` → 具名失敗 | prx `ENTRY_ORDER_OUTSTANDING_REASON` | T-prx | asserts-oracle | produces-oracle | ✅ conforms |
| BR-6 | 數字以精確小數處理 | 讀成 Decimal、送字串 | prx `toSuggestedFigure`、`toBody` | T-prx 進場欄位與送出 | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-1 | 每一句新文字雙語 | 兩種語言皆有 | locale、`LocalizedTextVo` | `bun run lint:translations`（1054 句兩語完整）；T-result 英文斷言 | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-2 | 手機寬度不橫向溢出 | 自然折行 | 沿用既有 `bot-form__section`／`__auto-order` 樣式 | — | no-test | unclear | ❔ unclear |

## Orphans

| Behavior | Site | Classification |
| :--- | :--- | :--- |
| 動作詞表改成雙語片語清單（行為不變，讓翻譯檢查通過） | dom/contract-auto-order-result-domain `ACTIONS` | 既有行為的等價改寫；不屬任何條款，無衝突 |

Out-of-scope checklist：現貨自動下單畫面、手動撤單／追價、平倉與止損止盈畫面、外掛——均未實作 ✔

## Summary

✅ 28 conforms · 🔴 0 violations · 🟠 0 mis-asserted · 🟡 0 partial · ❌ 0 gaps · ❔ 1 unclear · ⚠️ 1 orphan
Conformance: 97%（28/29）

The first pass found the successful delete test only checking that a delete was asked for (now it checks the bot is gone after the reload) and no test on the settings wording (now pinned). NFR-2 is a layout property left to visual review: the new block reuses the existing form section and history line styles, which already wrap.

Static conformance audit against the Acceptance Criteria; it judges assertions and code paths against the spec's expected outcomes and does not execute invented scenarios.
