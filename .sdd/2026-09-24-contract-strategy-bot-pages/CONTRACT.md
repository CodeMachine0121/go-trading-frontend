# Contract Traceability Matrix — 合約策略機器人畫面

Contract: PRD.md
Design map: ARCH.md
Implementation: `app/` (branch feat/contract-strategy-bot)
Oracle: Acceptance Criteria (19 clauses) + Core Business Rules (5)

## Clauses

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-1 | 現貨畫面只列現貨機器人 | 現貨畫面只向交易服務要現貨機器人，清單上沒有合約機器人 | `app/composables/use-strategy-bots.ts` (listStrategyBots(marketDataKind)), `app/infrastructure/proxy/strategy-bot-proxy.ts` listStrategyBots | `tests/composables/use-strategy-bots.spec.ts` 「只向後端要這一種」、`tests/infrastructure/proxy/strategy-bot-proxy.spec.ts` 「清單只向後端要 … 那一種」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-2 | 合約畫面只列合約機器人，標的後面標出「永續合約」 | 合約畫面只要合約機器人；每列標的寫「{標的} 永續合約」 | `app/domain/models/domains/strategy-bot-domain.ts` symbolLabel、`StrategyBotListPanel.vue` | `StrategyBotListPanel.spec.ts` 「在合約那一頁」、`strategy-bot-application.spec.ts` 分得出現貨與合約 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-3 | 一台合約機器人都沒有 | 說還沒有任何合約機器人，並給拼一台合約機器人的入口 | `market-data-kind-domain.ts` strategyBotPage.emptyNotice/newPath | `StrategyBotListPanel.spec.ts` 「一台都沒有時說還沒有合約機器人」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-4 | 導覽上兩個去處 | 兩個去處都在；窄螢幕合約那一個在「更多」 | `ConsoleLayout.vue` DESTINATIONS | `ConsoleLayout.spec.ts` 側欄名稱、更多那張紙 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-5 | 合約機器人那一列說出槓桿 | 5 倍有建議部位的那一列寫著「5 倍」 | `strategy-bot-domain.ts` leverageLabel | `strategy-bot-application.spec.ts`、`StrategyBotListPanel.spec.ts` 「一列寫著…5 倍」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-6 | 合約畫面只列合約交易策略 | 選單只有合約交易策略 | `trading-strategy-service.ts` listTradingStrategiesFollowableBy、`use-strategy-bot-workbench.ts` | `trading-strategy-application-options.spec.ts`、`use-strategy-bot-workbench.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-7 | 現貨畫面只列 K 線交易策略 | 選單只有 K 線交易策略 | 同上 | 同上（kCandle 案例） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-8 | 沒有合約交易策略 | 沒有選單，改成一句話與「先去拼一份」連結 | `StrategyBotForm.vue` bot-no-trading-strategies | `StrategyBotForm.spec.ts` 「一份都沒有時給的是一句話與一個入口」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-9 | 只列合約追蹤名單上的合約 | 可挑的只有 BTCUSDT | `contract-trading-symbol-options-domain.ts` watchedOnly、`StrategyBotForm.vue` ContractSymbolField watched-only | `StrategyBotForm.spec.ts` 「只列合約追蹤名單上的」、`trading-symbol-application.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-10 | 合約追蹤名單是空的 | 畫面說要先把合約加進合約追蹤名單 | `ContractSymbolField.vue` hint（hasNone） | `trading-symbol-application.spec.ts` 「一個都沒在追蹤就說一個都沒有」、`ContractSymbolField.spec.ts:55` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-11 | 以槓桿存下一台合約機器人 | 交易服務收到 5 倍合約機器人；回到合約清單並看到「機器人建好了」 | `use-strategy-bot-form.ts`、`strategy-bot-proxy.ts` toBody、`StrategyBotWorkbenchPage.vue`、`use-strategy-bot-workbench.ts` announce | `StrategyBotForm.spec.ts`、`strategy-bot-proxy.spec.ts`、`StrategyBotWorkbenchPage.spec.ts` 存好回到合約清單、`use-strategy-bot-workbench.spec.ts` 「存好了就說一聲」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12 | 槓桿留空即一倍 | 送出一倍 | `use-strategy-bot-form.ts` buildPositionPlan | `StrategyBotForm.spec.ts` 槓桿填「」送 1 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-13 | 槓桿小於一在送出前擋下 | 儲存不給按，說「槓桿倍數不得小於 1 倍」 | `position-plan-domain.ts` rejection | `StrategyBotForm.spec.ts`、`position-plan-domain.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-14 | 槓桿超過上限照交易服務說的講 | 表單呈現交易服務那一句，頁面留著 | `use-strategy-bot-workbench.ts` save failureMessage | `use-strategy-bot-workbench.spec.ts` 被拒絕留在這一頁（通用路徑） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-15 | 現貨畫面沒有槓桿 | 沒有槓桿倍數那一格 | `StrategyBotForm.vue` v-if form.takesLeverage | `StrategyBotForm.spec.ts` 「建議部位多一格槓桿倍數；現貨那一頁沒有」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-16 | 合約機器人的建議部位填回表單 | 展開，部位資金 1,000、槓桿 5 | `strategy-bot-proxy.ts` toPositionPlan、`use-strategy-bot-form.ts` reset | `StrategyBotForm.spec.ts`、`strategy-bot-proxy.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-17 | 從錯的畫面打開 | 被送到合約那一頁的編輯頁 | `use-strategy-bot-workbench.ts` redirectPath、`StrategyBotWorkbenchPage.vue` | `use-strategy-bot-workbench.spec.ts`、`StrategyBotWorkbenchPage.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-18 | 存好回到它那一種的清單 | 回到合約策略機器人清單 | `StrategyBotWorkbenchPage.vue` watch saved | `StrategyBotWorkbenchPage.spec.ts` 存好一台合約機器人 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-19 | 現貨機器人的建議部位也填回表單 | 展開，部位資金 50,000、停損 3 | `strategy-bot-proxy.ts` toPositionPlan（camelCase＋舊拼法） | `strategy-bot-proxy.spec.ts` 舊版後端首字大寫、`StrategyBotForm.spec.ts` 填過的那一台 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-1 | 畫面的身分決定種類；改一台沿用它自己的種類 | 新拼的是這一頁那一種；改一台時送出它原本的種類 | `use-strategy-bot-form.ts` buildWriteDto | 新拼：`StrategyBotForm.spec.ts`；改一台：`StrategyBotForm.spec.ts` 「改一台已存的機器人，送出去的是它自己的種類」 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-2 | 清單只請交易服務交出那一種，畫面不另外篩 | 請求帶種類；畫面不篩 | `strategy-bot-proxy.ts` | proxy spec | asserts-oracle | produces-oracle | ✅ conforms |
| BR-3 | 合約表單規則 | 同 AC-6/9/12/13 | — | — | asserts-oracle | produces-oracle | ✅ conforms |
| BR-4 | 現貨表單規則 | 同 AC-7/15 | — | — | asserts-oracle | produces-oracle | ✅ conforms |
| BR-5 | 拒絕照交易服務說的呈現，頁面留著 | 同 AC-14 | — | — | asserts-oracle | produces-oracle | ✅ conforms |

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| `app/components/atoms/AppIcon.vue` `contract-bot` | 合約策略機器人導覽圖示 | undocumented（支撐 AC-4 的「每一格圖示都不一樣」既有規則，無需新增條款） |

## Summary

- Conforms: 24/24 clauses ✅ (100%)（初次稽核 22/24：AC-11 的「機器人建好了」與 BR-1 的「改一台沿用原種類」沒有測試斷言，已補上並各自以變異驗證會轉紅）
- Violations: —
- Mis-asserted: —
- Partial: —
- Gaps: —
- Unclear: —
- Orphans: 1
