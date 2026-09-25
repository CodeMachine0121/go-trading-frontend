# Contract Traceability Matrix — market-data-writes-require-sign-in

Contract: PRD.md
Design map: ARCH.md
Implementation: `app/infrastructure/proxy/backend-api-proxy.ts`, `app/infrastructure/proxy/k-candle-proxy.ts`, `app/middleware/signed-in.global.ts`
Oracle: Acceptance Criteria (8 clauses) + Core Business Rules (3)

## Clauses

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-1 | 新增一根 K 線時帶著身分 | 新增的那一次送出帶著登入者的身分；新增成功並重查 | k-candle-proxy.ts:103 → backend-api-proxy.ts:154, 239 | k-candle-proxy.spec.ts:409「新增一根 帶著目前登入者的身分送出」; KCandleSearchPanel.spec.ts:334 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-2 | 修改一根 K 線時帶著身分 | 修改的那一次送出帶著身分；修改成功 | k-candle-proxy.ts:112 → backend-api-proxy.ts:154 | k-candle-proxy.spec.ts:409「修改一根 …」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-3 | 刪除一根 K 線時帶著身分 | 刪除的那一次送出帶著身分；刪除成功 | k-candle-proxy.ts:121 → backend-api-proxy.ts:154 | k-candle-proxy.spec.ts:409「刪除一根 …」; :361 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-4 | 立刻更新時帶著身分 | 補齊的要求帶著身分；說出補到幾根並重畫 | k-candle-proxy.ts:125 → backend-api-proxy.ts:154 | k-candle-proxy.spec.ts:409「立刻更新 …」; KCandleChartPanel.spec.ts:543, 554 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-5 | 登入過期但救得回來 | 系統自己換新一次、重送一次、成功；不被帶離、不丟掉登入 | backend-api-proxy.ts:180 | k-candle-proxy.spec.ts:419（四個動作） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-6 | 登入過期而且救不回來 | 不重送第二次；丟掉記著的登入；帶回登入畫面 | backend-api-proxy.ts:186-189 | k-candle-proxy.spec.ts:437（四個動作：只送一次、清掉登入、`onSignedOut`、`SignedOutError`） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-7 | 沒登入的人打開 K 線頁 | 被帶到登入畫面、看不到維護動作；登入放行後回到 K 線頁 | signed-in.global.ts:53-65 | signed-in.global.spec.ts:65, 71 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-8 | 看行情照舊 | 查一段 K 線與看圖的請求與今天一樣 | k-candle-proxy.ts（讀取未改） | k-candle-proxy.spec.ts:97, 126 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-1 | 每一次請求只要記著登入就帶著身分；行情維護不另開一條路 | 維護動作走同一條帶身分的路 | backend-api-proxy.ts:154 | k-candle-proxy.spec.ts:409 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-2 | 過期處理只有一條：先救回重送一次，救不回來才請人重新登入 | 同 AC-5／AC-6 | backend-api-proxy.ts:180-189 | k-candle-proxy.spec.ts:419, 437 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-3 | 操作台只給登入且已放行的人 | 未放行只看得到等待開通那一頁 | signed-in.global.ts:71 | signed-in.global.spec.ts:123 起 | asserts-oracle | produces-oracle | ✅ conforms |

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| — | 這一刀沒有新增正式程式碼（只改一行註解） | — |

## Summary

- Conforms: 11/11 clauses ✅ (100%)
- Violations: none
- Mis-asserted: none
- Partial: none
- Gaps: none
- Unclear: none
- Orphans: 0

Static conformance audit: test assertions and code paths were judged against the spec's expected outcome; only the mapped specs were run as corroboration.
