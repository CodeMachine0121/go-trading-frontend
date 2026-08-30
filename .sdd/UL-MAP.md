# 📔 Ubiquitous Language Map

**Project:** go-trading-frontend
**Bounded Context:** K 線行情操作介面（K-Line Market Data Console）
**Maintainer:** James Hsueh
**Last Updated:** 2026-08-30

> 本文件只記錄**現在有效的詞彙**，不記錄變更歷史。詞彙不再使用就直接刪除該列。
>
> 本專案是後端 `go-trading` 的操作介面，**領域詞彙一律沿用後端 `.sdd/UL-MAP.md`**，
> 不在前端自創同義詞。本文件額外記錄的是後端沒有、只屬於介面的概念（畫面、輸入、呈現狀態），
> 以及每個詞彙在畫面上呈現給使用者的**中文標籤**。

---

## 1. Nouns & Concepts
*Records entities, value objects, attributes and their correspondence between code and real business.*

| Domain Term | Technical Name | User-Facing Label | Definition & Business Rules | Status |
| :--- | :--- | :--- | :--- | :--- |
| K 線 | `KCandle` | K 線 | 市場在一段固定時間內的價量摘要。一根固定涵蓋**五分鐘**，以「交易標的 + 起始時間」唯一辨識 | Confirmed |
| 交易標的 | `symbol` | 交易標的 | 這根 K 線所描述的市場，例如 BTCUSDT。查詢與計算都必須指定；**不得為空** | Confirmed |
| 起始時間 | `openTime` | 起始時間 | 一根 K 線所涵蓋的五分鐘從何時開始。必須落在**五分鐘刻度**上、**不得指向未來**，一律以世界標準時間表示 | Confirmed |
| 開盤價 | `open` | 開盤價 | 該五分鐘內第一筆成交的價格 | Confirmed |
| 最高價 | `high` | 最高價 | 該五分鐘內的最高成交價。**不得低於最低價** | Confirmed |
| 最低價 | `low` | 最低價 | 該五分鐘內的最低成交價 | Confirmed |
| 收盤價 | `close` | 收盤價 | 該五分鐘內最後一筆成交的價格 | Confirmed |
| 成交量 | `volume` | 成交量 | 該五分鐘內成交的標的數量 | Confirmed |
| 成交額 | `quoteVolume` | 成交額 | 該五分鐘內成交的計價金額 | Confirmed |
| 主動買入量 | `takerBuyBaseVolume` | 主動買入量 | 該五分鐘內主動買方成交的標的數量 | Confirmed |
| 主動買入額 | `takerBuyQuoteVolume` | 主動買入額 | 該五分鐘內主動買方成交的計價金額 | Confirmed |
| 漲跌 | `KCandleDomain.priceChange()` | 漲跌 | 收盤價減開盤價。**大於零為上漲、小於零為下跌、等於零為持平**；供畫面決定呈現語氣 | Confirmed |
| 查詢區間 | `KCandleQueryDto` | 查詢區間 | 一次查詢的交易標的與起訖時間。起訖**可精確到分鐘、不必對齊五分鐘刻度**；結束時間不得早於開始時間 | Confirmed |
| 指標算式 | `script` | 指標算式 | 使用者自行提供的一段計算式，系統餵給它指定根數的 K 線並收下它算出的結果 | Confirmed |
| 計算根數 | `candleCount` | 計算根數 | 一次計算要餵給算式的 K 線根數。**必須大於零且不超過單次查詢上限** | Confirmed |
| 指標結果 | `IndicatorCalculationResult` | 指標結果 | 一次計算的產出：一組「指標名稱 → 數值」。**不留存**，空集合也是合法結果 | Confirmed |
| 實際採用根數 | `usedCandleCount` | 實際採用根數 | 這次計算真正餵給算式的根數 | Confirmed |
| 後端連線狀態 | `BackendHealth` | 後端連線狀態 | 後端服務目前是否可用。介面所有功能都以它為前提 | Confirmed |

---

## 2. Actions & Processes
*Records business operations, function logic, and their corresponding business actions.*

