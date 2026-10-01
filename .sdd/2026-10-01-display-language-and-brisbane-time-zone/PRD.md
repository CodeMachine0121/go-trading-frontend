# Product Requirements Document (PRD) — 顯示語言與布里斯本時區

**Status:** Finalized
**Version:** v1.0
**Owner:** James Hsueh
**Stakeholders:** James Hsueh（單人專案：開發、測試、使用者皆同一人）

---

## 1. Background & Goal (Why & Goal)

- **Problem Statement:**
  - 操作台上每一個字都是繁體中文。給不讀中文的人看畫面、或想用英文操作時，沒有任何辦法。
  - 顯示時區只有亞洲、倫敦與紐約。人在澳洲東岸看盤時，看時間、填時間都還要心算加十小時。
- **Expected Outcome:**
  1. 選了 English 之後，走遍每一個畫面都看不到一句操作台自己寫的中文。
  2. 選了繁體中文（或從沒選過且瀏覽器不偏好英文）時，畫面與目前一字不差。
  3. 換語言當場生效：不重新載入、不丟掉手上填的東西與查到的資料。
  4. 時區選單有「布里斯本（UTC+10:00）」，任何季節都照加十小時顯示與讀回。
- **Out of Scope:**
  - 繁體中文與英文以外的語言；清單要能再加，但本次只交付這兩個。
  - 翻譯不是操作台寫的內容：後端回覆的原文、AI 助手的回答、使用者輸入的文字（名稱、筆記、策略腳本內文）、交易標的代號。
  - 讓 AI 助手改用選定語言回答。
  - 跨裝置同步語言選擇。
  - 依語言改變日期、時間、數字的寫法——一律維持 `YYYY-MM-DD HH:mm`、二十四小時制，數字寫法不變。
  - 以網址區分語言。
  - 澳洲其他會隨季節換位移的時區、任意時區搜尋、依瀏覽器自動偵測時區。

---

## 2. User Personas

- **Primary Role(s):** 操作台使用者（專案作者本人），以及他拿畫面給看的、不讀中文的人。
- **Usage Context:** 桌機與手機瀏覽器；人可能在台灣，也可能在澳洲東岸。語言與時區是兩個獨立選擇——人在布里斯本的人可能仍用中文，也可能用英文。

---

## 3. User Stories & Acceptance Criteria

### US-01 — 用選定的語言看操作台 [priority: P0]
**As a** 操作台使用者，**I want** 操作台用我選的語言說話，**so that** 不讀中文的人也能操作，我也能用英文操作。

```gherkin
Scenario: 選 English 時頁面上的話都是英文
  Given 選定語言為 English
  When 打開現貨 K 線瀏覽
  Then 頁面標題是 "Spot K-candle browsing"
  And 查詢按鈕、交易標的與開始時間的欄位名都是英文

Scenario: 選繁體中文時與目前相同
  Given 選定語言為繁體中文
  When 打開現貨 K 線瀏覽
  Then 頁面標題是「現貨 K 線瀏覽」，其餘文字與目前一字不差

Scenario: 送出前擋下的輸入錯誤用選定語言說明
  Given 選定語言為 English
  And 新增 K 線時開盤價留白
  When 送出
  Then 送出被擋下，開盤價旁顯示英文說明 "Open price is required"

Scenario: 操作台對系統失敗的解釋用選定語言
  Given 選定語言為 English
  And 後端沒有啟動
  When 送出任何查詢
  Then 畫面以英文說明連不到後端，並提示確認後端是否已啟動

Scenario: 瀏覽器分頁的標題也跟著語言
  Given 選定語言為 English
  When 打開現貨 K 線圖表
  Then 瀏覽器分頁上的標題是英文
```

### US-02 — 換語言當場生效 [priority: P0]
**As a** 操作台使用者，**I want** 換語言時畫面立刻改說法、手上的東西都不丟，**so that** 我不必為了換語言重做一遍。

```gherkin
Scenario: 換語言不丟掉已填的欄位與已查到的資料
  Given 語言為繁體中文
  And 查詢表單已經填好開始時間、清單上已有查到的 K 線
  When 把語言換成 English
  Then 畫面上的話全部改成英文
  And 填好的開始時間與查到的 K 線都還在，沒有重新查詢

Scenario: 頂欄與設定頁看的是同一份選擇
  Given 在頂欄選了 English
  When 打開設定頁
  Then 「顯示」段的語言那一項顯示為 English

Scenario: 已經顯示的錯誤說明跟著換語言
  Given 畫面上正顯示一則開盤價必須填寫的說明（繁體中文）
  When 把語言換成 English
  Then 那則說明改成 "Open price is required"
```

