# Product Requirements Document (PRD) — 多標的機器人的資金分配（操作台）

**Status:** Finalized
**Version:** v1.0
**Owner:** James Hsueh
**Stakeholders:** Engineering（操作台；交易服務同名切片先上線、向下相容）

---

## 1. Background & Goal (Why & Goal)

- **Problem Statement:** 交易服務已經把部位資金改成**整台機器人的總金額**，每個監聽標的只用**分到的資金**（總金額 × 分配比例 ÷ 100）。操作台仍把那一格叫「部位資金」，擁有者看不到、也改不了每個標的的分配比例，更不知道每個標的實際能押多少；盯好幾個標的、用固定金額的機器人會在不知情下每一輪都押不下。
- **Expected Outcome:**
  - 擁有者在建立與修改機器人時看得懂「這是總金額」，替每個監聽標的給分配比例（預設平均分配）。
  - 合計與未動用即時可見；超過 100% 或填錯的分配在送出前就擋下，說法與交易服務一字不差。
  - 每個監聽標的分到多少一目了然；押不下固定金額時事先提醒。
  - 詳細區看得到每個監聽標的的分配比例與分到的資金。
- **Out of Scope:**
  - 檢查幣安帳戶實際餘額。
  - 沒用到的份額借給別的標的、依信號動態調整分配。
  - 清單列上的小標籤顯示分配。
  - Telegram 訊息（交易服務已處理）。

---

## 2. User Personas

- **Primary Role(s):** 機器人擁有者。
- **Usage Context:** 桌機上建立與調整機器人、決定總金額怎麼分；手機上打開詳細區確認每個標的能押多少。

---

## 3. User Stories & Acceptance Criteria

### US-01 — [priority: P0] 看懂總金額
**As a** 機器人擁有者, **I want** 部位規劃那一格清楚標示是整台的總金額, **so that** 我不會以為每個標的各有一份。

```gherkin
Scenario: 現貨機器人的總金額
  Given 我在拼一台現貨機器人
  When 我打開部位規劃
  Then 那一格叫「總金額」
  And 說明「整台機器人的錢，每個監聽標的只用它分到的那一份」

Scenario: 合約機器人的總金額是保證金
  Given 我在拼一台合約機器人
  When 我打開部位規劃
  Then 那一格叫「總金額（保證金）」
  And 說明「名目＝保證金 × 槓桿」
```

### US-02 — [priority: P0] 替每個監聽標的給分配比例
**As a** 機器人擁有者, **I want** 每個監聽標的一格分配比例、預設平均分配, **so that** 不想細調時一步都不用多做，想細調時每一格都改得動。

```gherkin
Scenario: 只有一個標的
  Given 一台新機器人只盯 BTCUSDT
  When 我打開部位規劃
  Then BTCUSDT 的分配比例是 100

Scenario: 加入第二個標的時自動平均
  Given 一台新機器人盯 BTCUSDT，分配比例 100，我沒改過
  When 我加入 ETHUSDT
  Then BTCUSDT 與 ETHUSDT 的分配比例各是 50

Scenario: 三個標的的平均分配捨去零頭
  Given BTCUSDT、ETHUSDT 各 50，我沒改過
  When 我加入 SOLUSDT
  Then 三個標的的分配比例各是 33.33
  And 合計顯示 99.99%，未動用顯示 0.01%

Scenario: 七個標的
  Given 一台機器人盯 7 個標的，我沒改過分配
  When 我看部位規劃
  Then 每個標的的分配比例是 14.28，未動用顯示 0.04%

Scenario: 改過之後加入標的不再自動重算
  Given BTCUSDT 改成 70、ETHUSDT 30
  When 我加入 SOLUSDT
  Then BTCUSDT 仍是 70、ETHUSDT 仍是 30、SOLUSDT 那一格是空的
  And 送出被擋下，說「SOLUSDT 沒有分配比例——要嘛每個監聽標的都給，要嘛都不給」

Scenario: 改過之後拿掉標的
  Given BTCUSDT 70、ETHUSDT 30，我改過
  When 我拿掉 ETHUSDT
  Then BTCUSDT 仍是 70，未動用顯示 30%

Scenario: 一鍵回到平均分配
  Given BTCUSDT 70、ETHUSDT 30
  When 我按「平均分配」
  Then BTCUSDT 與 ETHUSDT 各是 50

Scenario: 打開既有機器人看到它的分配
  Given 一台機器人 BTCUSDT 60%、ETHUSDT 40%
  When 我打開它的編輯頁
  Then BTCUSDT 那一格是 60、ETHUSDT 那一格是 40

Scenario: 既有機器人原本就是平均分配
  Given 一台機器人 BTCUSDT、ETHUSDT 各 50%
  When 我在編輯頁加入 SOLUSDT
  Then 三個標的各是 33.33
```

