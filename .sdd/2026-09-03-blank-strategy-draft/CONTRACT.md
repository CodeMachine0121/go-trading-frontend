# Contract Traceability Matrix — 開一份新的空白策略

Contract: `PRD.md`
Design map: `ARCH.md`
Implementation: `app/domain/service/strategy-service.ts`、`app/application/strategy-application.ts`、
`app/composables/use-strategy-library.ts`、`app/components/atoms/AppIcon.vue`、
`app/components/organisms/IndicatorCalculationPanel.vue`
Oracle: Acceptance Criteria（11 個情境）

## Clauses

`Spec-expected` 欄是只讀規格文字得出的業務可觀察結果；`Impl` / `Test` 欄是把它橋接到程式碼之後查到的位置。
測試一律在 `tests/components/organisms/IndicatorCalculationPanelStrategy.spec.ts` 的
「開一份新的空白」那一組，走的是使用者真正會走的那條路（按那顆按鈕、在對話框上回答）。

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-01 | 清空算式並把設定帶回預設 | 算式清空、種類與刻度回預設、根數回 20 | `IndicatorCalculationPanel.vue` 的 `blankStrategyContent`、`use-strategy-library.ts` 的 `applyBlankContent` | 「清空算式並把三個設定帶回預設」（四個欄位逐一斷言 `float` / `5m` / `20` 與算式不含原內容） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02 | 解除與那一支的關聯 | 選單顯示「未使用任何策略」；接著按儲存是問新名字，不是存回原本那一支 | `applyBlankContent` 內 `activeStrategy = null`；儲存改問名字沿用既有 `saveStrategy` | 「解除與那一支的關聯——之後按儲存是問新名字」（斷言取名框出現、`updateStrategy` 未被呼叫、選單值為空） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03 | 交易標的不受影響 | 交易標的仍是 `ETHUSDT` | `applyContent` 回呼只寫四個欄位，不碰 `symbol`（`StrategyContentDto` 本來就不含交易標的） | 「交易標的不動——它不是策略記著的東西」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04 | 上一次的計算結果不留在畫面上 | 畫面上不再有那一次的計算結果 | `IndicatorCalculationPanel.vue` 的 `applyContent` 回呼內 `result.value = null` | 「上一次的計算結果不留在畫面上」（先算出結果、斷言它在，清空後斷言它不在） | asserts-oracle | produces-oracle | ✅ conforms（同一行也修掉既有的「載入另一支後舊結果留著」——兩者同因，修在同一處） |
| AC-05 | 一律說出已經開了新的一份 | 一支都沒有、編輯區是空的時候也要說出來 | `applyBlankContent` 內設 `noticeMessage` | 「編輯區本來就空的時候也要說一聲」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06 | 有未儲存的變更時先問 | 問「放棄尚未儲存的變更？」，且算式一個字都沒被清掉 | `guardOverwritingDraft`（`use-strategy-library.ts`）+ 既有 `discard` 對話框 | 「有還沒存的東西時先問過，而且一個字都還沒被清掉」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-07 | 確認放棄之後才清空 | 確認後才清空、回預設、解除關聯 | `confirmDiscard` 把扣住的 `pendingDraftAction` 叫出來 | 「確認放棄之後才真的清空」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-08 | 取消就什麼都不動 | 算式照原樣留著，且仍屬於原本那一支 | `closeDialog` 清掉 `pendingDraftAction`，不執行它 | 「取消就什麼都不動，也仍然屬於原本那一支」（斷言算式與選單值 `7` 都沒變） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-09 | 一份沒動過的空白不必問 | 不問任何事，直接就是一份空白 | `applyBlankContent` 把 `loadedContent` 設成 `null`；既有 `StrategyDraftDomain`「還沒載入過時只看算式是否空白」 | 「一份沒動過的空白再按一次不必問」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-10 | 一次請求都不發 | 後端沒收到任何請求，清單仍是那三支 | `startBlankStrategy` 全程同步，不呼叫 `strategyApplication` 任何 async 方法 | 「一次後端請求都不發，清單一支不增不減」（四個 proxy 方法的呼叫次數 + 選項數仍是 4＝三支加佔位） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-11 | 後端連不上也照樣開得起來 | 清空成一份空白，且不出現任何錯誤訊息 | 同上——這條路到不了應用程式邊界 | 「後端連不上也照樣開得起來」（`listStrategies` 拒絕，仍清空且無 `strategy-error`） | asserts-oracle | produces-oracle | ✅ conforms |

## Orphans

實作上有一項規格沒有明文要求，但是實作它的必然後果，記在這裡以免下一個人以為它是多做的：

| 項目 | 為什麼 |
| :--- | :--- |
| 確認對話框的文案由「載入另一支策略會蓋掉它／放棄並載入」改成「接下來這個動作會蓋掉它／放棄並繼續」 | 同一個對話框現在有兩個觸發點，原本的文案會對「開一份空白」說錯話。AC 只釘住標題（「放棄尚未儲存的變更？」），標題未動。詳見 `ARCH.md` |
| `StrategyService.defaultCandleCount()` | AC-01 要求「根數回到預設的 20」。原本 `20` 是畫面裡的字面值，規格說的是「預設」——預設值得有一個家，而它與彙總刻度的預設是同一件事的兩半 |

## Verdict

11 條 AC 全部 conforms，沒有 gap、沒有淺測試、沒有行為違規。
`bun run verify` 全綠（642 個測試）。