### US-03 — 不是操作台寫的話原樣呈現 [priority: P0]
**As a** 操作台使用者，**I want** 後端與助手說的話、我自己寫的東西都原樣呈現，**so that** 翻譯不會改掉我要看的原文。

```gherkin
Scenario: 後端的拒絕原文照原樣附上
  Given 選定語言為 English
  And 後端以中文回覆一個拒絕原因「區間過大」
  When 畫面呈現這次拒絕
  Then 操作台自己寫的那句說明是英文
  And 後端的原文「區間過大」照原樣出現

Scenario: 使用者取的名字不翻譯
  Given 選定語言為 English
  And 有一支策略腳本取名「突破策略」
  When 看策略腳本清單
  Then 那一支的名字仍是「突破策略」

Scenario: 助手的回答不翻譯
  Given 選定語言為 English
  And 助手以中文回答了一則提問
  When 看那段對話
  Then 回答內容照原樣是中文
  And 助手畫面的按鈕、輸入框提示與建議提問是英文
```

### US-04 — 記住語言選擇 [priority: P0]
**As a** 操作台使用者，**I want** 這台瀏覽器記住我選的語言、沒選過時猜對我的偏好，**so that** 每次打開都不必重選。

```gherkin
Scenario: 記住上次選的語言
  Given 上次選的是 English
  When 重新打開操作台
  Then 語言是 English

Scenario: 沒選過且瀏覽器偏好英文
  Given 從沒選過語言
  And 瀏覽器偏好英文
  When 打開操作台
  Then 語言是 English

Scenario: 沒選過且瀏覽器偏好繁體中文
  Given 從沒選過語言
  And 瀏覽器偏好繁體中文
  When 打開操作台
  Then 語言是繁體中文

Scenario: 沒選過且瀏覽器偏好清單以外的語言
  Given 從沒選過語言
  And 瀏覽器偏好日文
  When 打開操作台
  Then 語言是繁體中文

Scenario: 記住的語言看不懂時當作沒選過
  Given 記住的語言不在可選清單上
  And 瀏覽器偏好英文
  When 打開操作台
  Then 語言是 English，畫面照常運作

Scenario: 記住的選擇優先於瀏覽器偏好
  Given 上次選的是繁體中文
  And 瀏覽器偏好英文
  When 重新打開操作台
  Then 語言是繁體中文
```

### US-05 — 語言不改時間與數字的寫法 [priority: P1]
**As a** 操作台使用者，**I want** 換語言時時間與數字的寫法不變，**so that** 截圖、比對數字時不會因為語言不同而看錯。

```gherkin
Scenario: English 下的時間寫法
  Given 一根 K 線的起始時間是世界標準時間 2026-08-30 04:00
  And 時區為台北、語言為 English
  When 看 K 線清單
  Then 該根顯示 2026-08-30 12:00

Scenario: 繁體中文下的時間寫法
  Given 同一根 K 線、時區為台北、語言為繁體中文
  When 看 K 線清單
  Then 該根一樣顯示 2026-08-30 12:00
```

### US-06 — 以布里斯本時間看與填時間 [priority: P0]
**As a** 人在澳洲東岸的操作台使用者，**I want** 選布里斯本當顯示時區，**so that** 看時間、填時間都不必心算。

```gherkin
Scenario: 南半球夏季加十小時
  Given 一根 K 線起始於世界標準時間 2026-01-15 02:00
  And 時區為布里斯本
  When 看 K 線清單
  Then 該根顯示 2026-01-15 12:00

Scenario: 南半球冬季位移不變
  Given 一根 K 線起始於世界標準時間 2026-07-15 02:00
  And 時區為布里斯本
  When 看 K 線清單
  Then 該根顯示 2026-07-15 12:00

Scenario: 填的時間跨回前一天
  Given 時區為布里斯本
  And 查詢開始時間填 2026-08-30 00:00
  When 送出查詢
  Then 以世界標準時間 2026-08-29 14:00 為開始時間去查

Scenario: 繁體中文下的選單說法
  Given 語言為繁體中文
  When 打開時區選單
  Then 看得到「布里斯本（UTC+10:00）」，位在新加坡之後、倫敦之前

Scenario: English 下的選單說法
  Given 語言為 English
  When 打開時區選單
  Then 看得到 "Brisbane (UTC+10:00)"

Scenario: 記住布里斯本
  Given 這台瀏覽器記住的時區是布里斯本
  When 重新打開操作台
  Then 時區仍是布里斯本
```

---

## 4. Business Flow & Logic