### US-03 — [priority: P0] 合計、未動用與送出前擋下
**As a** 機器人擁有者, **I want** 即時看到合計與未動用、填錯時送出前就被擋下, **so that** 我不必送出去才知道分配不合法。

```gherkin
Scenario: 合計正好 100
  Given BTCUSDT 60、ETHUSDT 40
  When 我看部位規劃
  Then 合計顯示 100%，未動用顯示 0%
  And 可以送出

Scenario: 合計少於 100
  Given BTCUSDT 30、ETHUSDT 30
  When 我看部位規劃
  Then 合計顯示 60%，未動用顯示 40%
  And 可以送出

Scenario: 合計超過 100
  Given BTCUSDT 70、ETHUSDT 40
  When 我想送出
  Then 合計 110% 以警示語氣顯示
  And 被擋下，說「分配比例加起來是 110%，不得超過 100%」

Scenario: 分配比例為零
  Given BTCUSDT 0
  When 我想送出
  Then 被擋下，說「BTCUSDT 的分配比例必須大於 0、不超過 100（單位：%）」

Scenario: 分配比例超過 100
  Given BTCUSDT 100.5
  When 我想送出
  Then 被擋下，說「BTCUSDT 的分配比例必須大於 0、不超過 100（單位：%）」

Scenario: 超過兩位小數
  Given BTCUSDT 33.333
  When 我想送出
  Then 被擋下，說「BTCUSDT 的分配比例最多到小數點後兩位」

Scenario: 送出每個標的的分配
  Given 部位規劃打開，BTCUSDT 60、ETHUSDT 40
  When 我送出
  Then 交易服務收到 BTCUSDT 60、ETHUSDT 40

Scenario: 部位規劃收著不送分配
  Given 部位規劃收著
  When 我送出
  Then 交易服務沒有收到任何分配比例

Scenario: 交易服務仍拒絕
  Given 交易服務拒絕這次儲存並說了一句話
  When 我送出
  Then 留在這一頁，顯示交易服務的那一句，填的內容都還在
```

### US-04 — [priority: P0] 每個標的分到多少、押不下時提醒
**As a** 機器人擁有者, **I want** 每個標的旁邊看到分到多少、押不下固定金額時被提醒, **so that** 我知道要不要把總金額調大。

```gherkin
Scenario: 分到的資金不取整
  Given 總金額 1000，BTCUSDT 33.33
  When 我看 BTCUSDT 那一格
  Then 旁邊顯示「分到 333.3」

Scenario: 總金額空白
  Given 總金額空白
  When 我看任何一格
  Then 不顯示分到多少

Scenario: 分到的資金押不下固定金額
  Given 總金額 50、每次開倉固定金額 50，BTCUSDT、ETHUSDT 各 50
  When 我看那兩格
  Then 各顯示「分到 25」並提醒「分到的資金不足，押不下 50」
  And 仍可送出

Scenario: 正好押得下
  Given 總金額 100、固定金額 50，BTCUSDT 50
  When 我看 BTCUSDT 那一格
  Then 顯示「分到 50」，不提醒

Scenario: 全押永遠押得下
  Given 總金額 50、全押，BTCUSDT、ETHUSDT 各 50
  When 我看那兩格
  Then 各顯示「分到 25」，不提醒
```

