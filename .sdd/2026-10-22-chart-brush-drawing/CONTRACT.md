# Contract Traceability Matrix — chart-brush-drawing

Contract: PRD.md
Design map: ARCH.md
Implementation: `app/` (go-trading-frontend, branch `feature/chart-brush-drawing`)
Oracle: Acceptance Criteria (26) + Core Business Rules (8) + Non-Functional Requirements (2) — 36 clauses

> Static conformance audit: test assertions and code paths are judged against the oracle derived from the PRD,
> not by running the full suite. Only the single test mapped to a clause was run as corroboration.

## Clauses

`Test audit` / `Code audit` are Claude's shadow verdict, recorded before Jev ran. `Jev test` / `Jev code` are Jev's pick
with its confidence. `Status` and `Route` come from `jev_audit.py` as returned.

AC-17, AC-18 and AC-22 were first audited as 🟠 mis-asserted (no brush-specific style test, the selection halo was not asserted,
no read-back round trip). The tests were added (style change on a brush, halo line widths, proxy save/read of off-candle instants)
and the three clauses re-audited; their rows show the re-audit. Clauses first audited against stale line ranges
(AC-1, AC-2, AC-3, AC-10, AC-15, AC-21, AC-26, BR-2, BR-3, BR-8) were re-audited with corrected ranges; rows show the re-audit.

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Jev test | Jev code | Status | Route |
|----|--------|------------------------|------|------|------------|------------|----------|----------|--------|-------|
| AC-1 | 選了奇異筆畫一個圈 → 多一筆橘色、線寬 2、實線、被選取、多一步、存到帳號 | 拖曳結束交出 kind=brush 繪圖；預設色 --color-drawing-orange、線寬 2、solid；收進板子後被選取、canUndo、存回帳號送出 brush | ChartDrawingLayer.vue:257-290<br>ChartDrawingLayer.vue:368-415<br>chart-drawing-service.ts:128-142<br>use-chart-drawings.ts:118-140<br>chart-drawing-kind-vo.ts:70-74 | ChartDrawingLayer.spec.ts:658-681<br>chart-drawing-application.spec.ts:255-289<br>use-chart-drawings.spec.ts:108-117 | asserts-oracle | produces-oracle | asserts-oracle 0.44 | produces-oracle 0.68 | ✅ conforms | escalate (low confidence) |
| AC-2 | 奇異筆自己一格，排在形狀之後、測量之前，沒有快捷鍵 | 工具格順序 cursor,lines,fibonacci,shapes,brush,measure；brush 格只有 brush 一個工具、shortcutLabel null | chart-drawing-kind-vo.ts:56-101<br>chart-drawing-service.ts:192-204 | chart-drawing-application.spec.ts:213-230 | asserts-oracle | produces-oracle | asserts-oracle 0.45 | produces-oracle 0.81 | ✅ conforms | escalate (low confidence) |
| AC-3 | 點一下沒拖不留東西、不多一步 | 按下放開同一點：不交出 finish（草稿只有一個點）；圖恢復可拖動 | ChartDrawingLayer.vue:257-290<br>ChartDrawingLayer.vue:404-415<br>freehand-stroke-domain.ts:16-24<br>chart-drawing-service.ts:128-142 | ChartDrawingLayer.spec.ts:682-690 | asserts-oracle | produces-oracle | asserts-oracle 0.67 | produces-oracle 0.31 | ✅ conforms | escalate (low confidence) |
| AC-4 | 連續繪圖關著，畫完回到游標 | finishDrawing 後 activeDrawingKind 為 null | use-chart-drawings.ts:118-140 | use-chart-drawings.spec.ts:88-96 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.93 | ✅ conforms | accept |
| AC-5 | 連續繪圖開著，畫完仍是奇異筆 | 畫完一筆 brush 後 activeDrawingKind 仍為 brush | use-chart-drawings.ts:118-140 | use-chart-drawings.spec.ts:108-117 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.96 | ✅ conforms | accept |
| AC-6 | 磁鐵模式對奇異筆無效 | 磁鐵開著，從高點 905 附近的 904 畫：第一點價格 904 不是 905 | ChartDrawingLayer.vue:122-128<br>k-candle-timeline-domain.ts:99-106 | ChartDrawingLayer.spec.ts:691-697 | asserts-oracle | produces-oracle | asserts-oracle 0.96 | produces-oracle 0.93 | ✅ conforms | accept |
| AC-7 | 畫到一半按 Esc → 這一筆丟掉 | 畫到一半工具變回游標後放開：不交出 finish | ChartDrawingLayer.vue:86-96 | ChartDrawingLayer.spec.ts:699-710 | asserts-oracle | produces-oracle | asserts-oracle 0.91 | produces-oracle 0.72 | ✅ conforms | recheck (mid confidence) |
| AC-8 | 經過兩根之間的地方也畫在兩根之間 | 點記成那一根裡的那一刻（第 10.5 根 = 10:10:30），不對齊到整根；畫成平順曲線 | k-candle-timeline-domain.ts:72-106<br>ChartDrawingLayer.vue:620-641 | ChartDrawingLayer.spec.ts:673-681<br>k-candle-timeline-domain.spec.ts:53-73 | asserts-oracle | produces-oracle | asserts-oracle 0.61 | produces-oracle 0.83 | ✅ conforms | recheck (mid confidence) |
| AC-9 | 換每根涵蓋的時間，筆跡仍在原本那一刻 | 一小時圖 10:20 的點在五分鐘圖落在 10:20 那一根（序位 4） | k-candle-timeline-domain.ts:72-106<br>chart-drawing-domain.ts:128-142 | k-candle-timeline-domain.spec.ts:74-80 | asserts-oracle | produces-oracle | asserts-oracle 0.95 | produces-oracle 0.71 | ✅ conforms | recheck (mid confidence) |
| AC-10 | 縮放與平移後形狀不變 | 每一點以時間與價格留存，放到圖上時依時間算小數序位，畫面依序位與價格換算位置 | chart-drawing-domain.ts:128-142<br>k-candle-timeline-domain.ts:72-106 | chart-drawing-domain.spec.ts:176-192 | asserts-oracle | produces-oracle | asserts-oracle 0.25 | produces-oracle 0.83 | ✅ conforms | escalate (low confidence) |
| AC-11 | 很長的一筆最多留 200 個點，頭尾在 | 精簡後超過 200 時恰好 200 個，第一與最後一點保留 | freehand-stroke-domain.ts:25-68<br>chart-drawing-service.ts:128-142 | freehand-stroke-domain.spec.ts:31-44 | asserts-oracle | produces-oracle | asserts-oracle 0.92 | produces-oracle 0.72 | ✅ conforms | recheck (mid confidence) |
| AC-12 | 幾乎是直線的筆跡只留很少的點 | 偏離不到 1 像素的筆跡只留頭尾兩點 | freehand-stroke-domain.ts:25-68 | freehand-stroke-domain.spec.ts:13-30 | asserts-oracle | produces-oracle | asserts-oracle 0.87 | produces-oracle 0.73 | ✅ conforms | recheck (mid confidence) |
| AC-13 | 拖到零以下的點略過 | 價格 ≤ 0 的點不在筆跡裡；存下價格都大於零 | freehand-stroke-domain.ts:16-24 | freehand-stroke-domain.spec.ts:45-58 | asserts-oracle | produces-oracle | asserts-oracle 0.96 | produces-oracle 0.77 | ✅ conforms | recheck (mid confidence) |
| AC-14 | 點在筆跡旁邊選取它 | 點在任一段旁幾像素內選取那一筆；浮動工具列寫「奇異筆」 | ChartDrawingLayer.vue:178-188 | ChartDrawingLayer.spec.ts:720-738<br>chart-drawing-domain.spec.ts:157-164 | asserts-oracle | produces-oracle | asserts-oracle 0.84 | produces-oracle 0.72 | ✅ conforms | recheck (mid confidence) |
| AC-15 | 點在圈的中間選不到 | 點在圈內正中央（離每一段都遠）不選取 | ChartDrawingLayer.vue:139-147<br>ChartDrawingLayer.vue:165-209 | ChartDrawingLayer.spec.ts:739-750 | asserts-oracle | produces-oracle | asserts-oracle 0.88 | diverges 0.21 | 🔴 violation | escalate (violation) |
| AC-16 | 整筆拖動，放開才多一步 | 拖動放開後交出一次 change，所有點平移同樣根數與價格，形狀不變 | ChartDrawingLayer.vue:330-356<br>chart-drawing-service.ts:175-186 | ChartDrawingLayer.spec.ts:751-762<br>chart-drawing-application.spec.ts:291-306 | asserts-oracle | produces-oracle | asserts-oracle 0.97 | produces-oracle 0.75 | ✅ conforms | recheck (mid confidence) |
| AC-17 | 改線色、線寬、線型 | 奇異筆改藍色、線寬 4、虛線後就是那個樣子 | chart-drawing-domain.ts:87-128<br>chart-drawing-kind-vo.ts:70-74 | chart-drawing-domain.spec.ts:165-175 | asserts-oracle | produces-oracle | asserts-oracle 0.99 | produces-oracle 0.12 | ✅ conforms | escalate (low confidence) |
| AC-18 | 沒有逐點的把手，選取時畫得比平常醒目 | 選取中的奇異筆不畫把手（圓）；底下多畫一道較寬淡色光暈（選取時多一筆線寬 8 的線，沒選取時沒有） | ChartDrawingLayer.vue:211-218<br>ChartDrawingLayer.vue:704-722 | ChartDrawingLayer.spec.ts:553-563<br>ChartDrawingLayer.spec.ts:751-783 | asserts-oracle | produces-oracle | asserts-oracle 0.85 | diverges 0.36 | 🔴 violation | escalate (violation) |
| AC-19 | 鎖定的奇異筆拖不動 | 鎖定時點得到但位置不變 | ChartDrawingLayer.vue:320-334<br>chart-drawing-domain.ts:90-104 | ChartDrawingLayer.spec.ts:239-250 | asserts-oracle | produces-oracle | asserts-oracle 0.89 | produces-oracle 0.83 | ✅ conforms | recheck (mid confidence) |
| AC-20 | 上一步與下一步 | 上一步那一筆消失，下一步回來 | chart-drawing-board-domain.ts:30-75 | chart-drawing-board-domain.spec.ts:27-40 | asserts-oracle | produces-oracle | asserts-oracle 0.99 | produces-oracle 0.69 | ✅ conforms | recheck (mid confidence) |
| AC-21 | 出現在物件樹 | 物件樹每一列寫繪圖的種類名稱；奇異筆的種類名稱是「奇異筆」；每一列有隱藏與刪除 | ChartDrawingObjectTree.vue:110-170<br>chart-drawing-domain.ts:150-162 | chart-drawing-domain.spec.ts:157-164<br>ChartDrawingObjectTree.spec.ts:12-42 | asserts-oracle | produces-oracle | asserts-oracle 0.45 | produces-oracle 0.27 | ✅ conforms | escalate (low confidence) |
| AC-22 | 另一台電腦看到同一筆 | 存回帳號時送出 brush 與每一點的時間價格原樣，讀回來時間價格一樣 | chart-drawing-board-proxy.ts:43-112 | chart-drawing-board-proxy.spec.ts:125-143 | asserts-oracle | produces-oracle | asserts-oracle 0.88 | produces-oracle 0.73 | ✅ conforms | recheck (mid confidence) |
| AC-23 | 沒超過上限照收（3800+150） | 收下，共 3950 點 | chart-drawing-board-domain.ts:30-42 | chart-drawing-board-domain.spec.ts:273-300 | asserts-oracle | produces-oracle | asserts-oracle 0.99 | produces-oracle 0.67 | ✅ conforms | recheck (mid confidence) |
| AC-24 | 剛好到上限照收（3800+200） | 收下，剛好 4000 點 | chart-drawing-board-domain.ts:30-42 | chart-drawing-board-domain.spec.ts:273-300 | asserts-oracle | produces-oracle | asserts-oracle 1.00 | produces-oracle 0.97 | ✅ conforms | accept |
| AC-25 | 超過上限不收（3900+150） | 不收；提示「這張圖上的繪圖點數已達上限，請先移除一些繪圖」；不多一步 | chart-drawing-board-domain.ts:30-42<br>use-chart-drawings.ts:118-140 | chart-drawing-board-domain.spec.ts:273-310<br>use-chart-drawings.spec.ts:119-135 | asserts-oracle | produces-oracle | asserts-oracle 0.93 | produces-oracle 0.67 | ✅ conforms | recheck (mid confidence) |
| AC-26 | 已在上限時連一條趨勢線也不收 | 4000 點時畫趨勢線：不收、提示「這張圖上的繪圖點數已達上限，請先移除一些繪圖」 | chart-drawing-board-domain.ts:30-42<br>use-chart-drawings.ts:118-140<br>chart-drawing-board-anchor-capacity-error.ts:1-12 | chart-drawing-board-domain.spec.ts:273-310<br>use-chart-drawings.spec.ts:119-135 | asserts-oracle | produces-oracle | asserts-oracle 0.99 | produces-oracle 0.87 | ✅ conforms | accept |
| BR-1 | 奇異筆的點記那一刻＋價格，不對齊；畫在一根三分之一處就是起始後二十分鐘 | 第 i+f 根 = 第 i 根起始 + f×一根長度 | k-candle-timeline-domain.ts:72-106 | k-candle-timeline-domain.spec.ts:53-73 | asserts-oracle | produces-oracle | asserts-oracle 0.79 | produces-oracle 0.69 | ✅ conforms | recheck (mid confidence) |
| BR-2 | 精簡：不到一像素的點省掉；超過 200 平均挑；頭尾必留 | RDP 1 像素容差精簡；精簡後超過 200 時從頭到尾平均挑 200；頭尾保留 | freehand-stroke-domain.ts:1-70 | freehand-stroke-domain.spec.ts:13-44 | asserts-oracle | produces-oracle | asserts-oracle 0.29 | produces-oracle 0.64 | ✅ conforms | escalate (low confidence) |
| BR-3 | 一筆的點數 2 到 200 | 少於 2 或多於 200 的整筆換點不收；讀進來超過 200 截掉；畫的時候不到 2 點不交出 | chart-drawing-domain.ts:30-50<br>chart-drawing-domain.ts:87-106<br>chart-drawing-kind-vo.ts:70-74 | chart-drawing-domain.spec.ts:134-156 | asserts-oracle | produces-oracle | asserts-oracle 0.33 | produces-oracle 0.16 | ✅ conforms | escalate (low confidence) |
| BR-4 | 價格大於零 | 取樣略過、拖動到零以下不動 | chart-drawing-domain.ts:90-104<br>freehand-stroke-domain.ts:16-24 | chart-drawing-domain.spec.ts:183-196<br>freehand-stroke-domain.spec.ts:45-58 | asserts-oracle | produces-oracle | asserts-oracle 0.93 | produces-oracle 0.79 | ✅ conforms | recheck (mid confidence) |
| BR-5 | 點數上限 4000，只在新增時擋 | added 檢查總和 > 4000 拒絕 | chart-drawing-board-domain.ts:30-42 | chart-drawing-board-domain.spec.ts:273-310 | asserts-oracle | produces-oracle | asserts-oracle 0.87 | produces-oracle 0.91 | ✅ conforms | accept |
| BR-6 | 預設橘色、線寬 2、實線，樣式可改 | brush 草稿 orange / 2 / solid；styleEditable true | chart-drawing-kind-vo.ts:70-74<br>chart-drawing-service.ts:128-142 | chart-drawing-application.spec.ts:255-268<br>chart-drawing-domain.spec.ts:157-164 | asserts-oracle | produces-oracle | asserts-oracle 0.93 | produces-oracle 0.64 | ✅ conforms | recheck (mid confidence) |
| BR-7 | 磁鐵模式對奇異筆無效 | 奇異筆的點價格原樣 | k-candle-timeline-domain.ts:99-106 | ChartDrawingLayer.spec.ts:691-697<br>k-candle-timeline-domain.spec.ts:53-73 | asserts-oracle | produces-oracle | asserts-oracle 0.99 | produces-oracle 0.99 | ✅ conforms | accept |
| BR-8 | 整筆拖動以根數平移，每點保留它在那一根裡的那一刻 | 平移兩根：10:15→12:15、11:40→13:40，價格照給的 | chart-drawing-service.ts:175-186<br>k-candle-timeline-domain.ts:125-140 | chart-drawing-application.spec.ts:291-306 | asserts-oracle | produces-oracle | asserts-oracle 0.99 | produces-oracle 0.97 | ✅ conforms | accept |
| NFR-1 | 4000 點時拖圖、縮放、拖動一筆仍流暢 | 放置以二分搜尋、整筆平移只建一次時間軸 | k-candle-timeline-domain.ts:140-158<br>chart-drawing-service.ts:175-186 | — | no-test | unclear | no-test 1.00 | diverges 0.43 | 🔴 violation | escalate (violation) |
| NFR-2 | 滑鼠、觸控板與觸控螢幕都能畫 | 以 pointer 事件取樣，不分指標種類 | ChartDrawingLayer.vue:257-290<br>ChartDrawingLayer.vue:368-380 | — | no-test | produces-oracle | no-test 1.00 | produces-oracle 0.75 | 🟡 partial | recheck (mid confidence) |

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| `chart-drawing-domain.ts` `applied` / `replaceAnchors` | 拖動任一種繪圖（不只奇異筆）到價格不大於零時不動 | undocumented in PRD §3 but stated in ARCH §8 as a deliberate widening of BR-4（交易服務本來就拒絕零以下的價格）。Not out of scope |
| `k-candle-timeline-domain.ts` `containingIndexOf` | 找涵蓋某一刻的那一根改用二分搜尋 | 純效能，服務 NFR-1；行為與原本的線性搜尋相同 |