- **Flow Diagram:**

  ```mermaid
  flowchart TD
    A[打開操作台] --> B{這台瀏覽器記住了語言？}
    B -- 記住且在清單上 --> C[用記住的語言]
    B -- 沒記住或看不懂 --> D{瀏覽器偏好英文？}
    D -- 是 --> E[English]
    D -- 否 --> F[繁體中文]
    C & E & F --> G[畫面照此語言說話]
    G --> H[使用者在頂欄或設定頁換語言]
    H --> I[記住新語言] --> G
  ```

- **Core Business Rules:**
  - **可選的顯示語言**是固定清單：繁體中文、English。每一個以它自己的語言寫名字。
  - **決定語言的順序**：記住的（且在清單上）→ 瀏覽器偏好英文就 English → 其餘一律繁體中文。「偏好英文」指瀏覽器偏好的第一個語言是任何一種英文（美式、英式…皆算）。
  - **語言只換話**：時間一律 `YYYY-MM-DD HH:mm`、二十四小時制；數字、價格、位移標籤（`UTC+10:00`）寫法不變。
  - **只翻操作台自己寫的話**。後端回覆的原文、助手回答、使用者輸入的文字、交易標的代號原樣呈現。操作台替後端拒絕補上的解釋屬於操作台的話，要翻；附上的後端原文不翻。
  - **換語言當場生效**：不重新載入、不重新查詢；已經顯示的說明（包括輸入錯誤）改用新語言說同一件事。
  - **整份頁面宣告目前語言**，讓朗讀工具照對的語言念。
  - **布里斯本**：位移全年固定 `UTC+10:00`，放在可選顯示時區清單中新加坡之後、倫敦之前。清單其餘時區、預設（世界標準時間）、記住選擇的方式都不變。
  - **時區城市名跟著語言**：世界標準時間／UTC、台北／Taipei、東京／Tokyo、香港／Hong Kong、新加坡／Singapore、布里斯本／Brisbane、倫敦／London、紐約／New York。
- **Edge Cases:**
  - 瀏覽器不讓記（私密視窗、封鎖網站資料）：選擇照樣生效到關掉為止，下次照「沒選過」決定。
  - 瀏覽器沒有給出任何偏好語言：當作不偏好英文，用繁體中文。
  - 換語言時正在等系統回話：回話回來後用新語言呈現操作台自己的話。
  - 進入操作台前的登入、等待開通、授權同意畫面也照選定語言（它們也是操作台寫的話）。

---

## 5. UI/UX Design & Interaction

- **Prototype Link:** N/A（沿用既有頂欄與設定頁版型）
- **Key Interactions:**
  - 頂欄：語言選單與時區選單、外觀切換並列；選單上列出「繁體中文」「English」，目前那一個看得出來。窄螢幕頂欄收起這些項目時，比照時區只在設定頁出現。
  - 設定頁「顯示」段：新增「顯示語言」一列，在「顯示時區」之前，附一句說明（只影響操作台自己的話，不翻譯後端與助手的內容）。
  - 登入等進入操作台之前的畫面沒有頂欄，那裡也要能換語言（放一個同樣的語言選單）。
  - 換語言無載入狀態——立即完成。

---

## 6. Non-Functional Requirements

- **Performance:** 換語言應在一次畫面更新內完成，體感立即；不得因此重新向後端取資料。
- **Security:** N/A（不新增任何對外資料往來）。
- **Compatibility:** 與現行支援的瀏覽器相同；最窄寬 390 仍可讀可用——英文字通常比中文長，按鈕與標籤在窄寬下不得溢出畫面。
- **Analytics / Tracking:** N/A。

---

## 7. Dependencies & Risks

- **External Dependencies:** 無新的外部服務。
- **Known Risks:**
  - **翻譯覆蓋不全**：操作台自己的話散落在每一個畫面與每一條規則說明裡，漏翻一句就是一句中文留在英文畫面上。需要一個機械性的檢查，確認繁體中文與英文兩份說法的條目一一對應、沒有缺漏。
  - **英文字長**：英文說法普遍較長，窄螢幕上按鈕與標籤可能擠壞版面。
  - **測試以中文文字為準**：既有檢查大量以中文說法驗證畫面，預設語言維持繁體中文，這些檢查不應因本切片而失效。

---

## 8. Appendix

- 需求共識：`BRIEF.md`（同資料夾）
- 顯示時區的既有行為：`.sdd/2026-09-03-display-time-zone/`
- 外觀選擇的既有行為（同樣是「記在這台瀏覽器的顯示偏好」）：`.sdd/2026-09-24-ui-redesign/`
