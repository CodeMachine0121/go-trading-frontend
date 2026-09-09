# Contract Traceability Matrix — 說要看哪一段，不再自己數格子

Contract: `PRD.md`
Design map: `ARCH.md`
Implementation: `app/domain/models/vo/`, `app/domain/service/`, `app/infrastructure/proxy/`, `app/composables/`, `app/components/organisms/`
Oracle: Acceptance Criteria (17 scenarios，含審查後回填的一條) + Core Business Rules (6) + Non-Functional (2) = 25 clauses
審查後已修：把「那句話說得出為什麼」回填成條款。

Bridging notes（UL-MAP + ARCH）：
- 「觀察區間」→ `ObservationWindowVo{ startTime, endTime }`；`endTime === null` 意思是「算到現在」。
- 「這一段時間市場沒有交易」→ 系統回應的 `observationWindowHoldsNoTrading` → `BackendRequestRejectedError.marketClosedThroughout` → `MarketClosedThroughoutDomain.message()`，標在 `IndicatorCalculationFieldError('span')`。
- 「一次要得太多」→ 系統指名 `field: 'startTime'`；「湊不出最少可算根數」→ 那兩個根數。

## Clauses

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-01 | 圖上看一個交易日 | 交出去的是那一段（起點＝畫面左端）；畫面沒有算過任何格數 | `chart-visible-range-vo.ts:79`、`use-chart-indicators.ts:506` | `chart-visible-range-vo.spec.ts:80`（起點）＋`:109`（交出去的只有起訖兩個欄位）＋`KCandleChartPanelIndicators.spec.ts:350` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02 | 拉遠之後重算 | 交出去的是新的那一段；每根涵蓋多久仍照既有規則自動挑 | 同上 | `KCandleChartPanelIndicators.spec.ts`（拉遠時以新的那一段重算，兩次 rangeChange 各斷言新起點）＋既有刻度自動挑的那一組（`k-candle-chart-viewport-domain.spec.ts`） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03 | 畫面上看得到最新那一根 | 那一段的終點不指定，等同算到現在 | `chart-visible-range-vo.ts:79` | `chart-visible-range-vo.spec.ts:87`＋`KCandleChartPanelLiveEdge.spec.ts`（一根走完／往回拖一點） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04 | 使用者拖到一段已經過去的行情 | 終點就是顯示區間的右端 | 同上 | `chart-visible-range-vo.spec.ts:94`、`:102`＋`KCandleChartPanelLiveEdge.spec.ts`（算到的是那一段的右端） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05 | 填最近兩小時 | 交出去的是「從現在往回兩小時」那一段 | `calculation-span-vo.ts`（`toObservationWindow`）、`indicator-calculation-service.ts`（`observationWindowFor`） | `calculation-span-vo.spec.ts:6`（四列）＋`indicator-calculation-service.spec.ts`（最近兩小時／三十分鐘／一天） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06 | 填最近一天 | 交出去的是「從現在往回一天」那一段；台股算出一個交易日的格數，加密貨幣算出一整天的 | 同上 | 同上（「最近一天」那一列） | asserts-oracle（**畫面這一側的部分**：交出去的那一段。後半句「各自算出幾格」是系統那一側的行為，由後端切片的 AC-01/AC-07 釘住） | produces-oracle | ✅ conforms |
| AC-07 | 要看多長填了零 | 照既有規則在那一格旁邊擋下來，不送出 | `indicator-calculation-service.ts`（`observationWindowFor` 先驗證） | `indicator-calculation-service.spec.ts`（零／負數／小數三列，並斷言欄位是 `span`）＋`calculation-span-vo.spec.ts:33` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-08 | 整段落在收盤後 | 那一格旁邊出現「這一段時間市場沒有交易」，請他改看有交易的時間，沒有畫出任何線 | `backend-api-proxy.ts:104`、`indicator-calculation-proxy.ts`（第三個分支）、`market-closed-throughout-domain.ts` | `indicator-calculation-proxy.spec.ts:455`＋`market-closed-throughout-domain.spec.ts` | asserts-oracle（「沒有畫出任何線」由既有的「算失敗就不畫」那一組覆蓋，本切片未改該路徑） | produces-oracle | ✅ conforms |
| AC-09 | 整段是週末 | 出現的是同一句話 | 同上 | 同上（辨認靠的是系統交出來的值，與是週末還是夜裡無關——同一條路徑） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-10 | 那句話不指向沒有用的出路 | 沒有叫人換彙總刻度，也沒有叫人縮短或拉長區間 | `market-closed-throughout-domain.ts` | `market-closed-throughout-domain.spec.ts`（不含「刻度」「縮短」「拉長」）＋`indicator-calculation-proxy.spec.ts:469` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-11 | 歷史不夠深仍是既有那一句 | 「只湊得出 19 根、至少要 20 根」，出路仍是更細的刻度或補歷史 | 既有 `candle-coverage-shortfall-domain.ts`（未改） | 既有 `candle-coverage-shortfall-domain.spec.ts`＋`indicator-calculation-proxy.spec.ts:399`／`:493`（與第三種分得開） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12 | 一次要得太多仍是既有那一句 | 仍標在「要看多長」那一格旁邊，出路仍是縮短區間或更粗的刻度 | `indicator-calculation-proxy.ts`（判準常數改為 `startTime`） | `indicator-calculation-proxy.spec.ts`（系統指名是那一段的起點時…） | asserts-oracle（**這是壞得最安靜的一處**：常數漏改不會讓句子消失，只會讓它掉出欄位。該測試直接釘住欄位與措辭） | produces-oracle | ✅ conforms |
| AC-13 | 全天候市場的深夜照常算得出來 | 照常算出結果，不出現任何拒絕 | 無需程式：系統不會回那一種拒絕 | — | no-test（畫面沒有任何分支可測——它不判斷市場，也不知道現在幾點） | produces-oracle | 🟡 partial |
| AC-14 | 台股看整整二十四小時 | 線只涵蓋交易的四個半小時；畫面不顯示任何資料缺漏的提醒 | 無需程式：這次沒有新增任何提示 | — | no-test（「沒有多做一件事」很難以測試釘住；以審查確認未新增任何提示元素） | produces-oracle | 🟡 partial |
| AC-15 | 真的畫不滿時仍然說出來 | 仍照既有規則說出填滿要幾根、實際採用幾根 | 既有 `indicator-calculation-domain.ts:46`（未改） | 既有那一組（畫不滿的通知） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-10b | 那句話說得出為什麼：這一檔不是全天候交易的 | 使用者知道錯的不是他填的數字，而是他挑的那個時候 | `market-closed-throughout-domain.ts` | `market-closed-throughout-domain.spec.ts`（說出為什麼會這樣） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-16 | 加密貨幣的線不變 | 線與改動前一模一樣 | 全域：加密貨幣的觀察區間長度等於原本的格數×刻度 | 既有整套圖表指標測試（全部以加密貨幣為對象且全綠） | asserts-oracle（既有測試若行為改變就會紅） | produces-oracle | ✅ conforms |
| BR-1 | 觀察區間的來源有兩個：圖表是顯示區間本身；指標計算畫面由「要看多長」往回推 | 兩個來源各自交出同一種形狀 | `chart-visible-range-vo.ts:79`、`calculation-span-vo.ts` | 兩份 VO 測試各自釘住 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-2 | 畫面不再換算格數，也不再需要知道每根涵蓋多久 | 送出的請求沒有格數；換算不看彙總刻度 | `indicator-calculation-service.ts`（`observationWindowFor` 只收 span）、`indicator-calculation-proxy.ts`（body 無 `candleCount`） | `indicator-calculation-proxy.spec.ts`（body 全等比對，`candleCount` 不在其中）＋`calculation-span-vo.spec.ts:24` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-3 | 終點的規則不變 | 圖表：看得到最新那一根就不指定，否則右端；指標計算畫面：不指定 | `chart-visible-range-vo.ts:79`、`calculation-span-vo.ts` | `chart-visible-range-vo.spec.ts:87/94/102`＋`calculation-span-vo.spec.ts:19` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-4 | 三種算不出來各說各的話，且靠系統交出來的是哪一種來認，不讀文字 | 三句不同的話；辨認不依賴訊息文字 | `backend-api-proxy.ts`、`indicator-calculation-proxy.ts` 的三個分支 | `indicator-calculation-proxy.spec.ts:483`（沒帶那個值就不當成這一種）＋`:411`（半組數字不當成那一種） | asserts-oracle | produces-oracle | ✅ conforms |
| BR-5 | 三句話不得共用同一個動詞 | 第三句不含另外兩句的動詞 | `market-closed-throughout-domain.ts` | `market-closed-throughout-domain.spec.ts`（四條 `not.toContain`）＋既有 `candle-coverage-shortfall-domain.spec.ts` 的對應四條 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-6 | 既有行為全部不變（畫不滿只是通知、重算節流、什麼時候重算、線的顏色、記住套用了哪幾支） | 既有行為不變 | 未改動 | 既有整套（146 檔全綠） | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-1 | 不新增任何一次請求；重算節流與既有規則不變 | 請求次數不變 | 未改動任何觸發點 | 既有「什麼時候重算」那一組（次數斷言） | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-2 | 桌機瀏覽器，與既有一致 | 無新增相容性需求 | 未改動 | — | no-test | produces-oracle | 🟡 partial |

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| `market-closed-throughout-domain.ts` 的「這一檔不是全天候交易的」那半句 | 那句話多說了一句**為什麼**（收盤與週末不會有成交） | **已回填**：PRD US-03「那句話說得出為什麼」（由 `market-closed-throughout-domain.spec.ts` 的「說出為什麼會這樣」釘住） |
| `ObservationWindowVo` 兩個欄位以外沒有任何行為 | 值物件本身沒有可測的判斷 | 符合設計（VO 不帶行為），非孤兒 |

## Summary

- Conforms: 22/25 clauses ✅ (88%)
- Violations: 無
- Mis-asserted: 無
- Partial: AC-13、AC-14、NFR-2（三條都是**「畫面不多做一件事」**型的條款：沒有分支可走，也沒有元素可斷言。以審查確認，未新增任何提示、未新增任何判斷）
- Gaps: 無
- Unclear: 無
- Orphans: 0（唯一一個已回填成條款）

Note: static conformance audit against the Acceptance Criteria — it judges test
assertions and code paths against the spec's expected outcome, not by running the
full suite. For dynamic proof of a partial clause, drive it via `/tdd`.