No code implements an Out-of-Scope item (逐點編輯、橡皮擦、筆壓、助手畫奇異筆、填色、文字標註).

## Summary

- Conforms: 32/36 clauses ✅ (89%)
- Violations: AC-15, AC-18, NFR-1 (Jev `diverges` at 0.21 / 0.36 / 0.43; see Needs James)
- Mis-asserted: —
- Partial: NFR-2 (觸控取樣走同一條指標事件路徑，沒有奇異筆專屬的觸控測試；既有的趨勢線觸控測試走同一段程式)
- Gaps: —
- Unclear: —
- Orphans: 2 (both benign, documented above)
- Jev: ran on 36 clauses (13 re-audited after test fixes / corrected references)
- Needs James:
  - **AC-15, AC-18** — Jev code pick `diverges` with low confidence (0.21, 0.36) while rating the tests `asserts-oracle` (0.88, 0.85);
    the mapped tests pass (`點在圈起來的那一塊正中央：選不到`; `選取中的奇異筆：沒有把手…`; `…較寬的淡色光暈…`),
    and the falsification run turned the halo test red when the halo was removed. Claude's verdict: conforms; Jev's status stands as returned.
  - **NFR-1** — performance with 4000 points is not measured by any test; only the structural mitigations (binary search, one timeline per drag) exist. Needs a real-browser check.
  - **AC-1, AC-2, AC-3, AC-10, AC-17, AC-21, BR-2, BR-3** — conforms, escalated only for low Jev confidence.
