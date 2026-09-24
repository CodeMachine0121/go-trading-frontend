# Contract Verification — 合約 K 線圖表的即時跟盤

**Oracle:** `PRD.md` §3 Acceptance Criteria (14 scenarios), §4 Core Business Rules (5), §6 NFR (2)
**Implementation:** `feat/contract-live-follow` (go-trading-frontend)
**Ceiling:** static conformance audit — test assertions and code paths judged against the spec's expected outcome; mapped tests run only as corroboration. Run by the implementing agent (not independent).

## Clauses

| ID | Clause | Oracle | Implementation | Test | Test audit | Code audit | Status |
|---|---|---|---|---|---|---|---|
| AC-01 | 畫出一個名單上的合約標的就開始跟 | 畫出 BTCUSDT 後開始跟 BTCUSDT 的合約即時更新 | `KCandleContractChartPanel.vue` `followTheMarket`；`dependencies.ts` 合約路由 | `KCandleContractChartPanelLiveUpdates.spec.ts` 「畫出一個名單上的合約標的就開始跟」 | asserts-oracle | produces-oracle | ✅ |
| AC-02 | 還在走的那一根跟著動 | 最新那一根收盤與最新價都是 64050 | panel 跟盤回呼 → `LiveKCandleChartDomain` | 「還在走的那一根跟著動」 | asserts-oracle | produces-oracle | ✅ |
| AC-03 | 走完一根就多一根 | 那一根定下來、多一根新的 | 同上 | 「走完一根、下一根開始」 | asserts-oracle | produces-oracle | ✅ |
| AC-04 | 換合約標的就改跟新的那一個 | 停 BTCUSDT、跟 ETHUSDT；之後的 BTCUSDT 更新不改圖 | panel 世代號 + `stopTheFollow` | 「換合約標的就改跟新的那一個」 | asserts-oracle | produces-oracle | ✅ |
| AC-05 | 離開就停 | 停止跟盤 | panel `onBeforeUnmount` | 「離開就停」 | asserts-oracle | produces-oracle | ✅ |
| AC-06 | 圖取不到就不跟 | 不跟、圖清空、說出被拒絕原因 | panel `forgetTheChart` | 「圖取不到就不跟」、「換到一個取不到圖的合約標的…」 | asserts-oracle | produces-oracle | ✅ |
| AC-07 | 不在名單上的合約標的 | 不跟、圖照畫、說出那一句 | panel `isKnownUnwatched` + `LiveKCandleService.contractLiveUpdateNotice` | 「不跟、圖照樣畫出…」、「換到一個不在名單上的就停掉…」、「圖先畫出來、清單後來才說…」 | asserts-oracle | produces-oracle | ✅ |
| AC-08 | 名單上的合約標的沒有這一句 | 沒有那一句 | 同上 | 「名單上的合約標的沒有那一句」 | asserts-oracle | produces-oracle | ✅ |
| AC-09 | 即時更新斷了 | 說已停止、圖照樣顯示 | `LiveKCandleProxy.onerror`／stalled → notice | 「斷了就說已停止…」 | asserts-oracle | produces-oracle | ✅ |
| AC-10 | 重新跟上 | 那一句消失、圖跟著動 | notice 以 `isTrading` 為準 | 同上 | asserts-oracle | produces-oracle | ✅ |
| AC-11 | 合約沒有收盤中 | 從不出現收盤中 | `contractLiveUpdateNotice` 交易時段恆為真 | 「合約從不說收盤中」 | asserts-oracle | produces-oracle | ✅ |
| AC-12 | 常駐說明 | 只說沒有指標、不說沒有即時跟盤 | panel 模板 | `KCandleContractChartPanel.spec.ts` 「常駐一句話只說還沒有的」 | asserts-oracle | produces-oracle | ✅ |
| AC-13 | 現貨圖表跟的是現貨那一條 | 現貨跟現貨的即時更新 | `dependencies.ts` 以 `/k-candles/live` 建現貨那一個 | `live-k-candle-proxy.spec.ts` 路由測試 + 既有現貨圖表測試 | asserts-oracle（proxy 照路由開通道）；組裝根本身依專案慣例不測 | produces-oracle | ✅ |
| AC-14 | 兩邊互不影響 | 只有合約圖表跟著動 | 兩個實例、兩條通道 | 「現貨與合約各開各的通道，同一個代號也不共用」 | asserts-oracle | produces-oracle | ✅ |
| BR-01 | 每換一批就換跟的對象、舊的不採用 | 同 AC-04 | panel `followTheMarket` | AC-04 | asserts-oracle | produces-oracle | ✅ |
| BR-02 | 只在名單上才跟；不知道時照常跟 | 名單外不跟；清單取不到時照跟、不說不在名單 | panel `isKnownUnwatched` | 「合約標的清單取不到時照常跟…」 | asserts-oracle | produces-oracle | ✅ |
| BR-03 | 優先序：不在名單上 ＞ 已停止；沒有收盤中 | 兩者同時成立時說不在名單上 | `LiveUpdateNoticeDomain`（清單順序） | `live-k-candle-contract-application.spec.ts` | asserts-oracle | produces-oracle | ✅ |
| BR-04 | 帶 K 線的更新進來就是跟得動 | 已停止／不在名單那一句消失 | `contractLiveUpdateNotice` `isTrading` | AC-10、application spec 最後一條 | asserts-oracle | produces-oracle | ✅ |
| BR-05 | 即時更新只併進圖、不存、不算 | 不為它重新取行情 | panel 回呼只設圖 | 「即時更新只併進圖：不為了它重新取行情」 | asserts-oracle | produces-oracle | ✅ |
| NFR-01 | 同一時間一條跟盤；換標的先停再開 | 換標的時舊的停掉再開新的 | `followTheMarket` 先 `stopTheFollow` | AC-04 | asserts-oracle | produces-oracle | ✅ |
| NFR-02 | 現貨行為與測試不變 | 現貨圖表測試不動仍綠 | — | 現貨圖表測試（只改 proxy 建構子引數） | asserts-oracle | produces-oracle | ✅ |

## Orphans

None. Out-of-scope items (indicators, catch-up, mark-price live line, adding to the watchlist from the chart) are not implemented.

## Summary

First pass: 18 conforms · 3 partial (BR-03 priority, BR-05 no-refetch, AC-13 wiring). BR-03 and BR-05 got tests;
AC-13 is judged by the proxy's route test (the composition root has no tests by project convention).

✅ 21 conforms · 🔴 0 · 🟠 0 · 🟡 0 · ❌ 0 · ❔ 0 · ⚠️ 0 — Conformance 100%.
