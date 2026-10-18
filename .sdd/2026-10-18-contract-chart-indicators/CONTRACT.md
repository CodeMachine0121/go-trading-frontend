# Contract Traceability Matrix — contract-chart-indicators

Contract: PRD.md
Design map: ARCH.md
Implementation: `app/` on branch `feature/contract-chart-indicators`
Oracle: Acceptance Criteria (17 clauses) + Core Business Rules (6 clauses)

Static conformance audit: test assertions and code paths are judged against the spec's expected outcome; no invented scenario was executed.

## Clauses

`T` = `tests/components/organisms/KCandleContractChartPanelIndicators.spec.ts`, `P` = `app/components/organisms/KCandleContractChartPanel.vue`, `C` = `app/composables/use-chart-indicators.ts`, `X` = `app/infrastructure/proxy/applied-chart-indicator-preference-proxy.ts`, `PX` = its spec.

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Jev test | Jev code | Status | Route |
|----|--------|------------------------|------|------|------------|------------|----------|----------|--------|-------|
| AC-1 | 合約圖表只列吃合約行情的策略腳本 | 清單上只有「高斯濾波（合約）」 | C:199、P:366 | T:166 | asserts-oracle | produces-oracle | asserts-oracle 0.97 | produces-oracle 0.20 | ✅ conforms | escalate (low confidence) |
| AC-2 | 現貨圖表照舊只列吃 K 線的策略腳本 | 清單上只有「高斯濾波（現貨）」 | `KCandleChartPanel.vue:120`、C:199 | `KCandleChartPanelIndicators.spec.ts:250` | asserts-oracle | produces-oracle | asserts-oracle 0.99 | unclear 0.27 | ❔ unclear | escalate (disagree) |
| AC-3 | 從市集加入的合約策略腳本也列出來 | 在清單上，與自己的一樣挑得到、套得上 | `available-strategy-scripts-dto.ts:20`、`published-strategy-script-dto.ts:53` | T:172 | asserts-oracle | produces-oracle | asserts-oracle 0.97 | produces-oracle 0.95 | ✅ conforms | accept |
| AC-4 | 一支吃合約行情的策略腳本都沒有 | 寫「還沒有吃合約行情的策略腳本，到合約策略腳本畫面新增一支。」 | P:494、`ChartIndicatorPanel.vue:94` | T:188 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.51 | ✅ conforms | escalate (low confidence) |
| AC-5 | 只回答是或否的合約策略腳本挑不了 | 列著、不能套用、說明畫不成線 | `ChartIndicatorPanel.vue:108`、`strategy-script-domain.ts:27` | T:195 | asserts-oracle | produces-oracle | asserts-oracle 0.91 | produces-oracle 0.88 | ✅ conforms | accept |
| AC-6 | 交易服務答不出有哪些策略腳本 | 合約 K 線照畫；清單一支都沒有，並說明暫時取不到 | C:204 | T:206 | asserts-oracle | produces-oracle | asserts-oracle 0.99 | produces-oracle 0.73 | ✅ conforms | recheck (mid confidence) |
| AC-7 | 每一根各得一個值的畫成曲線 | 多四條曲線、圖例多一行 | `chart-indicator-service.ts:180`、`chart-indicator-domain.ts` | T:217、T:228 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.55 | ✅ conforms | escalate (low confidence) |
| AC-8 | 只得出單一個值的畫成水平線 | 多一條水平線 | `chart-indicator-domain.ts` | T:239 | asserts-oracle | produces-oracle | asserts-oracle 0.99 | produces-oracle 0.96 | ✅ conforms | accept |
| AC-9 | 換彙總刻度時指標跟著重算 | 以四小時重算 | P:185 | T:252 | asserts-oracle | produces-oracle | asserts-oracle 0.97 | unclear 0.33 | ❔ unclear | escalate (disagree) |
| AC-10 | 一根走完時指標跟著重算 | 自己重算一次、不出現載入中提示 | P:277 | T:267 | asserts-oracle | produces-oracle | asserts-oracle 0.64 | produces-oracle 0.81 | ✅ conforms | recheck (mid confidence) |
| AC-11 | 不在追蹤名單上的合約標的不會自己重算 | 不重算 | P:255（不跟就沒有走完的通知） | T:280 | asserts-oracle | produces-oracle | asserts-oracle 0.97 | produces-oracle 0.68 | ✅ conforms | recheck (mid confidence) |
| AC-12 | 存過的合約 K 線不夠這支策略腳本算（原「從來沒存過合約 K 線的代號」，code review 指出空圖不送計算，改寫） | 那一行說明湊不出最少可算根數，說法與現貨相同 | `indicator-calculation-proxy.ts:172` | — | no-test | produces-oracle | no-test 1.00 | produces-oracle 0.63 | 🟡 partial → ✅ fixed（補 `indicator-calculation-proxy.spec.ts`「從來沒存過合約 K 線的代號…一字不差」） | recheck (mid confidence) |
| AC-13 | 策略腳本本身有錯 | 那一行說明算不出來；另一支照常畫 | C（逐筆失敗） | T:292 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.92 | ✅ conforms | accept |
| AC-14 | 重新打開兩張圖各自回到上次的樣子 | 現貨有「均線」、合約有「高斯濾波（合約）」 | X:39 | PX:185、T:345、`KCandleChartPanelRestore.spec.ts:176` | asserts-oracle | produces-oracle | asserts-oracle 0.97 | produces-oracle 0.87 | ✅ conforms | accept |
| AC-15 | 在合約這一邊移除不影響現貨那一邊 | 現貨下次仍有「均線」 | X:60 | PX:195、T:371 | asserts-oracle | produces-oracle | asserts-oracle 0.97 | produces-oracle 0.91 | ✅ conforms | accept |
| AC-16 | 升級前記住的那幾支仍屬現貨 | 兩支回到現貨；合約一支都沒有 | X:8 | PX:205 | asserts-oracle | produces-oracle | asserts-oracle 0.99 | produces-oracle 0.19 | ✅ conforms | escalate (low confidence) |
| AC-17 | 記著的那一支已被刪掉 | 那一支不回來，其餘照常 | `remembered-applied-indicators-domain.ts` | T:357 | asserts-oracle | produces-oracle | asserts-oracle 0.91 | produces-oracle 0.99 | ✅ conforms | accept |
| BR-1 | 一張圖只挑得到同一種行情的策略腳本 | 合約只列合約、現貨只列 K 線 | C:201 | 同 AC-1、AC-2 | asserts-oracle | produces-oracle | not run | not run | ✅ conforms | — |
| BR-2 | 合約指標一律用合約那一條的行情算 | 計算送到合約指標計算 | `chart-indicator-service.ts:180` | T:228、`chart-indicator-service.spec.ts` | asserts-oracle | produces-oracle | not run | not run | ✅ conforms | — |
| BR-3 | 兩邊擺著哪幾支分開記住；升級前那一份屬現貨 | 同 AC-14～16 | X:8 | 同 AC-14～16 | asserts-oracle | produces-oracle | not run | not run | ✅ conforms | — |
| BR-4 | 參數值與線色記憶兩邊共用 | 依策略腳本識別碼記，兩邊不互相干擾 | 既有 `AppliedIndicatorParametersDomain`、`ChartIndicatorDomain` | — | no-test | produces-oracle | not run | not run | 🟡 partial | — |
| BR-5 | 只回答是或否的策略腳本列著、挑不了 | 同 AC-5 | 同 AC-5 | T:195 | asserts-oracle | produces-oracle | not run | not run | ✅ conforms | — |
| BR-6 | 合約不會有「那一段市場沒開」的拒絕 | 不出現該句 | 交易服務不回此拒絕；畫面不自行產生 | — | no-test | produces-oracle | not run | not run | 🟡 partial | — |

