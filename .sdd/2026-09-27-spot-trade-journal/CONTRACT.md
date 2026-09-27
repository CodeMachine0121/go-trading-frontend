# 現貨交易日誌（操作台）— Contract Conformance

**Contract:** `PRD.md`（Section 3 Gherkin、Section 4 規則與邊界）
**Implementation:** branch `feat/spot-trade-journal`
**Ceiling:** 靜態符合度稽核——依規格推出預期結果，再分別判斷測試是否斷言它、程式是否產生它；不執行自創情境。頁面（`app/pages/`）依專案慣例不寫測試。

## Clauses

| ID | 條文 | Oracle（只依規格） | 實作 | 測試 | 測試稽核 | 程式稽核 | Status |
|---|---|---|---|---|---|---|---|
| AC-1 | 從合約日誌切到現貨日誌 | 切到現貨 → 打開現貨交易日誌，標題「現貨交易日誌」 | `market-counterpart-domain.ts:15`、`pages/spot-trade-journal/index.vue:6` | `market-counterpart-application.spec.ts`（合約日誌列表切到現貨日誌列表） | shallow（標題在頁面，不測頁面） | produces-oracle | 🟠 mis-asserted |
| AC-2 | 側欄依目前那一邊打開對應的日誌 | 最後在現貨 → 側欄打開現貨日誌 | `layouts/console.vue:29`、`market-counterpart-domain.ts` `toPathOnSide` | `market-counterpart-application.spec.ts`（側欄的交易日誌跟著最後切到的那一邊） | asserts-oracle | produces-oracle | ✅ |
| AC-3 | 不再說日誌只有合約 | 開關可按、不出現「交易日誌目前只有合約」 | `market-counterpart-domain.ts` | 同上各列 `switchable`／`switchLabel` | asserts-oracle | produces-oracle | ✅ |
| AC-4 | 記一筆台股 | 建立持有中、市場台股、以新台幣計 | `SpotTradeForm.vue`、`spot-trade-record-domain.ts` | `SpotTradeForm.spec.ts`（填好買進…）、`spot-trade-journal-application.spec.ts`（平倉後的結果…） | asserts-oracle | produces-oracle | ✅ |
| AC-5 | 記一筆加密現貨 | 市場加密貨幣、以 USDT 計 | 同上 | application spec（來自機器人連結的交易…加密現貨） | asserts-oracle | produces-oracle | ✅ |
| AC-6 | 表單沒有方向與槓桿 | 沒有方向槓桿欄，只有買進／賣出 | `SpotTradeForm.vue`、`SpotTradeFillEditor.vue` | `SpotTradeForm.spec.ts`（沒有方向與槓桿） | asserts-oracle | produces-oracle | ✅ |
| AC-7 | 台股數量必須是整數 | 數量欄旁「台股數量以股計，必須是整數」 | `spot-trade-draft-domain.ts`、`spot-trade-record-proxy.ts` 欄位對映 | `SpotTradeForm.spec.ts`（台股數量不是整數…、知道是台股後…）、application spec | asserts-oracle | produces-oracle | ✅ |
| AC-8 | 手續費留白即 0 | 那一筆手續費顯示 0 | `spot-trade-record-proxy.ts` `toFillBody`／`toRecord` | proxy spec（沒填的手續費不送、缺的欄位給安全的預設值） | asserts-oracle | produces-oracle | ✅ |
| AC-9 | 手續費自己填，含證交稅 | 顯示 1,983，提示證交稅併入 | `SpotTradeFillEditor.vue` | form spec、fill ledger spec | asserts-oracle | produces-oracle | ✅ |
| AC-10 | 已有持有中不能再新增 | 顯示拒絕並提供「前往 #5 加一筆買進」 | `SpotTradeForm.vue` | form spec（已有持有中…） | asserts-oracle | produces-oracle | ✅ |
| AC-11 | 部分賣出 | 仍持有中、持有 600 股 | draft domain 預覽、record domain `holdingText` | application spec（即時預覽…、持有中…600 股） | asserts-oracle | produces-oracle | ✅ |
| AC-12 | 全部賣出即平倉 | 變成已平倉並提示可以去寫檢討 | `pages/spot-trade-journal/[id].vue`（已平倉提示） | —（頁面不測） | no-test | produces-oracle | 🟡 partial |
| AC-13 | 賣出超過持有 | 顯示「賣出超過持有」，內容保留 | proxy 對映 `exitQuantity`、`SpotTradeFillEditor.vue` | proxy spec、fill editor spec | asserts-oracle | produces-oracle | ✅ |
| AC-14 | 平倉後的結果 | 淨損益 +67,900、報酬率 +6.47%、R +1.36 | `spot-trade-outcome-domain.ts` | application spec | asserts-oracle | produces-oracle | ✅ |
| AC-15 | 沒有計畫止損 | 報酬率照常，R「未設止損，算不出」 | 同上 | application spec | asserts-oracle | produces-oracle | ✅ |
| AC-16 | 現貨沒有資金費用與強平價 | 浮動損益估算、沒有資金費用與強平兩項 | 同上 | application spec | asserts-oracle | produces-oracle | ✅ |
| AC-17 | 最大不利與最大有利 | 有值時呈現，沒有行情寫原因 | 同上 | application spec | asserts-oracle | produces-oracle | ✅ |
| AC-18 | 止損放錯邊 | 止損欄旁「止損必須低於買進價」 | proxy 對映 `plannedStopLossPrice` | proxy spec（止損放錯邊時指向對應欄位） | asserts-oracle | produces-oracle | ✅ |
| AC-19 | 平倉後計畫鎖定 | 標示已鎖定、沒有修改入口、可加附註 | `TradePlanPanel.vue`、record domain `planLocked` | `TradePlanPanel.spec.ts`、application spec | asserts-oracle | produces-oracle | ✅ |
| AC-20 | 依市場分兩組 | 兩組各自數字，金額不合計 | `spot-trade-market-statistics-domain.ts` | application spec、statistics panel spec | asserts-oracle | produces-oracle | ✅ |
| AC-21 | 平均 R 標示以幾筆計 | 「以 3 筆計」 | 同上 | application spec | asserts-oracle | produces-oracle | ✅ |
| AC-22 | 失誤成本只算這一本 | 現貨統計出現「追價進場」 | 同上 | application spec、statistics panel spec | asserts-oracle | produces-oracle | ✅ |
| AC-23 | 期間內沒有平倉 | 那一組「這段期間沒有已平倉交易」、勝率不適用 | 同上 | application spec | asserts-oracle | produces-oracle | ✅ |
| AC-24 | 買入連結預填新增 | 預填各欄，買進價與數量標示請改成實際成交 | `spot-trade-prefill-domain.ts`、`use-spot-trade-draft.ts` | form spec、application spec | asserts-oracle | produces-oracle | ✅ |
| AC-25 | 沒有建議部位 | 數量留空 | prefill domain | application spec | asserts-oracle | produces-oracle | ✅ |
| AC-26 | 買入但已有持有中 | 打開 #5 加一筆買進 | prefill domain、form redirect | application spec、form spec | asserts-oracle | produces-oracle | ✅ |
| AC-27 | 出場連結預填賣出 | #5 加一筆賣出、數量 600 | 同上 | application spec、form spec（出場連結帶進來的是賣出） | asserts-oracle | produces-oracle | ✅ |
| AC-28 | 出場但沒有持有中 | 說明沒有並提供新增 | 同上 | application spec、form spec | asserts-oracle | produces-oracle | ✅ |
| AC-29 | 別人的或已不在紀錄中 | 說找不到並提供手動記 | `use-spot-trade-draft.ts`、`TradePrefillBanner.vue` | form spec | asserts-oracle | produces-oracle | ✅ |
| AC-30 | 現貨實盤 vs 回測並排勝率 | 並排筆數勝率、說明重演不計成本 | `spot-trade-live-comparison-domain.ts` | application spec、comparison panel spec | asserts-oracle | produces-oracle | ✅ |
| AC-31 | 開倉 | 第一筆顯示「開倉」、價格欄「開倉價」 | `contract-trade-record-domain.ts`、`ContractTradeFillEditor.vue` | contract application spec（開倉、加倉、減倉、平倉） | asserts-oracle | produces-oracle | ✅ |
| AC-32 | 加倉 | 「加倉」 | 同上 | 同上 | asserts-oracle | produces-oracle | ✅ |
| AC-33 | 減倉 | 「減倉」、價格欄「平倉價」 | 同上 | 同上 | asserts-oracle | produces-oracle | ✅ |
| AC-34 | 平倉 | 「平倉」 | 同上 | 同上 | asserts-oracle | produces-oracle | ✅ |
| AC-35 | 不再出現成交價 | 開倉均價、平倉均價，不出現「成交」 | 合約元件文字 | contract list／editor／form spec | asserts-oracle | produces-oracle | ✅ |
| BR-1 | 畫面只自己算即時預覽 | 其餘數字以交易服務回傳為準 | draft domain | application spec | asserts-oracle | produces-oracle | ✅ |
| BR-2 | 連不上時說連不上 | 不呈現空狀態 | `use-spot-trade-journal.ts`、list panel | journal composable spec、list panel spec | asserts-oracle | produces-oracle | ✅ |
| BR-3 | 儲存中儲存鍵停用 | 避免記兩筆 | `SpotTradeForm.vue` | form spec（讀取預填中不能儲存；儲存中也不能再按一次） | asserts-oracle | produces-oracle | ✅ |
| BR-4 | 未儲存離開要先在頁面內確認 | 頁面內確認 | `pages/spot-trade-journal/new.vue`、`[id].vue` | —（頁面不測；`use-leave-confirmation` 既有測試） | no-test | produces-oracle | 🟡 partial |

## Orphans

| 行為 | 位置 | 判讀 |
|---|---|---|
| 列表依市場篩選 | `SpotTradeListPanel.vue` | PRD Appendix 已決定加入，非越界 |
| 合約與現貨共用一個預填說明條 | `TradePrefillBanner.vue` | 重構，行為不變 |

## Summary

39 條：✅ 36 · 🟠 1（AC-1，標題在頁面）· 🟡 2（AC-12、BR-4，頁面接線）· 🔴 0 · ❌ 0 · ❔ 0。符合度 92%。
驗證過程中補上 BR-3 的測試（原本 🟡）。其餘未滿的三條都落在頁面接線，依專案慣例頁面不寫測試。
