# Product Requirements Document (PRD) — 算式收到的 K 線有哪些欄位

Brief: `BRIEF.md`
Ubiquitous Language: `../UL-MAP.md`

---

## 1. Background & Goal (Why & Goal)

算式的外框上寫著 `func Calculate(data []indicator.KCandle) ...`，
但畫面從來沒說過 `indicator.KCandle` 裡面有什麼。

而這件事**猜不得**：後端有兩個長得很像的 K 線型別，
資料庫那張表（`entities.KCandle`）與沙箱交給算式的那一個（`vo.KCandleVo`）。
照著前者寫，算式編譯不過——沒有 `ID`、時間不是 `time.Time`、價量不是精確小數。

**目標**：把沙箱那個型別的欄位攤在編輯區旁邊，並明確標出它與資料庫那張表的差異。

## 2. User Personas

| Persona | 是誰 | 在這件事上要什麼 |
| :--- | :--- | :--- |
| 策略作者（本專案唯一的使用者） | 自己寫算式的開發者 | 寫 `candle.` 的時候知道後面能接什麼，不必翻後端程式碼、也不會翻錯型別 |

## 3. User Stories & Acceptance Criteria

### US-01 — 看得到算式收到的每一個欄位 [priority: P0]

作為策略作者，我要在編輯區旁邊看到 K 線有哪些欄位與型別，
好讓我寫算式時不必憑印象猜欄位名。

```gherkin
Scenario: 逐一列出每一個欄位
  When 使用者進入指標計算畫面
  Then 看得到欄位 "Close"，型別 "float64"，意思是「收盤價」
  And 看得到欄位 "TakerBuyQuoteVolume"，型別 "float64"，意思是「主動買入額」

Scenario: 時間是 Unix 秒的整數
  When 使用者進入指標計算畫面
  Then 起始時間那一欄的名字是 "OpenTimeUnixSeconds"，型別是 "int64"

Scenario: 不列出算式看不到的東西
  When 使用者進入指標計算畫面
  Then 欄位清單裡沒有 "ID"
  And 欄位清單裡沒有 "OpenTime"

Scenario: 說法與 K 線瀏覽一致
  When 使用者進入指標計算畫面
  Then 每一個欄位都帶一個給人看的名字
  And "Close" 的名字是「收盤價」，與 K 線瀏覽那張表的欄位標題相同
```

### US-02 — 知道它不是資料庫那張表 [priority: P0]

作為策略作者，我要被明確告知這份清單描述的是沙箱裡的型別，
好讓我不會照著後端資料庫那張表寫出編譯不過的算式。

```gherkin
Scenario: 點出它是算式看得到的形狀
  When 使用者讀那塊說明
  Then 它說出這是算式看得到的形狀、不是資料庫那張表

Scenario: 標出算式收到的參數形式
  When 使用者讀那塊說明
  Then 它標出 "data []indicator.KCandle"，與外框上那一行相同
```

## 4. Business Flow

```
進入指標計算畫面
      │
      └─ 問 Application：算式收到的每一根 K 線有哪些欄位
             └─ 逐欄列出（名字 / 型別 / 意思）＋ 一段點出與資料庫那張表差異的說明
```

沒有後端請求：這塊說明描述的是型別，不是資料。

## 5. 與既有切片的關係

| 切片 | 關係 |
| :--- | :--- |
| `2026-09-02-strategy-script-authoring` | 外框（`data []indicator.KCandle` 那一行）由它產生。本切片說的是那一行裡那個型別的內容，因此**與外框住在同一個 domain service**，不可能各說一套 |

## 6. 技術落點（供實作對照）

詳見 `ARCH.md`。要點：欄位清單住在 domain（與外框同一個 service），畫面一個欄位名都不自己寫。
