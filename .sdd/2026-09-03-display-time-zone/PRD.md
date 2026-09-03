# Product Requirements Document (PRD) — 顯示時區

**Status:** Finalized
**Version:** v1.0
**Owner:** James Hsueh
**Stakeholders:** 專案作者本人（同時是使用者、開發者與審查者）

---

## 1. Background & Goal (Why & Goal)

- **Problem Statement:** 操作台上的每一個時間都寫死世界標準時間。看盤要在腦內加時差，
  填查詢開始時間、填 K 線起始時間要先減時差——每一次都是一個會出錯的心算，
  而算錯的後果是查到一段不是自己想看的區間，畫面上還看不出來。
- **Expected Outcome:** 使用者在頂欄選一個時區，操作台上所有時間的**顯示與輸入**都照那個時區走，
  選擇被這台瀏覽器記住。時差心算從此消失。
- **Out of Scope:** 後端的時區（收發一律世界標準時間，一行不改）、自訂任意 IANA 時區、
  依瀏覽器自動偵測、跨裝置同步、日期格式與十二／二十四小時制的選擇。

---

## 2. User Personas

- **Primary Role(s):** 策略研究者（專案作者本人），人在台北，看的是世界標準時間的資料。
- **Usage Context:** 桌機瀏覽器、本機執行；同一個瀏覽器長期使用，選一次就不想再選。

---

## 3. User Stories & Acceptance Criteria

### US-01 — 選一個時區 [priority: P0]

**As a** 策略研究者, **I want** 在操作台頂欄選一個時區,
**so that** 我看到的時間就是我在用的時間，不必每次心算時差。

```gherkin
Scenario: 每一頁都選得到時區
  Given 使用者在操作台的任何一個畫面
  When 畫面呈現頂欄
  Then 頂欄有一個時區選單
  And 選單顯示目前選定的時區與它相對於世界標準時間的位移

Scenario: 預設是世界標準時間
  Given 這台瀏覽器沒有記住任何時區
  When 使用者打開操作台
  Then 選定的時區是世界標準時間

Scenario: 可選的時區都標出目前的位移
  Given 使用者展開時區選單
  When 畫面列出可選的時區
  Then 每一個時區都標出它目前相對於世界標準時間的位移
```

### US-02 — 顯示的時間照選定的時區 [priority: P0]

**As a** 策略研究者, **I want** 畫面上的時間都用我選的時區呈現,
**so that** 我掃過清單與圖表就知道那是什麼時候，不必換算。

```gherkin
Scenario: K 線清單的起始時間照選定的時區
  Given 一根 K 線的起始時間是世界標準時間 2026-08-30 04:00
  And 選定的時區是台北
  When 使用者看 K 線清單
  Then 該根的起始時間顯示為 2026-08-30 12:00
  And 欄位標題標示目前的時區位移

Scenario: 換時區時已經在畫面上的時間當場改用新說法
  Given K 線清單上已經列出幾根 K 線，時區為世界標準時間
  When 使用者把時區換成台北
  Then 同一批 K 線的起始時間全部改以台北呈現
  And 系統不重新查詢

Scenario: 圖表的時間也照選定的時區
  Given 圖表上畫著一段 K 線
  And 選定的時區是台北
  When 使用者看圖表
  Then 時間軸與已取回區間的說明都以台北呈現
```

### US-03 — 輸入的時間照選定的時區 [priority: P0]

**As a** 策略研究者, **I want** 我填進去的時間就被當成我選的時區,
**so that** 我不必為了填一個查詢條件而先做一次減法。

```gherkin
Scenario: 填進去的開始時間被當成選定時區的當地時間
  Given 選定的時區是台北
  And 使用者把查詢開始時間填成 2026-08-30 12:00
  When 使用者送出查詢
  Then 系統以世界標準時間 2026-08-30 04:00 為開始時間去取 K 線

Scenario: 預設開始時間也以選定的時區呈現
  Given 選定的時區是台北
  And 目前時間為世界標準時間 2026-08-30 12:00
  When 使用者進入 K 線查詢畫面
  Then 開始時間欄位顯示 2026-08-29 20:00

Scenario: 填好之後才換時區
  Given 選定的時區是世界標準時間
  And 使用者已把查詢開始時間填成 2026-08-30 04:00
  When 使用者把時區換成台北
  Then 欄位顯示 2026-08-30 12:00
  And 那指的仍是同一個瞬間

Scenario: 新增 K 線的起始時間也照選定的時區
  Given 選定的時區是台北
  And 使用者在新增 K 線的表單把起始時間填成 2026-08-30 12:00
  When 使用者送出
  Then 系統以世界標準時間 2026-08-30 04:00 為該根的起始時間
```

### US-04 — 選擇被記住 [priority: P1]

**As a** 策略研究者, **I want** 這台瀏覽器記得我選的時區,
**so that** 我不必每次打開都重選一次。

```gherkin
Scenario: 記住上次選的時區
  Given 使用者上次選的是台北
  When 使用者重新打開操作台
  Then 選定的時區是台北

Scenario: 記住的時區不在清單上
  Given 這台瀏覽器記住的時區不在可選清單上
  When 使用者打開操作台
  Then 選定的時區退回世界標準時間
  And 畫面照常運作
```

---

## 4. Business Flow

1. 打開操作台 → 先以世界標準時間呈現 → 讀出這台瀏覽器記住的時區（不在清單上就退回世界標準時間）。
2. 使用者從頂欄選單換時區 → 記住這個選擇 → 全站所有時間的顯示與輸入立刻改用新時區。
3. 顯示：把後端給的那個瞬間換算成該時區的當地時間呈現。
4. 輸入：把使用者填的當地時間換算回那個瞬間，再往後端送——**後端收發一律世界標準時間**。

---

## 5. 與既有切片的關係

`2026-08-30-k-candle-browsing`、`2026-08-30-k-candle-management`、`2026-09-02-k-candle-chart-view`
與 `2026-09-03-k-candle-search-until-now` 中「時間一律以世界標準時間輸入與呈現」這一條，
改為「一律以**選定的時區**輸入與呈現，預設為世界標準時間」。
各切片其餘規則——五分鐘刻度、不得指向未來、查到目前時間為止、彙總刻度——都是對**瞬間**的規則，
與用哪一個時區說它無關，一行不變。

---

## 6. 技術落點（供實作對照）

| 關注點 | 落在哪裡 |
| :--- | :--- |
| 可選時區清單與它們的位移標籤 | `TimeZoneService` / `TimeZoneDomain` |
| 記住與讀回這台瀏覽器的選擇 | `ITimeZonePreferenceProxy` → `TimeZonePreferenceProxy`（localStorage） |
| 某個瞬間在某個時區怎麼寫、怎麼讀回來 | `TimeZoneDto` 的轉換方法（機械換算在 `utilities/time-zone-format.ts`） |
| 全站共用「目前選定的時區」 | `useSelectedTimeZone` composable（頁面取用後往下傳） |
| 頂欄的選單 | `TimeZoneField.vue`（分子），由 `ConsoleLayout` 的具名插槽承接 |
