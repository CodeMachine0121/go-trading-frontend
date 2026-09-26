# Contract Traceability Matrix — connector-authorization-consent

Contract: PRD.md
Design map: ARCH.md
Implementation: `app/` on branch `feat/connector-authorization-consent` (`git diff main...HEAD`)
Oracle: Acceptance Criteria + Core Business Rules + NFR (20 clauses)
Cross-repo context (read-only): connector authorization contract — frontend section and backend endpoints 4/5/6

## Clauses

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-1 | 沒登入時先登入，登入後回到同一張授權請求 | 先到登入畫面；登入成功後回到同意頁，仍是授權請求「甲」 | signed-in.global.ts:63 (`to.fullPath`); use-user-session.ts:146 | signed-in.global.spec.ts:175; use-user-session.spec.ts:301 | asserts-oracle — full path with `?request=abc` remembered, `/login` visited, then navigated back to exactly that path | produces-oracle | ✅ conforms |
| AC-2 | 已登入且已放行時直接看到同意頁 | 直接看到授權請求「甲」的同意內容 | signed-in.global.ts (no redirect); connector-authorization.vue:6, :21; use-connector-authorization.ts:27 | signed-in.global.spec.ts:182; connector-authorization-page.spec.ts:41; use-connector-authorization.spec.ts:47 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-3 | 待開通的人看不到同意頁 | 被帶到等待開通那一頁 | signed-in.global.ts:71 | signed-in.global.spec.ts:188 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-4 | 同意頁說清楚外掛、帳號與授權範圍 | 看到「Claude Code」、james@example.com、「允許後，它能以你的身分使用交易服務的全部功能」、允許與拒絕 | ConnectorAuthorizationPanel.vue:93, :95, :100, :118, :127; connector-authorization.vue:29 | ConnectorAuthorizationPanel.spec.ts:20; connector-authorization-page.spec.ts:60 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-5 | 什麼都不按就什麼都不會被決定 | 沒有允許也沒有拒絕；頁面仍顯示兩個選擇 | use-connector-authorization.ts:19-39 (read only) | use-connector-authorization.spec.ts:64, :47 | asserts-oracle — approve/deny/leave never called after load; stage stays awaiting decision | produces-oracle | ✅ conforms |
| AC-6 | 允許之後交回外掛 | 請求被允許、瀏覽器前往外掛位址、顯示「可以關掉這個分頁，回到 Claude Code」 | connector-authorization-service.ts:24; use-connector-authorization.ts:57; ConnectorAuthorizationPanel.vue:86 | use-connector-authorization.spec.ts:124; ConnectorAuthorizationPanel.spec.ts:65 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-7 | 拒絕之後交回外掛 | 請求被拒絕、瀏覽器前往外掛位址（外掛得知被拒）、顯示可以關掉分頁 | connector-authorization-service.ts:29; use-connector-authorization.ts:57 | use-connector-authorization.spec.ts:134; ConnectorAuthorizationPanel.spec.ts:65 | asserts-oracle — the address the trading service returns (carrying the denial) is followed verbatim | produces-oracle | ✅ conforms |
| AC-8 | 決定送出後不能再按第二次 | 兩個選擇按不下去；只送出第一次 | use-connector-authorization.ts:43; ConnectorAuthorizationPanel.vue (`:disabled="deciding"`) | use-connector-authorization.spec.ts:153, :172; ConnectorAuthorizationPanel.spec.ts:42 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-9 | 過期或已被決定過的請求 | 顯示「這一張授權請求已失效或已被使用，請回到 Claude Code 重新連線」；沒有允許與拒絕 | connector-authorization-proxy.ts:50; use-connector-authorization.ts:31; ConnectorAuthorizationPanel.vue:60 | connector-authorization-proxy.spec.ts:65, :89; use-connector-authorization.spec.ts:72; ConnectorAuthorizationPanel.spec.ts:65 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-10 | 網址上沒有授權請求 | 同 AC-9 的失效訊息；沒有允許與拒絕 | connector-authorization.vue:6; connector-authorization-service.ts:13 | connector-authorization-page.spec.ts:49; use-connector-authorization.spec.ts:81 | asserts-oracle — missing or repeated `request` becomes empty, empty is expired without asking the trading service | produces-oracle | ✅ conforms (after fix, see below) |
| AC-11 | 停在頁面上太久才按允許 | 顯示失效訊息；瀏覽器沒有被送回外掛 | use-connector-authorization.ts:61 | use-connector-authorization.spec.ts:191 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12 | 打開頁面時連不上交易服務 | 顯示連不上的說明與「再試一次」；不說已失效 | use-connector-authorization.ts:34-38; ConnectorAuthorizationPanel.vue:68, :75 | use-connector-authorization.spec.ts:90, :110; ConnectorAuthorizationPanel.spec.ts:77 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-13 | 按下允許時連不上交易服務 | 顯示連不上的說明；兩個選擇恢復可按；沒有被送回外掛 | use-connector-authorization.ts:64, finally; ConnectorAuthorizationPanel.vue:108 | use-connector-authorization.spec.ts:202; ConnectorAuthorizationPanel.spec.ts:56 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-1 | 這一頁要先登入且已放行；門記下的目的地含授權請求識別 | 同 AC-1 / AC-3 | signed-in.global.ts:63, :71 | signed-in.global.spec.ts:175, :188 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-2 | 絕不自動允許 | 只有按下「允許」才送出允許 | use-connector-authorization.ts (approve only from `approve()`) | use-connector-authorization.spec.ts:64 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-3 | 允許要以使用者身分送出 | 允許那一次帶著目前登入者的身分 | backend-api-proxy.ts (`identityHeaders`) via connector-authorization-proxy.ts | connector-authorization-proxy.spec.ts:77 (`headers: SIGNED_IN_HEADERS`) | asserts-oracle (after fix, see below) | produces-oracle | ✅ conforms |
| BR-4 | 同一張請求只被決定一次 | 送出期間停用；交回後不再有選擇 | use-connector-authorization.ts:43; ConnectorAuthorizationPanel.vue:86 | use-connector-authorization.spec.ts:153, :172; ConnectorAuthorizationPanel.spec.ts:65 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-5 | 失效只有一句話 | 過期、已決定、不存在、沒帶識別都說同一句 | connector-authorization-proxy.ts:50; connector-authorization-service.ts:13; ConnectorAuthorizationPanel.vue:60 | connector-authorization-proxy.spec.ts:65, :89; use-connector-authorization.spec.ts:72, :81 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-6 | 送回外掛是整頁前往外掛給的位址 | 整頁導覽到交易服務回覆的位址，不是站內換頁 | external-navigation-proxy.ts (`window.location.assign`) | external-navigation-proxy.spec.ts:9; use-connector-authorization.spec.ts:124 | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-1 | 不另立任何設定項目；不在網址或瀏覽器儲存留下授權結果 | 沒有新設定；授權結果不被記下 | dependencies.ts (reuses `backendBaseUrl`); no storage writes in new code | — | no-test (structural: `git diff main...HEAD -- nuxt.config.ts .env.example` is empty; no `localStorage` in new files) | produces-oracle | 🟡 partial |

