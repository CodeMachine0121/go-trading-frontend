# Contract Traceability Matrix — 顯示時區

Contract: `PRD.md`
Design map: `ARCH.md`
Implementation: `app/domain/models/{entities,domains,dto}/time-zone*`、`app/domain/service/time-zone-service.ts`、
`app/infrastructure/proxy/time-zone-preference-proxy.ts`、`app/application/time-zone-application.ts`、
`app/utilities/time-zone-format.ts`、`app/composables/use-selected-time-zone.ts`、
`app/components/molecules/TimeZoneField.vue`、`ConsoleLayout` 與四個 page、七個顯示或輸入時間的元件
Oracle: Acceptance Criteria（13 個情境）

## Clauses

`Spec-expected` 欄是只讀規格文字得出的業務可觀察結果；`Impl` / `Test` 欄是把它橋接到程式碼之後查到的位置。

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-01 | 每一頁都選得到時區 | 頂欄有時區選單，顯示目前選定的時區與它的位移 | `ConsoleLayout.vue:49`（具名插槽）+ 四個 page 的 `#timezone` + `TimeZoneField.vue` | `ConsoleLayout.spec.ts`（插槽真的被渲染）、`TimeZoneField.spec.ts`（選單內容與目前值） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02 | 預設是世界標準時間 | 沒有記住任何東西時選定世界標準時間 | `time-zone-service.ts:57`（清單第一個是退路）、`use-selected-time-zone.ts`（初值） | `time-zone-service.spec.ts`（沒記住 → UTC）、`time-zone-application.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03 | 可選的時區都標出目前的位移 | 每一個選項都帶 `UTC±HH:MM` | `time-zone-domain.ts:20`、`time-zone-service.ts:28` | `time-zone-service.spec.ts`（每一個都符合位移格式）、`TimeZoneField.spec.ts`（選項文字） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04 | K 線清單的起始時間照選定的時區 | UTC 04:00 的那一根在台北顯示 12:00，欄位標題標出目前的時區 | `KCandleTable.vue:42`（標城市名）、`:87` | `KCandleTable.spec.ts`（UTC 與台北兩列） | asserts-oracle | produces-oracle | ✅ conforms（表頭標**城市名**而不是位移：位移是「現在」算的，每一列的位移卻是那一列那個瞬間的，兩者會在日光節約時間前後對不上） |
| AC-05 | 換時區時已經在畫面上的時間當場改用新說法，且不重新查詢 | 同一批 K 線改以新時區呈現，沒有第二次查詢 | 選定的時區是往下傳的 prop，元件重新渲染即可；沒有任何 watch 觸發查詢 | `KCandleSearchPanel.spec.ts`（換時區後列上的時間變了、查詢仍只發生一次；另有一條專門斷言換時區不查詢） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06 | 圖表的時間也照選定的時區 | 時間軸的分格與標籤、十字準星、已取回區間都以選定時區呈現 | `KCandleChart.vue:51`（交給函式庫的是當地時鐘讀數）、`:204-210`（標籤從那份讀數讀回）、`:256`（拉出的區間換回瞬間）、`KCandleChartPanel.vue:233` | `KCandleChart.spec.ts`（十字準星與刻度的兩個時區、四種刻度粗細、交出去的是讀數不是瞬間、分格落在**當地**元旦、換時區整批重講、別的時區拉出的區間送回真正的瞬間）、`KCandleChartPanel.spec.ts`（涵蓋區間換時區後改寫且不重新取） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-07 | 填進去的開始時間被當成選定時區的當地時間 | 台北填 12:00 → 以 UTC 04:00 去取 | `KCandleSearchPanel.vue:92`（`timeZone.parseMinuteInput`）、`time-zone-dto.ts:37` | `KCandleSearchPanel.spec.ts`（送出去的 `startTime` 是 04:00Z）、`time-zone-dto.spec.ts`（三個時區的讀回） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-08 | 預設開始時間也以選定的時區呈現 | 台北、目前 UTC 12:00 → 欄位顯示 2026-08-29 20:00 | `KCandleSearchPanel.vue:66` | `KCandleSearchPanel.spec.ts`（選定台北時的預設值） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-09 | 填好之後才換時區 | 欄位換一種說法，指的仍是同一個瞬間 | `KCandleSearchPanel.vue:70`、`KCandleEditorPanel.vue:72`（舊時區讀回、新時區寫出） | `KCandleSearchPanel.spec.ts`、`KCandleEditorPanel.spec.ts` 各一條 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-10 | 新增 K 線的起始時間也照選定的時區 | 台北填 12:00 → 以 UTC 04:00 存那一根 | `KCandleEditorPanel.vue:86`、`:118` | `KCandleEditorPanel.spec.ts`（送出去的 `openTime` 是 12:00Z 的那一條，以及編輯既有那一根時欄位以台北呈現） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-11 | 記住上次選的時區 | 重新打開仍是台北 | `time-zone-service.ts:49`（選定即寫入）、`time-zone-preference-proxy.ts` | `time-zone-application.spec.ts`（選了之後讀回就是它）、`time-zone-service.spec.ts`（寫入的識別字） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12 | 記住的時區不在清單上 | 退回世界標準時間，畫面照常運作 | `time-zone-service.ts:57` | `time-zone-service.spec.ts`（不在清單上 → UTC；選定看不懂的識別字時記住的也是 UTC） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-13 | 後端收發一律世界標準時間 | 時區不影響送給後端的任何時間 | `k-candle-proxy.ts`（一行未改，仍是 `toISOString()`）；領域 model 均未收下時區 | `k-candle-proxy.spec.ts`（既有測試全綠）、`k-candle-query-domain.spec.ts` 等（未受影響） | asserts-oracle | produces-oracle | ✅ conforms |

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| `time-zone-format.ts` 的日光節約時間兩次修正 | 規格只在 Out of Scope／風險裡提到，沒有寫成情境 | 已有測試（`time-zone-dto.spec.ts` 的紐約三月與十一月三列）。它是「當地寫法回推瞬間」這條規則的邊界，不另立情境 |
| `TimeZonePreferenceProxy` 的 try/catch | 瀏覽器把儲存關掉時，讀不到＝沒記住、寫不進去＝這次不記得 | 刻意的降級，寫在檔內註解。沒有測試——它要的是「瀏覽器儲存會拋例外」這個環境條件，happy-dom 下要靠 stub 造假，代價高於價值 |
| `use-selected-time-zone.ts` | 跨畫面共用的選定時區 | **無測試**：它需要 Nuxt runtime（`useState` / `useNuxtApp`），而本專案的測試刻意不啟動 Nuxt。它與 page 一樣只做接線——取清單、掛載後讀回、換了就記住，三行都直接轉呼叫 Application，行為本身在 `time-zone-application.spec.ts` 已驗。**已在 dev server 上以四個畫面實測**（頂欄選單在每一頁都渲染得出來、選項帶正確位移） |
| 四個 page 的 `#timezone` 插槽 | 接線 | 同上，比照既有慣例不寫頁面測試 |
| `tests/fixtures/time-zone.ts` | 測試共用的選定時區 | 測試用具，非產品行為 |