| Business Action | Technical Method | Trigger | Business Impact | Notes |
| :--- | :--- | :--- | :--- | :--- |
| 查詢 K 線 | `KCandleApplication.searchKCandles` | 使用者指定交易標的與查詢區間後送出 | 畫面列出該區間內的 K 線，依起始時間**由早到晚** | 區間內無資料呈現「查無 K 線」而非錯誤；未指定交易標的、結束時間早於開始時間、區間過大一律不送出或呈現後端說明的原因 |
| 新增 K 線 | `KCandleApplication.createKCandle` | 使用者填妥一根 K 線的資料後送出 | 建立該根 K 線；同交易標的同起始時間已存在時**覆蓋**舊的 | 起始時間不在五分鐘刻度、最高價低於最低價、任一數字為負一律拒絕並說明原因 |
| 修改 K 線 | `KCandleApplication.updateKCandle` | 使用者在既有 K 線上改動價量數字後送出 | 更新該根 K 線的價格與成交數字 | **不得更換交易標的與起始時間**，畫面上這兩欄唯讀 |
| 刪除 K 線 | `KCandleApplication.deleteKCandle` | 使用者指名一根 K 線並確認刪除 | 移除該根 K 線 | 需二次確認；刪除後列表不再出現該根 |
| 執行指標計算 | `IndicatorCalculationApplication.calculateIndicator` | 使用者提供交易標的、計算根數與指標算式後送出 | 畫面顯示這次算出的每個指標名稱與數值 | 結果不留存；可用根數不足、根數不合法、算式無法解讀或執行失敗，一律不呈現任何部分結果，只說明原因 |
| 檢查後端連線 | `BackendHealthApplication.checkBackendHealth` | 進入畫面時自動、或使用者按下重新檢查 | 顯示後端目前是否可用 | 連不上時明確告知後端未啟動，而不是顯示空白畫面 |

---

## 3. Ambiguities & Conflicts
*Records cases where the same technical term means different things in different modules, or multiple terms refer to the same concept.*

| Ambiguous Term | Meaning in Context A | Meaning in Context B | Resolution |
| :--- | :--- | :--- | :--- |
| 「時間」 | K 線的起始時間（必須對齊五分鐘刻度） | 查詢區間的起訖時間（可精確到分鐘） | 兩者分開稱呼：**起始時間**與**查詢區間起訖**，畫面上的輸入限制也不同 |
| 「量」 | 成交的**標的數量**（成交量、主動買入量） | 成交的**計價金額**（成交額、主動買入額） | 沿用後端：中文一律以「量」指數量、「額」指金額，不混用 |
| 「最新一根」 | 列表上時間最晚的那一根 | 指標計算時被排除的那一根 | 兩者是同一根。畫面上說明「計算一律排除最新一根，因為它涵蓋的五分鐘尚未走完」 |
| 「錯誤」 | 使用者填錯（可自行修正） | 後端連不上（使用者無法自行修正） | 兩者呈現方式分開：前者標在欄位旁，後者整塊告知並提供重試 |

---

## 4. External & Enum Mapping
*Records magic numbers/strings in code and their real business meaning.*

| Category | Code Value / Key | Domain Label | Description |
| :--- | :--- | :--- | :--- |
| K 線長度 | 五分鐘 | K 線涵蓋時長 | 目前所有 K 線固定為五分鐘一根 |
| 起始時間刻度 | `:00, :05, :10, … :55` | 五分鐘刻度 | 起始時間唯一合法的取值；畫面在送出前先擋 |
| 單次查詢上限 | `1000` | 單次查詢筆數上限 | 一次查詢最多回傳 1000 根，超過由後端拒絕並請縮小區間 |
| 價量下限 | `0` | 價量最小值 | 所有價格與成交數字皆不得為負數 |
| 計算排除範圍 | 最新一根 | 計算時排除的 K 線 | 每次指標計算一律排除最新一根 |
| 時區 | 世界標準時間（UTC） | 時間基準 | 所有起始時間與查詢區間一律以此表示；畫面明確標示 UTC，不做在地時區轉換 |
| 漲跌語氣 | `up` / `down` / `flat` | 漲跌語氣 | 由漲跌算出，供畫面決定顏色；**判斷屬於領域，不寫在畫面上** |
| 交易標的範例 | `BTCUSDT`、`ETHUSDT` | 交易標的 | 目前僅作為範例，尚未定義名稱格式規則 |

---

## 維護原則

1. **只反映現況**——本文件不記錄變更歷史，詞彙不再使用就刪除該列。
2. **先進地圖，再進程式碼**——新增業務詞彙一律先寫進本文件，不得自創同義詞。
3. **後端優先**——與後端 `.sdd/UL-MAP.md` 重疊的詞彙以後端為準，本文件只補上介面專屬的部分。
