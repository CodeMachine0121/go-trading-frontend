# Contract Traceability Matrix — 看盤繪圖存到帳號，並看得到助手畫的線

Contract: PRD.md
Design map: ARCH.md
Implementation: app/（domain、application、infrastructure/proxy、composables、components、pages）
Oracle: Acceptance Criteria (39 clauses)

> 這是**靜態符合度稽核**：以 PRD 的驗收情境為準，逐條判斷測試是否斷言了情境的結果、程式路徑是否產生該結果；
> 不執行自創的情境。只有對應某一條的那幾個測試被執行過當旁證。

## Clauses

`Test audit` / `Code audit` 是 Claude 的影子判定；`Jev test` / `Jev code` 是 Jev 的判定與信心；`Status` / `Route` 依 `jev_audit.py` 原樣記錄。

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Jev test | Jev code | Status | Route |
|----|--------|------------------------|------|------|------------|------------|----------|----------|--------|-------|
| AC-1 | US-01 另一台電腦看到帳號裡的繪圖 | 打開現貨 BTCUSDT 時圖上有帳號裡那條 60000 的水平線 | app/composables/use-chart-drawing-board-sync.ts:114-150<br>app/domain/models/domains/chart-drawing-board-domain.ts:120-138 | use-chart-drawing-board-sync.spec.ts:69-77 | asserts-oracle | produces-oracle | asserts-oracle 0.92 | produces-oracle 0.43 | ✅ conforms | escalate (low confidence) |
| AC-2 | US-01 帳號裡從沒存過、瀏覽器也沒有舊繪圖 | 圖上沒有繪圖，不出現任何繪圖提示 | app/domain/service/chart-drawing-service.ts:49-78<br>app/composables/use-chart-drawing-board-sync.ts:114-150 | use-chart-drawing-board-sync.spec.ts:78-86<br>chart-drawing-application.spec.ts:21-33 | asserts-oracle | produces-oracle | asserts-oracle 0.97 | produces-oracle 0.84 | ✅ conforms | recheck (mid confidence) |
| AC-3 | US-01 讀回來之前先畫的不會被蓋掉 | 先畫的趨勢線與帳號裡的水平線同時在圖上，且兩條都存在帳號裡 | app/domain/models/domains/chart-drawing-board-domain.ts:120-157<br>app/domain/models/domains/chart-drawing-board-domain.ts:71-81 | use-chart-drawing-board-sync.spec.ts:87-98 | asserts-oracle | produces-oracle | asserts-oracle 0.80 | produces-oracle 0.92 | ✅ conforms | recheck (mid confidence) |
| AC-4 | US-01 讀不到帳號裡的繪圖 | 圖上說「讀不到存在帳號裡的繪圖」與原因並給重試；仍可畫 | app/composables/use-chart-drawing-board-sync.ts:114-150<br>app/components/molecules/ChartDrawingBoardNotices.vue:23-40 | use-chart-drawing-board-sync.spec.ts:99-112<br>use-chart-drawing-board-sync.spec.ts:147-165 | asserts-oracle | produces-oracle | asserts-oracle 0.87 | produces-oracle 0.53 | ✅ conforms | escalate (low confidence) |
| AC-5 | US-01 讀不到之後重試成功 | 按重試後帳號裡的繪圖出現，說明消失 | app/composables/use-chart-drawing-board-sync.ts:114-150 | use-chart-drawing-board-sync.spec.ts:99-112<br>KCandleChartWorkspace.spec.ts:525-538 | asserts-oracle | produces-oracle | asserts-oracle 0.96 | produces-oracle 0.81 | ✅ conforms | recheck (mid confidence) |
| AC-6 | US-02 畫一條線就存回帳號 | 帳號裡有那條趨勢線，其編號是帳號發的 | app/composables/use-chart-drawing-board-sync.ts:64-78<br>app/composables/use-chart-drawing-board-sync.ts:80-112 | use-chart-drawing-board-sync.spec.ts:200-213<br>chart-drawing-application.spec.ts:119-133 | asserts-oracle | produces-oracle | asserts-oracle 0.92 | produces-oracle 0.99 | ✅ conforms | accept |
| AC-7 | US-02 拖動途中不存，放手才存一次 | 拖動放手後帳號只收到一次存回，內容是放手時的位置 | app/composables/use-chart-drawing-board-sync.ts:64-78<br>app/composables/use-chart-drawing-board-sync.ts:153-165 | use-chart-drawing-board-sync.spec.ts:214-227<br>ChartDrawingLayer.spec.ts:218-229 | asserts-oracle | produces-oracle | asserts-oracle 0.91 | produces-oracle 0.24 | ✅ conforms | escalate (low confidence) |
| AC-8 | US-02 很快連做幾步合併成一次存回 | 帳號只收到一次存回，記著線寬 4（最後的樣子） | app/composables/use-chart-drawing-board-sync.ts:64-78<br>app/composables/use-chart-drawing-board-sync.ts:153-165 | use-chart-drawing-board-sync.spec.ts:214-227 | asserts-oracle | produces-oracle | asserts-oracle 0.95 | produces-oracle 0.59 | ✅ conforms | escalate (low confidence) |
| AC-9 | US-02 上一步也存回帳號 | 按上一步後線從圖上消失，帳號裡也沒有它 | app/composables/use-chart-drawings.ts:145-151<br>app/composables/use-chart-drawing-board-sync.ts:153-165 | use-chart-drawing-board-sync.spec.ts:228-242 | asserts-oracle | produces-oracle | asserts-oracle 0.91 | produces-oracle 0.55 | ✅ conforms | escalate (low confidence) |
| AC-10 | US-02 存不進去時畫的東西留著並說明 | 線留在圖上可繼續畫；圖上說「繪圖沒能存到帳號」與原因並給重試 | app/composables/use-chart-drawing-board-sync.ts:80-112<br>app/components/molecules/ChartDrawingBoardNotices.vue:42-57 | use-chart-drawing-board-sync.spec.ts:255-272 | asserts-oracle | produces-oracle | asserts-oracle 0.87 | produces-oracle 0.91 | ✅ conforms | accept |
| AC-11 | US-02 超過一份繪圖板的上限 | 新畫的留在圖上；說「繪圖沒能存到帳號」並說出交易服務的原因（最多 200 個） | app/infrastructure/proxy/chart-drawing-board-proxy.ts:51-86<br>app/composables/use-chart-drawing-board-sync.ts:80-112 | chart-drawing-board-proxy.spec.ts:156-166<br>use-chart-drawing-board-sync.spec.ts:255-272 | asserts-oracle | produces-oracle | asserts-oracle 0.55 | produces-oracle 0.61 | ✅ conforms | escalate (low confidence) |
| AC-12 | US-02 重試之後存進去 | 按重試後存進帳號，說明消失 | app/composables/use-chart-drawing-board-sync.ts:153-165<br>app/composables/use-chart-drawing-board-sync.ts:80-112 | use-chart-drawing-board-sync.spec.ts:255-272<br>use-chart-drawing-board-sync.spec.ts:187-199 | asserts-oracle | produces-oracle | asserts-oracle 0.93 | produces-oracle 0.63 | ✅ conforms | recheck (mid confidence) |
| AC-13 | US-02 存不進去之後再做一步也會再試 | 再畫一條後兩條都存進帳號，說明消失 | app/composables/use-chart-drawing-board-sync.ts:153-165<br>app/composables/use-chart-drawing-board-sync.ts:64-78 | use-chart-drawing-board-sync.spec.ts:285-299 | asserts-oracle | produces-oracle | asserts-oracle 0.83 | produces-oracle 0.11 | ✅ conforms | escalate (low confidence) |
| AC-14 | US-03 助手剛畫了線、這裡又畫了一個 | 圖上與帳號裡同時有支撐線與矩形；提示「繪圖在別處改過，已接上最新的一份」 | app/composables/use-chart-drawing-board-sync.ts:80-112<br>app/domain/service/chart-drawing-service.ts:79-113 | use-chart-drawing-board-sync.spec.ts:330-348<br>chart-drawing-board-domain.spec.ts:225-234 | asserts-oracle | produces-oracle | asserts-oracle 0.79 | produces-oracle 0.92 | ✅ conforms | recheck (mid confidence) |
| AC-15 | US-03 別處刪掉的這裡也不再有 | 圖上與帳號裡都沒有 A 線；B 線在新位置 | app/domain/models/domains/chart-drawing-board-domain.ts:120-157<br>app/domain/models/domains/chart-drawing-board-domain.ts:71-81 | chart-drawing-board-domain.spec.ts:235-243 | asserts-oracle | produces-oracle | asserts-oracle 0.80 | produces-oracle 0.57 | ✅ conforms | escalate (low confidence) |
| AC-16 | US-03 兩邊都改了同一條，以這裡為準 | 帳號裡 A 線在 62000 | app/domain/models/domains/chart-drawing-board-domain.ts:120-157<br>app/domain/models/domains/chart-drawing-board-domain.ts:71-81 | chart-drawing-board-domain.spec.ts:244-252 | asserts-oracle | produces-oracle | asserts-oracle 0.93 | produces-oracle 0.39 | ✅ conforms | escalate (low confidence) |
| AC-17 | US-03 接上別處的改動之後上一步從頭開始 | 上一步按不了 | app/domain/models/domains/chart-drawing-board-domain.ts:120-157 | chart-drawing-board-domain.spec.ts:212-224<br>use-chart-drawing-board-sync.spec.ts:330-348 | asserts-oracle | produces-oracle | asserts-oracle 0.93 | produces-oracle 0.93 | ✅ conforms | accept |
| AC-18 | US-03 別處一直在改，接不上 | 連續三次後停下，說「繪圖沒能存到帳號」並給重試；繪圖照樣在 | app/composables/use-chart-drawing-board-sync.ts:80-112<br>app/composables/use-chart-drawing-board-sync.ts:9-13 | use-chart-drawing-board-sync.spec.ts:349-365 | asserts-oracle | produces-oracle | asserts-oracle 0.23 | produces-oracle 0.59 | ✅ conforms | escalate (low confidence) |
| AC-19 | US-04 助手答完，畫的線出現 | 助手答完那一則後不必重新整理，圖上出現助手畫的兩條線 | app/composables/use-assistant-conversation.ts:345-366<br>app/composables/use-assistant-answer-completions.ts:1-14 | use-assistant-conversation.spec.ts:817-830<br>chart-pages.spec.ts:60-68 | asserts-oracle | produces-oracle | asserts-oracle 0.84 | diverges 0.32 | 🔴 violation | escalate (violation) |
| AC-20 | US-04 切回這個視窗，出現別處加的線 | 切回後圖上出現那一條線，上一步按不了 | app/composables/use-chart-drawing-board-sync.ts:187-228<br>app/composables/use-chart-drawing-board-sync.ts:114-150 | use-chart-drawing-board-sync.spec.ts:396-412 | asserts-oracle | produces-oracle | asserts-oracle 0.96 | produces-oracle 0.88 | ✅ conforms | accept |
| AC-21 | US-04 切回來時帳號那一份沒變 | 圖上不變，上一步仍可按、選取仍在 | app/domain/models/domains/chart-drawing-board-domain.ts:120-133<br>app/composables/use-chart-drawing-board-sync.ts:114-150 | use-chart-drawing-board-sync.spec.ts:436-449<br>chart-drawing-board-domain.spec.ts:203-211 | asserts-oracle | produces-oracle | asserts-oracle 0.96 | produces-oracle 0.85 | ✅ conforms | accept |
| AC-22 | US-04 沒有重讀的時機就暫時看不到 | 沒有切走或問助手時，別處加的線暫時看不到（不會自己去讀） | app/composables/use-chart-drawing-board-sync.ts:187-228 | use-chart-drawing-board-sync.spec.ts:413-422 | asserts-oracle | produces-oracle | asserts-oracle 0.97 | produces-oracle 0.76 | ✅ conforms | recheck (mid confidence) |
| AC-23 | US-05 物件樹標出助手畫的 | 水平線那一列標「助手畫的」，趨勢線那一列沒有 | app/components/molecules/ChartDrawingObjectTree.vue:110-169<br>app/domain/models/domains/chart-drawing-domain.ts:55-60 | ChartDrawingObjectTree.spec.ts:55-62 | asserts-oracle | produces-oracle | asserts-oracle 0.97 | produces-oracle 0.57 | ✅ conforms | escalate (low confidence) |
| AC-24 | US-05 選取助手畫的繪圖時浮動工具列也標出 | 浮動工具列上標「助手畫的」 | app/components/molecules/ChartDrawingFloatingToolbar.vue:100-110 | ChartDrawingFloatingToolbar.spec.ts:126-133 | asserts-oracle | produces-oracle | asserts-oracle 0.87 | produces-oracle 0.93 | ✅ conforms | accept |
| AC-25 | US-05 移動助手畫的繪圖，仍是助手畫的 | 停在新的價格且仍標「助手畫的」 | app/domain/models/domains/chart-drawing-board-domain.ts:90-118<br>app/infrastructure/proxy/chart-drawing-board-proxy.ts:51-70 | chart-drawing-board-domain.spec.ts:168-178<br>chart-drawing-board-proxy.spec.ts:103-124 | asserts-oracle | produces-oracle | asserts-oracle 0.91 | produces-oracle 0.71 | ✅ conforms | recheck (mid confidence) |
| AC-26 | US-05 移除助手畫的全部 | 只剩手畫的那一條；提示「已移除 2 個助手畫的繪圖」 | app/composables/use-chart-drawing-board-sync.ts:168-184<br>app/composables/use-chart-drawing-board-sync.ts:114-150 | use-chart-drawing-board-sync.spec.ts:487-502<br>KCandleChartWorkspace.spec.ts:539-555 | asserts-oracle | produces-oracle | asserts-oracle 0.96 | produces-oracle 0.87 | ✅ conforms | accept |
| AC-27 | US-05 沒有助手畫的繪圖 | 物件樹沒有「移除助手畫的全部」 | app/components/molecules/ChartDrawingObjectTree.vue:60-100 | ChartDrawingObjectTree.spec.ts:63-68 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.79 | ✅ conforms | recheck (mid confidence) |
| AC-28 | US-05 移除助手畫的全部不能上一步 | 上一步按不了；被移除的不會因上一步回來 | app/composables/use-chart-drawing-board-sync.ts:168-184<br>app/domain/models/domains/chart-drawing-board-domain.ts:120-157 | use-chart-drawing-board-sync.spec.ts:487-502 | asserts-oracle | produces-oracle | asserts-oracle 0.87 | produces-oracle 0.71 | ✅ conforms | recheck (mid confidence) |
| AC-29 | US-05 確認時取消 | 那條助手畫的繪圖還在 | app/components/molecules/ChartDrawingObjectTree.vue:28-40<br>app/components/molecules/ChartDrawingObjectTree.vue:60-100 | ChartDrawingObjectTree.spec.ts:80-88<br>KCandleChartWorkspace.spec.ts:556-568 | asserts-oracle | produces-oracle | asserts-oracle 0.99 | produces-oracle 0.95 | ✅ conforms | accept |
| AC-30 | US-05 移除失敗 | 說明「沒能移除助手畫的繪圖」與原因；繪圖都還在 | app/composables/use-chart-drawing-board-sync.ts:168-184 | use-chart-drawing-board-sync.spec.ts:503-514 | asserts-oracle | produces-oracle | asserts-oracle 0.96 | produces-oracle 0.40 | ✅ conforms | escalate (low confidence) |
| AC-31 | US-06 帳號從沒存過，搬進去 | 3 個繪圖存進帳號且為手畫；提示已搬 3 個；瀏覽器忘掉那一筆 | app/domain/service/chart-drawing-service.ts:49-78<br>app/composables/use-chart-drawing-board-sync.ts:114-150 | chart-drawing-application.spec.ts:34-48<br>use-chart-drawing-board-sync.spec.ts:123-133 | asserts-oracle | produces-oracle | asserts-oracle 0.99 | produces-oracle 0.83 | ✅ conforms | recheck (mid confidence) |
| AC-32 | US-06 帳號裡已經有東西就不搬 | 只看到帳號那 1 個；瀏覽器的 3 個舊繪圖照樣記著 | app/domain/service/chart-drawing-service.ts:49-78 | chart-drawing-application.spec.ts:49-62 | asserts-oracle | produces-oracle | asserts-oracle 0.79 | produces-oracle 0.80 | ✅ conforms | recheck (mid confidence) |
| AC-33 | US-06 現貨與合約分開 | 不搬任何東西 | app/domain/service/chart-drawing-service.ts:49-78<br>app/infrastructure/proxy/device-chart-drawing-proxy.ts:36-45 | chart-drawing-application.spec.ts:63-76 | asserts-oracle | produces-oracle | asserts-oracle 0.99 | produces-oracle 0.57 | ✅ conforms | escalate (low confidence) |
| AC-34 | US-06 搬的時候連不上 | 圖上說「沒能把這台裝置上的舊繪圖存到帳號」，下次再試；舊繪圖照樣記著 | app/domain/service/chart-drawing-service.ts:49-78<br>app/composables/use-chart-drawing-board-sync.ts:114-150 | chart-drawing-application.spec.ts:77-89<br>use-chart-drawing-board-sync.spec.ts:134-143 | asserts-oracle | produces-oracle | asserts-oracle 0.96 | produces-oracle 0.96 | ✅ conforms | accept |
| AC-35 | US-06 帳號曾經存過、現在是空的就不搬 | 不搬任何東西 | app/domain/service/chart-drawing-service.ts:49-78 | chart-drawing-application.spec.ts:49-62 | asserts-oracle | produces-oracle | asserts-oracle 0.93 | produces-oracle 0.48 | ✅ conforms | escalate (low confidence) |
| AC-36 | US-07 帳號裡記著的顏色畫成調色盤上那一色 | 畫成調色盤上的青綠 | app/infrastructure/proxy/chart-drawing-board-proxy.ts:99-114<br>app/domain/models/vo/chart-drawing-color-vo.ts:1-40 | chart-drawing-board-proxy.spec.ts:45-62 | asserts-oracle | produces-oracle | asserts-oracle 0.99 | produces-oracle 0.96 | ✅ conforms | accept |
| AC-37 | US-07 改色後帳號記著新的顏色 | 帳號裡那條線記著靛 | app/infrastructure/proxy/chart-drawing-board-proxy.ts:51-70<br>app/domain/models/vo/chart-drawing-color-vo.ts:1-40 | chart-drawing-board-proxy.spec.ts:103-124 | asserts-oracle | produces-oracle | asserts-oracle 0.93 | produces-oracle 0.88 | ✅ conforms | accept |
| AC-38 | US-07 認不得的顏色 | 矩形畫成預設紫 | app/infrastructure/proxy/chart-drawing-board-proxy.ts:99-114<br>app/domain/models/domains/chart-drawing-domain.ts:30-47 | chart-drawing-board-proxy.spec.ts:72-80<br>chart-drawing-domain.spec.ts:80-100 | asserts-oracle | produces-oracle | asserts-oracle 0.95 | produces-oracle 0.49 | ✅ conforms | escalate (low confidence) |
| AC-39 | US-07 固定配色的繪圖 | 斐波那契回撤照固定配色畫 | app/domain/models/domains/fibonacci-retracement-domain.ts:1-27<br>app/domain/models/vo/fibonacci-ratio-vo.ts:1-30 | chart-drawing-application.spec.ts:192-202 | asserts-oracle | produces-oracle | asserts-oracle 0.96 | produces-oracle 0.99 | ✅ conforms | accept |

