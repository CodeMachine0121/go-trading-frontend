# Contract Traceability Matrix — 顯示語言與布里斯本時區

Contract: PRD.md
Design map: ARCH.md
Implementation: `app/`（tests in `tests/`）
Oracle: Acceptance Criteria（25 scenarios）+ Core Business Rules（8）+ Non-Functional（2）— 35 clauses

> 這是**靜態**的符合度稽核：逐條把「規格推出的預期結果」拿去對測試的斷言與正式程式碼的路徑，
> 不以整套測試綠不綠當作判決。第一輪稽核找到的缺口（見文末「第一輪的發現」）已補上測試，
> 下表是補上之後的狀態。

## Clauses

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-1 | 選 English 時頁面上的話都是英文 | 現貨 K 線瀏覽的標題是 "Spot K-candle browsing"，查詢鍵與欄位是英文 | `pages/k-candles/index.vue:6`、`layouts/console.vue:35`、`locales/english/market-data.ts` | `tests/pages/market-page-titles.spec.ts:42`、`tests/components/organisms/KCandleSearchPanel.spec.ts:120` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-2 | 選繁體中文時與目前相同 | 標題「現貨 K 線瀏覽」，其餘文字一字不差 | 繁中目錄逐字沿用原文 | `market-page-titles.spec.ts:42`；既有的中文斷言全數照舊通過（`tests/setup/i18n.ts` 預設繁中） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-3 | 送出前擋下的輸入錯誤用選定語言說明 | 開盤價留白送出被擋下，顯示 "Open price is required" | `domain/models/domains/k-candle-write-domain.ts:116` | `tests/components/organisms/KCandleEditorPanel.spec.ts:588` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-4 | 操作台對系統失敗的解釋用選定語言 | 以英文說明連不到後端並提示確認後端已啟動 | `domain/errors/backend-unreachable-error.ts:17` | `tests/composables/use-telegram-delivery.spec.ts:366`（及 `use-trading-strategies.spec.ts`） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-5 | 瀏覽器分頁的標題也跟著語言 | 分頁標題是英文 | `layouts/console.vue:41`（`useHead`） | `tests/layouts/console.spec.ts:56` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-6 | 換語言不丟掉已填的欄位與已查到的資料 | 字全改英文；填好的開始時間與查到的 K 線還在，沒有重新查詢 | `composables/use-display-language.ts`（只寫 locale）；說法在渲染當下才挑 | `KCandleSearchPanel.spec.ts:120`、`KCandleEditorPanel.spec.ts:601` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-7 | 頂欄與設定頁看的是同一份選擇 | 頂欄選 English 後設定頁那一項也是 English | `use-display-language.ts`（唯一真相是 vue-i18n 的 locale） | `tests/composables/use-display-language.spec.ts:55` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-8 | 已經顯示的錯誤說明跟著換語言 | 那則說明改成 "Open price is required" | 組合式狀態存 `LocalizedTextVo` | `KCandleEditorPanel.spec.ts:588` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-9 | 後端的拒絕原文照原樣附上 | 操作台的說明是英文，後端原文照原樣出現 | `domain/models/vo/untranslated-text-vo.ts`；`backend-request-rejected-error.ts` | `tests/components/molecules/AssistantRejectionNotice.spec.ts:47` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-10 | 使用者取的名字不翻譯 | 英文畫面上名字仍是原文 | 名稱一直是 `string`，不進目錄 | `tests/components/organisms/TradingStrategyListPanel.spec.ts:176` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-11 | 助手的回答不翻譯 | 回答照原樣；助手的鍵、提示、建議提問是英文 | 回答塊為 `string`；`AssistantComposer` / `AssistantSuggestedPrompts` 用目錄 | `tests/components/molecules/AssistantMessage.spec.ts:136`、`AssistantComposer.spec.ts`、`AssistantSuggestedPrompts.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12 | 記住上次選的語言 | 語言是 English | `domain/service/display-language-service.ts:30` | `tests/domain/service/display-language-service.spec.ts:28` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-13 | 沒選過且瀏覽器偏好英文 | English | 同上 + `display-language-domain.ts`（第一個偏好的主語言） | 同上（`en-US`、`en-GB`） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-14 | 沒選過且瀏覽器偏好繁體中文 | 繁體中文 | 同上 | 同上 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-15 | 沒選過且瀏覽器偏好清單以外的語言 | 日文偏好 → 繁體中文 | 同上 | 同上（`ja-JP, en` → 繁中，證明只看第一個） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-16 | 記住的語言看不懂時當作沒選過 | 記住 `fr`、偏好英文 → English | 同上 | 同上 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-17 | 記住的選擇優先於瀏覽器偏好 | 記住繁中、偏好英文 → 繁體中文 | 同上 | 同上、`tests/application/display-language-application.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-18 | English 下的時間寫法 | 世界標準時間 04:00、台北、English → 2026-08-30 12:00 | `TimeZoneDto.formatDateTime` 不吃語言 | `KCandleSearchPanel.spec.ts:120` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-19 | 繁體中文下的時間寫法 | 同一根、繁中 → 2026-08-30 12:00 | 同上 | `tests/components/organisms/KCandleTable.spec.ts`（既有，繁中、台北） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-20 | 南半球夏季加十小時 | 2026-01-15 02:00Z → 2026-01-15 12:00 | `domain/service/time-zone-service.ts`（`Australia/Brisbane`） | `tests/domain/models/dto/time-zone-dto.spec.ts:27` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-21 | 南半球冬季位移不變 | 2026-07-15 02:00Z → 2026-07-15 12:00 | 同上 | 同上 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-22 | 填的時間跨回前一天 | 布里斯本 2026-08-30 00:00 → 2026-08-29 14:00Z | `TimeZoneDto.parseMinuteInput` | `time-zone-dto.spec.ts:39` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-23 | 繁體中文下的選單說法 | 「布里斯本（UTC+10:00）」，新加坡之後、倫敦之前 | `time-zone-domain.ts`（`toDtoAt`）、`time-zone-service.ts` 清單順序 | `tests/domain/service/time-zone-service.spec.ts:24,36` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-24 | English 下的選單說法 | "Brisbane (UTC+10:00)" | 同上 | `time-zone-service.spec.ts:36`、`TimeZoneField.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-25 | 記住布里斯本 | 重新打開仍是布里斯本 | 既有 `TimeZonePreferenceProxy` + 清單 | `time-zone-service.spec.ts:67` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-1 | 可選的顯示語言是固定清單，各以自己的語言寫名字 | 「繁體中文」「English」，繁中在前 | `display-language-service.ts` | `display-language-service.spec.ts:17`、`DisplayLanguageField.spec.ts` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-2 | 決定語言的順序；任何一種英文都算偏好英文 | 記住 → 第一個偏好是英文 → 繁中 | `display-language-domain.ts`、`display-language-service.ts:30` | `display-language-service.spec.ts:28`（`en-AU`、`en-GB`、`en-US`） | asserts-oracle | produces-oracle | ✅ conforms |
| BR-3 | 語言只換話，時間、數字、位移標籤寫法不變 | 兩種語言下時間與 `UTC+10:00` 寫法相同 | `utilities/time-zone-format.ts`（未改） | `KCandleSearchPanel.spec.ts:120`、`time-zone-service.spec.ts:36` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-4 | 只翻操作台自己寫的話 | 後端原文、助手回答、使用者文字、標的代號原樣 | `UntranslatedTextVo`；`scripts/check-translations.ts` 擋下畫面層殘留的中文 | AC-9/10/11 的測試；`bun run lint:translations` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-5 | 換語言當場生效，不重新載入、不重新查詢 | 同 AC-6 | 同 AC-6 | 同 AC-6 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-6 | 整份頁面宣告目前語言 | `<html lang>` 等於選定語言 | `use-display-language.ts`（`document.documentElement.lang`） | `use-display-language.spec.ts`（三案） | asserts-oracle | produces-oracle | ✅ conforms |
| BR-7 | 布里斯本全年 `UTC+10:00`，位在新加坡之後、倫敦之前 | 同 AC-20〜23 | `time-zone-service.ts` | `time-zone-domain.spec.ts`（兩季位移）、`time-zone-service.spec.ts:24` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-8 | 時區城市名跟著語言 | 八個城市各有兩種說法 | `time-zone-service.ts` 清單 | `time-zone-service.spec.ts`「每一個城市名都有兩種說法」 | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-1 | 換語言不得重新向後端取資料 | 換語言後後端呼叫次數不變 | 同 AC-6 | `KCandleSearchPanel.spec.ts:120`（`toHaveBeenCalledTimes(1)`） | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-2 | 最窄寬 390 下英文說法不溢出 | 窄寬下按鈕與標籤不擠壞版面 | 各元件既有的換行規則 | 登入畫面 390 截圖人工確認；登入後的畫面沒有可用的測試帳號，未截圖 | no-test | unclear | ❔ unclear |

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| `app/spa-loading-template.html` | 程式啟動前的載入字樣改為雙語並列（那時還讀不到選擇） | undocumented — 合理延伸 PRD「操作台自己寫的話全部跟著換」，建議保留 |
| `scripts/check-translations.ts` | 機械檢查漏翻、鍵打錯、目錄訊息編譯錯誤 | undocumented（ARCH 有記，PRD 風險段的對策）— 保留 |
| `LocalizedTextVo.join` | 以連接詞把多段話接成一句 | 內部重構，無對外行為 — 保留 |

沒有任何程式碼實作 Out of Scope 的項目（無網址語言前綴、未送語言給助手、未改時間格式、未加其他澳洲時區）。

## Summary

- Conforms: 34/35 clauses ✅（97%）
- Violations: —
- Mis-asserted: —
- Partial: —
- Gaps: —
- Unclear: NFR-2（登入後的畫面無法在本機以英文截圖驗證窄寬）
- Orphans: 3（皆保留）

## 第一輪的發現（已處理）

第一輪稽核時下列條目只有程式碼、沒有斷言規格結果的測試，已補上：

- AC-1、AC-6、AC-18、NFR-1：`KCandleSearchPanel.spec.ts` 新增「換成英文時畫面的話都改說英文，查到的 K 線與時間寫法原封不動、也不重新查詢」。
- AC-5：`tests/layouts/console.spec.ts` 新增頂列與分頁標題兩種語言的案例（拿掉 `useHead` 時它會紅，已驗證）。
- AC-7：`use-display-language.spec.ts` 新增「頂列與設定頁各自取用時看的是同一份選擇」。
- AC-10：`TradingStrategyListPanel.spec.ts` 的英文案例補上「名字仍是原文」的斷言（原本只看按鈕與標籤，是 shallow）。
- BR-8：`time-zone-service.spec.ts` 新增「每一個城市名都有兩種說法」（原本只斷言布里斯本與台北，是 shallow）。