### US-05 — [priority: P0] 詳細區看得到分配
**As a** 機器人擁有者, **I want** 詳細區每個監聽標的列出分配比例與分到的資金, **so that** 不必打開編輯頁就知道每個標的能押多少。

```gherkin
Scenario: 有部位規劃的機器人
  Given 一台機器人總金額 1000，BTCUSDT 60%、ETHUSDT 40%
  When 我打開它的詳細區
  Then BTCUSDT 寫「分配 60% · 分到 600」、ETHUSDT 寫「分配 40% · 分到 400」

Scenario: 沒有部位規劃的機器人
  Given 一台沒有部位規劃的機器人，BTCUSDT 100%
  When 我打開它的詳細區
  Then BTCUSDT 寫「分配 100%」，不寫分到多少
```

---

## 4. Business Flow & Logic

- **分到的資金＝總金額 × 分配比例 ÷ 100**，不取整；只有總金額與那一格分配比例都合法時才顯示。
- **平均分配**：100 ÷ 標的數，無條件捨去到小數點後兩位，零頭留在未動用。
- **自動重算**：加入或拿掉監聽標的時，若目前的分配仍等於原本那一串標的的平均分配，就改成新那一串的平均分配；否則留著的標的保留數字、新加入的留空、拿掉的那一份變成未動用。「平均分配」動作永遠換回平均分配。
- **送出前的規則與檢查順序**（與交易服務同一套、同一句話）：每個監聽標的都有分配比例 → 每一格大於 0、不超過 100 → 每一格最多兩位小數 → 合計不超過 100。在機器人其他欄位與部位規劃本身的規則之後才問。部位規劃收著時一句都不問、也不送。
- **未動用＝100 − 合計**；合計超過 100 時改以警示語氣顯示合計，未動用不顯示。
- **押不下的提醒**：只在每次開倉固定金額時，固定金額大於那個標的分到的資金才提醒；只提醒、不擋。
- **Edge Cases:** 打不出數字的字當作不合法的分配比例（說「必須大於 0、不超過 100」）；**每一格都留空**就是不給（與交易服務「要嘛都給、要嘛都不給」一致），交易服務照它的規則處理；交易服務的拒絕原樣顯示、頁面不重置。

---

## 5. UI/UX Design & Interaction

- **Prototype Link:** N/A
- **Key Interactions:**
  - 部位規劃區塊內，總金額那一格的名稱與說明依機器人種類（現貨：總金額；合約：總金額（保證金）＋名目說明）。
  - 區塊內一份「資金分配」：每個監聽標的一列（標的、分配比例輸入、分到多少、押不下的提醒），下方一行「合計 X% · 未動用 Y%」與「平均分配」動作。
  - 詳細區（清單旁展開區與編輯頁）每個監聽標的多一行「分配 X% · 分到 Y」。
  - 中英文皆有；手機寬度下每一列可折行，不出現橫向捲軸。

---

## 6. Non-Functional Requirements

- **Performance:** 合計、未動用與分到多少隨輸入即時更新，不問交易服務。
- **Security:** N/A（沿用既有登入）。
- **Compatibility:** 部位規劃收著時送出的內容與今天相同。

---

## 7. Dependencies & Risks

- **External Dependencies:** 交易服務同名切片（go-trading PR #113）上線後才會回每個監聽標的的分配比例、才收得下分配。
- **Known Risks:** 操作台的規則是交易服務規則的副本；兩邊不同步時以交易服務的拒絕為準（照原句顯示）。

---

## 8. Appendix

- 交易服務同名切片：`go-trading/.sdd/2026-10-20-multi-symbol-capital-allocation/`。
- 前一刀：`.sdd/2026-10-20-multi-symbol-strategy-bot/`。