### 第一輪稽核後的修正

第一輪（參照行號在一次重構後已偏移）把 AC-9、AC-22、AC-39 判為 🟡 partial（沒有測試斷言該結果），AC-20、AC-29、AC-33 判為 🟠（測試只測到觸發、取消沒有確認畫面上仍在、只測了儲存分邊而沒測「不搬」）。
已補上對應測試（存進去之後上一步帳號也沒有它、沒有重讀時機就不讀、斐波那契固定配色、切回視窗出現別處加的線且上一步清空、取消後助手畫的仍在且帳號沒被動、只有合約舊繪圖時打開現貨不搬），本表是補完後以正確行號重跑的結果。

### Recheck notes

- **AC-19（Jev：diverges 0.32，低信心）**：重讀 `use-assistant-conversation.ts:357-361`——讀回前在寫、讀回後不在寫才記一筆；頁面把計數交給面板（`pages/k-candles/chart.vue`、`pages/contract-k-candles/chart.vue`），工作區的重讀訊號變動即重讀。對應的三個測試（答完記一筆、頁面交出計數、工作區重讀後出現助手畫的線）執行皆綠。Claude 的影子判定維持 produces-oracle；依規則狀態照 Jev 原樣記錄並列入 Needs James。
- 其餘 `escalate (low confidence)` 皆為 Jev 對跨檔程式路徑信心不足（`produces-oracle` 0.11～0.61），判定方向與影子判定一致；對應測試均執行為綠。

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| app/composables/use-chart-drawing-board-sync.ts:220-228 | 離開畫面（元件卸載）時把還在等的那一次存回送出 | undocumented（ARCH 已記；PRD 只寫了換一檔） |
| app/composables/use-chart-drawing-board-sync.ts:143-150 | 連著兩個重讀時機只排一次讀 | undocumented（效能，非業務行為） |
| app/domain/service/chart-drawing-service.ts:70-73 | 搬舊繪圖時遇到說不出原因的錯（非交易服務的拒絕或連不上）往上拋，整個讀算失敗 | undocumented |
| app/infrastructure/proxy/chart-drawing-board-proxy.ts:101 | 帳號回來的繪圖清單是空值時當成沒有繪圖 | undocumented（防禦性） |

沒有任何程式落在 Out of Scope（文字標註、即時推播、跨使用者分享、上一步跨裝置、指名移除、跳到問答）。

## Summary

- Conforms: 38/39 clauses ✅ (97%)
- Violations: AC-19（Jev 低信心判定；Claude 重讀與旁證測試皆認為符合，見 Recheck notes）
- Mis-asserted: —
- Partial: —
- Gaps: —
- Unclear: —
- Orphans: 4
- Jev: ran on 39 clauses
- Needs James: AC-1（low confidence）, AC-4（low confidence）, AC-7（low confidence）, AC-8（low confidence）, AC-9（low confidence）, AC-11（low confidence）, AC-13（low confidence）, AC-15（low confidence）, AC-16（low confidence）, AC-18（low confidence）, AC-19（violation）, AC-23（low confidence）, AC-30（low confidence）, AC-33（low confidence）, AC-35（low confidence）, AC-38（low confidence）
