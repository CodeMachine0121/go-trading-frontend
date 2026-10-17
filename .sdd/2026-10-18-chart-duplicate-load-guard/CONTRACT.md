# Contract Traceability Matrix — chart-duplicate-load-guard

Contract: PRD.md
Design map: ARCH.md
Implementation: go-trading-frontend `feature/chart-duplicate-load-guard`
Oracle: Acceptance Criteria (7) + Core Business Rules (3) = 10 clauses

> Static conformance audit: test assertions and code paths are judged against each clause's spec-derived oracle, not by running the suite.

## Clauses

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Jev test | Jev code | Status | Route |
|----|--------|------------------------|------|------|------------|------------|----------|----------|--------|-------|
| AC-1 | 拖了一下還是要同一段：那一段只被要了一次；回來後照常接上，畫面停在看盤的人放手的地方 | 同鍵（標的、起訖、粗細）在路上時回傳同一個 Promise，後端只被呼叫一次；畫面位置沿用既有元件規則 | `app/infrastructure/proxy/in-flight-request-sharing.ts:1-21` | `tests/infrastructure/proxy/in-flight-request-sharing.spec.ts:40-53` | asserts-oracle | produces-oracle | asserts-oracle 0.53 | produces-oracle 0.65 | ✅ conforms | escalate (low confidence) |
| AC-2 | 連拖五下仍只要一次 | 五次同鍵呼叫只發一次後端請求 | `app/infrastructure/proxy/in-flight-request-sharing.ts:1-21` | `tests/infrastructure/proxy/in-flight-request-sharing.spec.ts:54-66` | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.97 | ✅ conforms | accept |
| AC-3 | 換了粗細就照常去要四小時那一段 | 鍵含粗細，不同粗細各自請求 | `app/infrastructure/proxy/in-flight-request-sharing.ts:1-21` | `tests/infrastructure/proxy/in-flight-request-sharing.spec.ts:67-80` | asserts-oracle | produces-oracle | asserts-oracle 0.96 | produces-oracle 0.77 | ✅ conforms | recheck (mid confidence) |
| AC-4 | 兩張圖互不影響：合約圖表另外去要自己那一段，不等行情圖表那一份；兩張圖各自畫出自己的 | 現貨與合約 proxy 各自一個共用表，各打自己的 endpoint | `app/infrastructure/proxy/in-flight-request-sharing.ts:1-21` | `tests/infrastructure/proxy/in-flight-request-sharing.spec.ts:81-98` | asserts-oracle | produces-oracle | asserts-oracle 0.99 | produces-oracle 0.89 | ✅ conforms | accept |
| AC-5 | 回來之後再要同一段照常再去要一次 | finally 刪鍵，回來後同鍵再請求 | `app/infrastructure/proxy/in-flight-request-sharing.ts:1-21` | `tests/infrastructure/proxy/in-flight-request-sharing.spec.ts:99-109` | asserts-oracle | produces-oracle | asserts-oracle 0.72 | produces-oracle 0.73 | ✅ conforms | recheck (mid confidence) |
| AC-6 | 等著的那一處照常說明連不上系統 | 共用 Promise 被拒，兩個等待者都收到連不上的錯誤 | `app/infrastructure/proxy/in-flight-request-sharing.ts:1-21` | `tests/infrastructure/proxy/in-flight-request-sharing.spec.ts:110-122` | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.89 | ✅ conforms | accept |
| AC-7 | 失敗之後再要同一段照常再去要一次 | 失敗也在 finally 刪鍵 | `app/infrastructure/proxy/in-flight-request-sharing.ts:1-21` | `tests/infrastructure/proxy/in-flight-request-sharing.spec.ts:123-136` | asserts-oracle | produces-oracle | asserts-oracle 0.79 | produces-oracle 0.88 | ✅ conforms | recheck (mid confidence) |
| BR-1 | 完全相同：同一張圖、同一交易標的、同一彙總刻度、同一起訖；接法不列入 | 鍵＝symbol|startTime|endTime|interval，每個 proxy 一份 | `app/infrastructure/proxy/in-flight-request-sharing.ts:1-21` | `tests/infrastructure/proxy/in-flight-request-sharing.spec.ts:40-98` | asserts-oracle | produces-oracle | asserts-oracle 0.91 | produces-oracle 0.91 | ✅ conforms | accept |
| BR-2 | 記到何時：那一份回來（成功或失敗）就不再記著 | finally 刪鍵 | `app/infrastructure/proxy/in-flight-request-sharing.ts:1-21` | `tests/infrastructure/proxy/in-flight-request-sharing.spec.ts:99-136` | asserts-oracle | produces-oracle | asserts-oracle 0.71 | produces-oracle 1.00 | ✅ conforms | recheck (mid confidence) |
| BR-3 | 最後一次動作才畫上去：等同一份的幾次動作中，只有最後一次的結果會畫上去 | 元件以 latestRequestNumber 判斷是否套用結果（既有行為未改） | `app/components/organisms/KCandleContractChartPanel.vue:136-215` | `—` | no-test | produces-oracle | no-test 1.00 | produces-oracle 1.00 | 🟡 partial | accept |

## Orphans (code with no clause)

None. The sharing also covers the trade-journal price path, which calls the same series proxies — identical requests get identical answers there too, so no new behavior is visible.

## Summary

- Conforms: 9/10 ✅ (90%)
- Violations: none
- Mis-asserted: none
- Partial: BR-3 — "only the last action is drawn" is the chart panels' existing request-number rule, untouched by this slice; covered by the panels' existing behavior, no new test
- Gaps: none
- Unclear: none
- Orphans: 0
- Jev: ran on 10 clauses
- Needs James: AC-1 (low confidence — the "screen stays where it was released" half of the scenario is existing panel behavior, not re-asserted here)
