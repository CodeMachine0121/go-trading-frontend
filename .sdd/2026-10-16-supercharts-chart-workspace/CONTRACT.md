# Contract Traceability Matrix — 看盤工作區（照 TradingView Supercharts）

Contract: PRD.md
Design map: ARCH.md
Implementation: `app/`（domain：chart-drawing／timeline／readout；molecules：ChartDrawing*、ChartLegend、KCandleChart*、SymbolSearch；organisms：KCandleChartWorkspace、ChartWorkspaceMenu、兩個面板；layouts/chart-workspace）
Oracle: Acceptance Criteria（89 個 Scenario，含追加的 US-12 成交量疊圖）＋ Business Rules（15）＋ NFR（3）

測試檔縮寫：
`WS` = tests/components/organisms/KCandleChartWorkspace.spec.ts ·
`LY` = tests/components/molecules/ChartDrawingLayer.spec.ts ·
`SP` = tests/components/organisms/KCandleChartPanel.spec.ts ·
`CP` = tests/components/organisms/KCandleContractChartPanel.spec.ts ·
`IN` = tests/components/organisms/KCandleChartPanelIndicators.spec.ts ·
`CO` = tests/components/organisms/KCandleChartPanelCoarseness.spec.ts ·
`LA` = tests/layouts/chart-workspace.spec.ts ·
`PG` = tests/pages/chart-pages.spec.ts、tests/pages/market-page-titles.spec.ts ·
`UC` = tests/composables/use-chart-drawings.spec.ts ·
`BD` = tests/domain/models/domains/chart-drawing-board-domain.spec.ts ·
`DR` = tests/domain/models/domains/chart-drawing-domain.spec.ts ·
`TL` = tests/domain/models/domains/k-candle-timeline-domain.spec.ts ·
`RD` = tests/domain/models/domains/chart-readout-domain.spec.ts ·
`ME` = tests/domain/models/domains/date-and-price-range-measurement-domain.spec.ts ·
`FB` = tests/domain/models/domains/fibonacci-retracement-domain.spec.ts ·
`PX` = tests/infrastructure/proxy/chart-drawing-preference-proxy.spec.ts ·
`KC` = tests/components/molecules/KCandleChart.spec.ts ·
`MOL` = tests/components/molecules/（ChartLegend／KCandleChartRangeBar／KCandleChartToolbar／SymbolSearch／ChartDrawingToolbar／ChartDrawingFloatingToolbar／ChartDrawingObjectTree）.spec.ts