## Gaps (clause with no implementation / no test)

無。

## Review 之後修掉的三件事

| 問題 | 影響 | 修法 |
|------|------|------|
| 交給繪圖函式庫的是真正的瞬間，而它用**世界標準時間**的年月日決定哪一格標年／月／日 | 負位移時區的每一格日分隔都標成前一天，紐約的 2027 年分隔標成 `2026`、2027 從不出現；正位移時區的分隔則落在當地日子的中間 | 改交當地時鐘讀數（函式庫自己建議的做法），標籤直接從那份讀數讀回；使用者拉出的區間再換回瞬間 |
| 表頭與涵蓋區間標的是「現在」的位移，每一列卻以那一列的瞬間換算 | 倫敦在夏令時間查一月的資料時，表頭寫 `UTC+01:00`、列卻是 `UTC+00:00` | 這兩處改標城市名；位移只留在時區選單上（它說的正是「現在」） |
| `Intl.DateTimeFormat` 每次呼叫都現建一個 | 千列表格每次渲染多花約 22ms 的阻塞時間，換時區會整表重算 | 每個時區的格式化器只建一次（實測千列 24ms → 1.6ms） |

## Out of Scope 檢查

沒有實作到規格排除的項目：沒有自動偵測瀏覽器時區、沒有自訂／搜尋任意 IANA 時區、
沒有跨裝置同步、沒有日期格式或十二小時制的選項、後端一行未改。