## Fixes made during this audit

- **AC-10 / AC-2** were only covered below the page: nothing asserted that the page reads `?request=`, turns a missing or repeated value into "no request", loads on open, or hands the signed-in email to the card. Added `tests/pages/connector-authorization-page.spec.ts` (falsified by replacing the string check with `String(query ?? '')`, which the repeated-value case catches).
- **BR-3** had no assertion that the approval carries the signed-in identity. The approval/denial cases in `connector-authorization-proxy.spec.ts` now assert the bearer header.

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| connector-authorization-request-domain.ts:11 | A blank or missing connector name is shown as 「未具名的外掛」 | undocumented in PRD; recorded in UL-MAP (未具名外掛的稱呼) and ARCH — the connector name is optional at registration |
| use-connector-authorization.ts:36-37 | A load failure other than "unreachable" (e.g. the trading service erroring) also offers a retry with a generic message | extends the PRD's edge case「讀取時連不上」; recorded in UL-MAP (外掛授權同意頁階段) |
| use-connector-authorization.ts:64-66 | A decision rejected for another reason says「交易服務沒有接受這次決定，請再試一次」and re-enables the choices | extends PRD edge case「送出決定時連不上或交易服務出錯」— listed there, so consistent |

No orphan implements an Out of Scope item (no account switching, no revocation list, no scope selection, no request memory across session loss).

## Summary

- Conforms: 19/20 clauses ✅ (95%)
- Violations: none
- Mis-asserted: none
- Partial: NFR-1 (structural; no spec asserts the absence of new settings)
- Gaps: none
- Unclear: none
- Orphans: 3 (all documented in UL-MAP/ARCH; none out of scope)

Note: static conformance audit against the Acceptance Criteria — it judges test assertions and code paths against the spec's expected outcome, not by running the full suite.