## Clauses

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-01-1 | 寬螢幕上的行情圖表只剩四條細邊與圖 | 只有上左下右四條細邊與圖；沒有頁首、側欄、行情摘要、看什麼欄 | pages/k-candles/chart.vue（layout: chart-workspace）、layouts/chart-workspace.vue、KCandleChartWorkspace.vue | PG 標題…版型是 chart-workspace；LA 沒有頂欄與側欄；WS 四條細邊與圖都在 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01-2 | 合約行情圖表也是同一個版面 | 合約頁同樣只有四條細邊與圖 | pages/contract-k-candles/chart.vue | PG 合約 K 線圖表…chart-workspace | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01-3 | 從主選單去其他畫面 | 選單收起並換到策略腳本 | ChartWorkspaceMenu.vue（NuxtLink @click close） | LA 選一個去處：主選單收起 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01-4 | 其他畫面的版面不變 | 策略腳本等畫面仍有頁首與側欄 | layouts/console.vue（未改行為） | PG 瀏覽頁版型是 console；tests/layouts/console.spec.ts | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01-5 | 點主選單外面就收起 | 選單收起、畫面沒換 | ChartWorkspaceMenu backdrop | LA 點選單外面 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01-6 | 主選單裡找得到共用設定 | 每個去處、語言、時區、外觀、助手、連線狀態、帳號都在 | layouts/chart-workspace.vue | LA 打開主選單…／主選單裡有共用設定與連線燈 | asserts-oracle（契約檢查後補上語言、時區、外觀、帳號） | produces-oracle | ✅ conforms |
| AC-02-1 | 按交易標的打開商品搜尋並選一檔 | 搜尋收起、換成 ETHUSDT、看的那一段不變 | SymbolSearch.vue、SymbolField(search) | MOL SymbolSearch 上下鍵挑、Enter 選定／選定之後收起來；SP 換交易標的就重新取，正在看的那一段不變 | asserts-oracle（契約檢查後改成比對顯示區間兩端；原本比的是不存在的欄位） | produces-oracle | ✅ conforms |
| AC-02-2 | 在圖上直接打字打開商品搜尋 | 打開搜尋，框裡是「E」 | KCandleChartWorkspace onKeydown → typeToSearch → SymbolField.openSearch | SP／CP 在圖上直接打字；WS 打一個英文字母 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02-3 | 商品搜尋找不到 | 寫「找不到這個代號」 | SymbolSearch.vue | MOL SymbolSearch 找不到時說找不到 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02-4 | 現貨／合約切換 | 按「合約」換到合約行情圖表 | pages/*/chart.vue `#market` → MarketSwitch | PG 上方細邊有現貨／合約開關，按下去換到另一邊；WS 四條細邊…（market slot） | asserts-oracle（契約檢查後補上頁面測試） | produces-oracle | ✅ conforms |
| AC-02-5 | 彙總刻度直接挑 | 每根 15 分鐘、那一顆亮、看的那一段不變 | KCandleChartToolbar.vue | CO 挑一種粗細就重新取…／換一種粗細時看的那一段不變；MOL KCandleChartToolbar 選著的就是目前那一個 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02-6 | 換畫法 | 改畫成面積、不重新取 | KCandleChartToolbar、KCandleChart seriesFor.area | SP 換畫法不重新取（面積）；KC 畫法是 area 時建的是 AreaSeries | asserts-oracle（契約檢查後由曲線改成面積） | produces-oracle | ✅ conforms |
| AC-02-7 | 現貨打開指標對話框 | 對話框列出畫得出來的策略腳本與已套用的指標 | KCandleChartWorkspace AppModal + ChartIndicatorPanel | WS 按指標：打開…；IN 全套（先打開對話框） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02-8 | 合約打開指標對話框 | 寫「合約圖表目前沒有指標可套用」 | KCandleContractChartPanel `#indicators` | CP 常駐一句話只說還沒有的 | asserts-oracle | produces-oracle（契約檢查前說的是「合約圖表沒有指標。」，已改） | ✅ conforms |
| AC-02-9 | 會收盤的市場才有立刻補齊 | 有「立刻補齊」按鈕 | KCandleChartPanel `#topBarEnd` canCatchUp | SP 立刻更新（catch-up-button 存在） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02-10 | 不會收盤的市場沒有立刻補齊 | 沒有那顆按鈕 | 同上 | SP 立刻更新（不存在） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03-1 | 十字線停在一根跌的 K 線上 | 那一根的開高低收、跌的顏色、相對前一根收盤的差 | ChartReadoutDomain、ChartLegend | RD 停在一根跌的上面；MOL ChartLegend 第一行（data-tone=danger） | asserts-oracle（契約檢查後補上顏色） | produces-oracle | ✅ conforms |
| AC-03-2 | 十字線移出圖 | 說最新那一根 | ChartReadoutDomain（null） | RD 十字線在 null | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03-3 | 十字線停在右側留白 | 說最新那一根 | ChartReadoutDomain（超出最後一根） | RD 十字線在 5 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03-4 | 合約圖例的第二行 | 標記價格寫數字、溢價指數寫「—」、寫出記錄時刻 | KCandleContractChartPanel `#legendExtra` | CP 圖例第二行的標記價格…／那三條說出自己是哪一根的 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03-5 | 在圖例上收起一個指標 | 線從圖上消失、那一行變淡、仍在已套用清單 | ChartLegend → useChartIndicators.toggleAppliedIndicatorVisibility | IN 在圖例上按「在圖上收起來」 | asserts-oracle（契約檢查後補上） | produces-oracle | ✅ conforms |
| AC-04-1 | 價格軸上的最新價 | 最新價在漲色標籤上、下面是收盤倒數 | 函式庫的最新價標籤＋ChartDrawingLayer 倒數標籤 | LY 收盤倒數的標籤用最新那一根的漲跌色；LY 最新價下面寫收盤倒數；RD 收盤倒數 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04-2 | 按快捷區間 | 圖換成那一段、那一顆亮 | KCandleChartRangeBar | SP 列出快捷區間…；MOL RangeBar 按下的那一個快捷區間亮著 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04-3 | 自己拖動之後快捷區間不亮 | 沒有任何一顆亮 | KCandleChartPanel.showRange（activePreset = null） | SP 按下快捷區間那一個亮起來；自己拖動之後沒有任何一個亮著 | asserts-oracle（契約檢查後補上） | produces-oracle | ✅ conforms |
| AC-04-4 | 對數刻度 | 價格軸改成對數、「對數」亮 | KCandleChartRangeBar → KCandleChart priceScaleMode | WS 下方細邊換成對數；KC 價格軸改成 logarithmic | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04-5 | 百分比刻度 | 改寫成相對最左邊那一根的百分比 | KCandleChart（PriceScaleMode.Percentage） | KC 價格軸改成 percentage；MOL RangeBar | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04-6 | 雙擊價格軸恢復自動縮放 | 回到自動縮放、「自動」亮 | KCandleChart reportAutoScale（dblclick） | KC 自動縮放關著時雙擊價格軸；WS 使用者拖了價格軸… | asserts-oracle（契約檢查後補上雙擊那一邊） | produces-oracle | ✅ conforms |
| AC-04-7 | 看得到最新那一根時沒有跳到最新 | 沒有那顆按鈕 | KCandleChartWorkspace latestVisible | WS 最新那一根離開畫面…（之前不存在） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04-8 | 往回拖之後出現跳到最新 | 出現那顆按鈕 | KCandleChart reportLatestVisibility | KC 往回拖到它離開畫面時說看不到；WS 同上 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04-9 | 按跳到最新 | 回到看得到最新那一根、右側照樣留白 | 兩個面板 jumpToLatest → 既有顯示區間規則 | SP／CP 按「跳到最新」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05-1 | 即時更新停了 | 上緣中間浮出那一句、圖不動 | KCandleChartWorkspace `__notices`（絕對定位，上緣中間） | WS 狀態說明浮在圖上；SP live-update-stalled（LiveUpdates） | shallow（位置與「不推動圖」只在樣式裡，單元測試看不到） | produces-oracle（契約檢查前放在下緣，已改回上緣） | ❔ unclear |
| AC-05-2 | 一次都還沒取到就連不上後端 | 圖的位置寫本來會有一張圖、提示寫連不上並給重試 | 面板 `#empty`、KCandleChartNotices | SP 一次都還沒取到就連不上後端…；SP 連不上後端時告知並提供重試 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05-3 | 這一段查無 K 線 | 寫「查無 K 線」 | 面板 `#empty` | SP／CP 這段區間內沒有任何 K 線時說「查無 K 線」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06-1 | 按住拖曳畫一條趨勢線 | A 到 B 一條線、被選取、回到游標 | ChartDrawingLayer → useChartDrawings.finishDrawing | LY 選了趨勢線、按住從 A 拖到 B；UC 畫完一個；WS 畫完一個 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06-2 | 點兩下畫一條趨勢線 | A 到 B 一條線 | ChartDrawingLayer awaitingSecondPoint | LY 點一下、移動、再點一下 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06-3 | 拖得太短視為點一下 | 還沒完成，等第二下 | CLICK_DISTANCE_PIXELS | LY 拖不到 5 像素就放開 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06-4 | 畫到一半按 Esc | 什麼都沒留下、回到游標 | Workspace Esc → returnToCursor；Layer 丟掉半成品 | LY 畫到一半換了工具…；WS ⌥H…Esc 回到游標 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06-5 | 點一下畫好水平線 | 出現 60000 的線、價格軸常駐 60000 | ChartDrawingLayer（一點即完成、軸標籤） | LY 水平線點一下就畫好；LY 水平線在價格軸上常駐它的價格 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06-6 | 連續繪圖 | 工具仍是矩形 | useChartDrawings.finishDrawing | UC 開著連續繪圖 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06-7 | 同類工具收在一格、記得上次用的 | 那一格換成垂直線並被選用 | useChartDrawings.pickTool、ChartDrawingToolbar | UC 展開「線」那一格選垂直線；MOL ChartDrawingToolbar 五格依序排開… | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06-8 | 磁鐵模式吸到最近的價格 | 落點 105 | KCandleTimelineDomain.alignAnchor | TL 開著磁鐵…；LY 開著磁鐵 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06-9 | 磁鐵模式在空白處不吸 | 落點就是指到的價格 | 同上 | TL 開著磁鐵、落在最新那一根右邊的空白 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06-10 | 沒開磁鐵模式 | 落點 104.8 | 同上 | TL 沒開磁鐵 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06-11 | 日期與價格範圍往上量 | 藍色、「10（10.00%）」、「24 根，1 天」、成交量合計 | DateAndPriceRangeMeasurementDomain、Layer painter | ME 從 100 量到 110…；LY 日期與價格範圍在框外寫… | asserts-oracle（價格照價格軸格式寫成兩位小數、半形括號——同一句話的寫法，不是另一個數） | produces-oracle | ✅ conforms |
| AC-06-12 | 日期與價格範圍往下量 | 紅色、負價差與負百分比 | 同上 | ME 從 110 量到 99；LY 往下量時價差帶負號 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06-13 | 日期與價格範圍兩點同一根 | 0 根、經過 0 分 | 同上 | ME 兩點在同一根上 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06-14 | 斐波那契回撤的各條 | 0=200、1=100、0.5=150、0.618=138.2，左側比例（價格） | FibonacciRetracementDomain、Layer painter | FB 從 100 拉到 200；LY 斐波那契回撤左側寫「比例（價格）」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06-15 | 斐波那契回撤兩點同價 | 七條同價、照常畫 | 同上 | FB 兩點同價 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06-16 | 手機上用手指畫 | A 到 B 一條線 | ChartDrawingLayer（pointer 事件涵蓋觸控） | LY 手機上用手指按住拖曳 | asserts-oracle（契約檢查後補上） | produces-oracle | ✅ conforms |
| AC-07-1 | 點一條線選取它 | 兩端把手、兩軸色帶、浮動工具列 | ChartDrawingLayer paint、Workspace | LY 選取中的趨勢線：兩端畫出把手…色帶；LY 游標狀態點那條線；WS 從物件樹選取一個：浮動工具列出現 | asserts-oracle（契約檢查後補上把手與色帶） | produces-oracle | ✅ conforms |
| AC-07-2 | 點空白處取消選取 | 沒有選取、浮動工具列消失 | ChartDrawingLayer emit select(null) | LY 點空白處：有選取時取消選取 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-07-3 | 拖矩形右邊的中點 | 只有右邊往右移 | ChartDrawingLayer handlesOf | LY 拖選取中矩形右邊的中點往右 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-07-4 | 整個移動 | 兩端一起往上移同樣距離 | ChartDrawingLayer reshape（整個移動） | LY 拖那條線往上 50 像素、往右兩根 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-07-5 | 改線色、線寬、線型 | 變紅、粗一級、虛線 | ChartDrawingFloatingToolbar → ChartDrawingDomain.applied | MOL FloatingToolbar 按…交出…／調色盤挑紅色；DR 線寬…／線型…／換成紅色；WS 按線寬就換一級 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-07-6 | 鎖定的繪圖改不動 | 它不動、圖也沒被拖動 | ChartDrawingLayer movable、claim | LY 鎖定的那一條：點得到、拖不動（含 defaultPrevented）；DR 鎖定的繪圖換不了錨點 | asserts-oracle（契約檢查後補上「圖也沒被拖動」） | produces-oracle | ✅ conforms |
| AC-07-7 | 鎖定所有繪圖 | 繪圖不動 | ChartDrawingLayer lockAllDrawings | LY 開著鎖定所有繪圖 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-07-8 | 隱藏所有繪圖 | 什麼都沒選到、關掉後回來 | useChartDrawings.shownDrawings | UC 隱藏所有 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-07-9 | 刪除選取中的繪圖 | 那條線消失 | Workspace onKeydown Delete | WS Delete 刪除選取中的那一個 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-07-10 | 物件樹列出所有繪圖 | 矩形在上、每列可選取／顯示隱藏／刪除 | ChartDrawingObjectTree | MOL ObjectTree 新畫的在上／按…交出那一列；WS 從物件樹隱藏一個… | asserts-oracle | produces-oracle | ✅ conforms |
| AC-07-11 | 物件樹沒有繪圖 | 寫「圖上還沒有繪圖」並說怎麼畫 | ChartDrawingObjectTree | MOL ObjectTree 沒有繪圖 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-08-1 | 上一步復原剛畫的 | 那條線消失 | ChartDrawingBoardDomain.undone | BD 上一步；UC 刪除一個之後上一步… | asserts-oracle | produces-oracle | ✅ conforms |
| AC-08-2 | 下一步重做 | 那條線回來 | redone | BD 下一步 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-08-3 | 上一步之後又修改就不能下一步 | 下一步按不了 | steppedTo 清空下一步 | BD 上一步之後又畫了一個 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-08-4 | 移除所有繪圖可以復原 | 全部消失、提示可復原、上一步全部回來 | removedAll、Workspace toast | BD 移除所有；WS 移除所有：提示… | asserts-oracle | produces-oracle | ✅ conforms |
| AC-08-5 | 沒有繪圖時移除所有繪圖 | 提示「圖上沒有繪圖」、不多一步 | removedAll（交回自己） | BD 一個都沒有時移除所有；WS 一個都沒有時移除所有 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-08-6 | 換一檔之後紀錄從頭開始 | 上一步按不了 | useChartDrawings watch(symbol) | UC 換到 ETHUSDT | asserts-oracle | produces-oracle | ✅ conforms |
| AC-09-1 | 換刻度繪圖不跑掉 | 那條線還在 60000 | 錨點存時間＋價格、KCandleTimelineDomain.logicalIndexOf | TL %s 落在第 %s 根（含五分鐘換一小時）；DR 放到圖上 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-09-2 | 換到別檔看不到 | 看不到那條線 | ChartDrawingPreferenceProxy（市場:標的） | PX 合約與現貨分開；別檔也分開；UC 換到 ETHUSDT | asserts-oracle | produces-oracle | ✅ conforms |
| AC-09-3 | 換回來還在 | 那條線還在 | 同上 | PX 寫一檔不會蓋掉另一檔 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-09-4 | 現貨與合約的繪圖分開 | 看不到那條線 | 同上 | PX 合約與現貨分開 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-09-5 | 關掉瀏覽器再打開還在 | 那條線還在 | 同上（localStorage） | PX 寫進現貨 BTCUSDT 的讀得回來 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-09-6 | 瀏覽器不允許記東西 | 照樣畫得出來 | Proxy 吞掉寫入例外 | PX 瀏覽器擋掉儲存 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-09-7 | 端點落在已取回區間之前 | 第一點仍在那個時間上 | KCandleTimelineDomain（往前推算） | TL 第 -1 根／09:30 落在第 -1 根 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-10-1 | ⌥H 換成水平線 | 工具換成水平線 | Workspace → pickToolByShortcut | WS ⌥H 換成水平線；UC ⌥H | asserts-oracle | produces-oracle | ✅ conforms |
| AC-10-2 | 快捷鍵不搶輸入框 | 刪的是字、繪圖還在 | Workspace shortcutsSuspended | WS 有繪圖選取著、正在搜尋框裡打字時按 Delete | asserts-oracle（契約檢查後補上 Delete） | produces-oracle | ✅ conforms |
| AC-10-3 | ⌘Z 上一步 | 那條線消失 | Workspace onKeydown | WS ⌘Z 上一步、⌘⇧Z 下一步 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-11-1 | 手機上的上方細邊 | 只有主選單、交易標的、目前刻度、畫法、指標；左右細邊收起、有鉛筆 | Workspace／Toolbar 的 respond-to('md') 樣式 | —（樣式；以 390 寬截圖人工確認） | no-test | unclear | ❔ unclear |
| AC-11-2 | 手機上叫出繪圖工具 | 按鉛筆展開、選工具後收起 | Workspace drawingToolsOpen | WS 在手機上按鉛筆 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12-1 | 一進來就看得到成交量 | 底部約五分之一高的量柱、漲淡漲色跌淡跌色、圖例多一行 Vol | KCandleChart 成交量序列（priceScale `volume` 上留 0.8）、ChartLegend Vol 列 | KC 每一根一根量柱…；WS 一進來成交量是開的 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12-2 | 圖例寫十字線那一根的量 | 1234.5 寫「1.23K」 | ChartReadoutDomain.volumeText | RD 成交量 1234.5 寫成「1.23K」；MOL ChartLegend Vol 那一行寫那一根的量；WS 十字線停在第 0 根：Vol… | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12-3 | 量的寫法 | 999.46、1.50K、2.50M、3.20B（另含剛好 1000 → 1.00K） | 同上 | RD 成交量怎麼寫 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12-4 | 十字線不在圖上時說最新那一根的量 | 最新那一根的量 | 同上 | RD 十字線不在圖上時寫最新那一根的量 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12-5 | 在圖例上把成交量收起來 | 量柱消失、那一行變淡；再按就回來 | Workspace volumeShown、KCandleChart showsVolume | WS 在圖例上收起來…再按一次回來；KC 收起來就把那一條藏起來；MOL ChartLegend 收起來時那一行說的是「在圖上顯示」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12-6 | 換彙總刻度時量跟著換 | 量柱是每根五分鐘那一根的量 | KCandleChart drawKCandles（量與 K 線取自同一批） | KC 每一根一根量柱（量來自圖上那一批）；CO 換一種粗細就重新取 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-1 | 繪圖屬於「現貨或合約＋交易標的」 | 換一邊或一檔就是另一份 | Proxy 鍵、useChartDrawings | PX、UC | asserts-oracle | produces-oracle | ✅ conforms |
| BR-2 | 錨點＝起始時間＋價格；右側留白對齊到之後那一根 | 換刻度時間不變；空白處推算之後的起始時間 | ChartDrawingAnchorVo、KCandleTimelineDomain | TL | asserts-oracle | produces-oracle | ✅ conforms |
| BR-3 | 磁鐵：在 K 線上吸到最近的開高低收，留白不吸 | 同上 | alignAnchor | TL | asserts-oracle | produces-oracle | ✅ conforms |
| BR-4 | 一點的工具與兩點的工具 | 水平線／水平射線／垂直線一點即完成 | CHART_DRAWING_KINDS、Layer | LY 水平線點一下就畫好 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-5 | 點一下的分界 5 像素 | 移動 <5 算點一下 | CLICK_DISTANCE_PIXELS | LY 拖不到 5 像素 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-6 | 斐波那契比例與公式 | 第二點＋(第一點−第二點)×比例 | FibonacciRetracementDomain | FB | asserts-oracle | produces-oracle | ✅ conforms |
| BR-7 | 範圍說明的公式與顏色 | 價差、兩位百分比、根數、天時分、量合計、藍／紅 | DateAndPriceRangeMeasurementDomain | ME | asserts-oracle | produces-oracle | ✅ conforms |
| BR-8 | 預設樣式；線寬 1→4 循環；線型三種循環 | 趨勢線藍 2、水平線藍 1、矩形紫 1；固定配色兩種不能改 | CHART_DRAWING_KINDS、ChartDrawingDomain | DR 改樣式；tests/application/chart-drawing-application.spec.ts 畫一個新的（矩形紫、線寬 1） | asserts-oracle（趨勢線預設線寬 2 由 DR「線寬不是整數時退回預設」間接釘住） | produces-oracle | ✅ conforms |
| BR-9 | 每一步的定義、上限 100、新的一步清空下一步、換檔清空 | 只選取／換工具／開關不算一步 | ChartDrawingBoardDomain、useChartDrawings | BD（含 100 步、換成一模一樣的錨點不多一步）；UC；LY 點一下沒有拖 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-10 | 鎖定所有／隱藏所有不改繪圖、不算一步、換頁回到關閉 | 同上 | useChartDrawings（畫面狀態，不留存） | UC 隱藏所有 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-11 | 彙總刻度五顆全部排出、沒有「更多」 | 自動、1分、5分、15分、1時 | KCandleChartToolbar | MOL KCandleChartToolbar 照給它的那份清單排出每一顆 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-12 | 快捷區間亮到自己拖動或縮放為止 | 同 AC-04-3 | KCandleChartPanel.showRange | SP 快捷區間的亮與不亮 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-13 | 畫到一半換標的、換刻度、Esc：丟掉不留存 | 半成品不進板子 | Layer watch(activeDrawingKind)；KCandleChart 重建時 Layer 一起重掛 | LY 畫到一半換了工具 | asserts-oracle（換標的／換刻度那兩條由「圖換一批就重掛繪圖層」保證，沒有獨立測試） | produces-oracle | ✅ conforms |
| BR-14 | 兩則浮動提示同時存在時即時更新那一則在上 | 即時更新在上、其次是錯誤或載入中 | KCandleChartNotices（順序） | tests/components/molecules/KCandleChartNotices.spec.ts 即時更新的那一句與載入中同時存在 | asserts-oracle（契約檢查後補上） | produces-oracle | ✅ conforms |
| BR-15 | 成交量的寫法；疊圖一進畫面是開的、收起來不留存、現貨與合約都有 | 同上 | ChartReadoutDomain、Workspace volumeShown（畫面狀態） | RD；WS | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-1 | 拖動、縮放、畫線跟手；100 個以內不卡頓 | 互動時不延遲 | Layer 只在畫面簽章變了才重畫 | — | no-test | unclear | ❔ unclear |
| NFR-2 | Chrome／Safari／Firefox、最窄 390、觸控可畫、亮暗兩色 | 都能用 | tokens 兩組、pointer 事件 | LY 手指；截圖人工確認亮暗與 390 | shallow | unclear | ❔ unclear |
| NFR-3 | 繪圖只記在這個瀏覽器 | 不送後端 | ChartDrawingPreferenceProxy（只有 localStorage） | PX | asserts-oracle | produces-oracle | ✅ conforms |

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| ContractSymbolField.vue、KCandleContractChartPanel chartTitle | 合約代號後面加上 `.P`（TradingView 的永續合約寫法） | undocumented — 照設計稿；PRD 沒有寫，建議補進 UL-MAP「合約標的」的畫面說法 |
| ChartDrawingFloatingToolbar 調色盤 | 十二色調色盤（TradingView 那一排） | undocumented — PRD 只說「線色」，沒有列出可選顏色 |
| KCandleChart cursorStyle | 「點」游標畫一個點、「箭頭」游標不畫十字線 | 對應 BRIEF 的游標三種，PRD 只列在工具格裡；屬於已同意的範圍 |

沒有任何程式碼實作 Out of Scope 項目（文字標註、多頭／空頭部位、自選清單、跨裝置同步、多圖、警示、重播都沒有）。

## Summary

- Conforms: 102/107 clauses ✅ (95%)
- Violations: 無（契約檢查時的 AC-05-1 提示位置與 AC-02-8 措辭已修正）
- Mis-asserted: 無（BR-14 的先後順序已補上斷言）
- Partial: 無
- Gaps: 無
- Unclear: AC-05-1（位置只在樣式裡）、AC-11-1（手機細邊只在樣式裡）、NFR-1、NFR-2 —— 以 390／1440 寬、亮暗兩色的截圖人工確認過，單元測試看不到樣式
- Orphans: 3

> 這是一份靜態的符合度稽核：拿 PRD 的驗收條件當答案，逐條判斷測試斷言與程式路徑，不靠跑整套測試的紅綠下結論。