Notes on `recheck` rows: AC-6、AC-10、AC-11 的對應測試各自單獨跑過皆綠；重讀程式路徑與判斷一致。AC-12 的翻譯為現貨、合約共用的同一段（proxy 依請求分送端點、拒絕翻譯不分種類）。

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| P:220 `forgetTheChart` → `clearLines()` | 換圖失敗時收掉圖上的指標線，已套用清單保留 | undocumented（與現貨圖表既有行為對齊；有測試 T:313） |
| P:291 `onBeforeUnmount` → `stopSettling()` | 離開畫面時取消還沒停手的重算 | undocumented（與現貨對齊；有測試 T:327） |

## Summary

- Conforms: 18/23 clauses ✅ (78%)
- Violations: none
- Mis-asserted: none
- Partial: AC-12（已補測試）, BR-4, BR-6（皆為既有、不分行情種類的行為，保留）
- Gaps: none
- Unclear: AC-2, AC-9（Jev 讀不出程式路徑；Claude 判 produces-oracle，對應測試皆綠）
- Orphans: 2（皆為與現貨對齊的收尾行為）
- Jev: ran on 17 AC clauses; BR clauses not run (covered by the AC rows)
- Needs James: AC-1、AC-4、AC-7、AC-16 (low confidence)；AC-2、AC-9 (disagree)

## Code review follow-up (PR #91)

- 取不到策略腳本清單時改說「暫時取不到策略腳本清單，稍後再打開這張圖試一次。」，不再叫使用者去新增（現貨同步受益）。
- 取清單的 catch 改為 `catch (error: unknown)`，只收領域可辨識的錯誤，其餘往上拋。
- 清單回來前離開畫面時不再還原與計算。
- AC-12 改寫成實際走得到的情境：空圖本來就不送計算，由圖說查無 K 線。
