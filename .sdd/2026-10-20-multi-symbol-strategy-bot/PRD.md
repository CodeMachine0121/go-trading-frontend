# Product Requirements Document (PRD) — 一台機器人盯多個交易標的（操作台）

**Status:** Finalized
**Version:** v1.0
**Owner:** James Hsueh
**Stakeholders:** Engineering（操作台；與交易服務同一版一起更新）

---

## 1. Background & Goal (Why & Goal)

- **Problem Statement:** 交易服務已經讓一台策略機器人同時盯 1 到 10 個監聽標的，每個監聽標的各自記著上一次送出的信號、規則打架、標的停擺原因與機器人持倉。操作台仍只會挑一個標的、只畫一份狀態，執行紀錄也分不出是哪一個標的；交易服務也不再接受舊的單一標的寫法，所以不改就建不了、改不了機器人。
- **Expected Outcome:**
  - 擁有者在操作台上建立、修改一台盯 1 到 10 個監聽標的的機器人；看得到每一個監聽標的現在的狀態。
  - 整台停擺與單一標的停擺在清單上一眼分得開。
  - 執行紀錄每一輪標出標的，並可只看某一個標的。
- **Out of Scope:**
  - 同時持倉數量上限、個別監聽標的覆寫設定。
  - 交易日誌從機器人那一輪記一筆（那一輪本來就只屬於一個標的，由交易服務帶出，操作台不變）。
  - 一台機器人混合現貨與合約標的。

---

## 2. User Personas

- **Primary Role(s):** 機器人擁有者。
- **Usage Context:** 桌機上建立與調整機器人；手機上打開清單確認哪一台、哪一個標的出事。

---

## 3. User Stories & Acceptance Criteria

### US-01 — [priority: P0] 挑多個監聽標的
**As a** 機器人擁有者, **I want** 建立或修改機器人時挑一串交易標的, **so that** 同一份交易策略只設定一次就能盯好幾個標的。

```gherkin
Scenario: 加入第二個標的
  Given 現貨機器人表單已挑 BTCUSDT
  When 我再挑 ETHUSDT 並加入
  Then 監聽標的依序是 BTCUSDT、ETHUSDT
  And 送出的監聽標的是 BTCUSDT 與 ETHUSDT

Scenario: 只有一個標的也存得下去
  Given 表單只挑了一個標的，其餘欄位都合格
  When 我送出
  Then 存得下去

Scenario: 已滿 10 個不能再加
  Given 表單已挑 10 個標的
  When 我想再加一個
  Then 加不進去，畫面說「一台機器人最多盯 10 個交易標的」

Scenario: 一個都沒挑
  Given 表單一個標的都沒挑，其餘欄位都合格
  When 我想送出
  Then 被擋下，說「必須指定這台機器人要盯哪些交易標的」

Scenario: 同一個標的不重複加入
  Given 表單已挑 BTCUSDT
  When 我再加入 btcusdt
  Then 監聽標的仍只有一個 BTCUSDT

Scenario: 拿掉一個標的
  Given 表單已挑 BTCUSDT 與 ETHUSDT
  When 我拿掉 ETHUSDT 後送出
  Then 送出的監聽標的只有 BTCUSDT

Scenario: 打開既有機器人看到它的監聽標的
  Given 一台機器人盯 BTCUSDT 與 ETHUSDT
  When 我打開它的編輯頁
  Then 表單上的監聽標的是 BTCUSDT 與 ETHUSDT
```

### US-02 — [priority: P0] 移除還沒空手的標的時說清楚
**As a** 機器人擁有者, **I want** 移除被拒絕時知道原因與下一步, **so that** 我知道要先處理倉位或等委託做完。

```gherkin
Scenario: 移除還有機器人持倉的標的
  Given 合約機器人的 ETHUSDT 機器人持倉為做多 0.5
  When 我拿掉 ETHUSDT 後儲存
  Then 留在編輯頁，顯示「要移除的交易標的還有機器人持倉，要先讓它空手才能移除；監聽標的沒有改變」

Scenario: 移除還有沒做完的自動下單的標的
  Given 合約機器人的 ETHUSDT 有一筆還沒做完的自動下單
  When 我拿掉 ETHUSDT 後儲存
  Then 留在編輯頁，顯示「要移除的交易標的還有沒做完的自動下單，要等它做完才能移除；監聽標的沒有改變」

Scenario: 移除空手的標的
  Given ETHUSDT 空手、沒有沒做完的自動下單
  When 我拿掉 ETHUSDT 後儲存
  Then 存好，回到清單並顯示「更改成功」
```

### US-03 — [priority: P0] 看得到每個監聽標的的狀態
**As a** 機器人擁有者, **I want** 清單與詳細區列出每個監聽標的的狀態, **so that** 我知道哪個標的說了什麼、哪個出事、哪個有倉。

```gherkin
Scenario: 上次送出買入
  Given BTCUSDT 上一次送出的信號是買入
  When 我看機器人清單
  Then BTCUSDT 那一格寫「BTCUSDT · 買入」

Scenario: 還沒送出過
  Given SOLUSDT 沒有上一次送出的信號
  When 我看機器人清單
  Then SOLUSDT 那一格寫「SOLUSDT · 還沒送出過」

Scenario: 一個標的規則打架
  Given ETHUSDT 規則打架
  When 我看機器人清單
  Then ETHUSDT 那一格寫「ETHUSDT · 規則打架了」並以警示語氣顯示
  And 機器人狀態旁標出「規則打架了」

Scenario: 只有部分標的停擺
  Given 機器人執行中，ETHUSDT 標的停擺，原因是某一支策略腳本算不出來
  When 我看機器人清單並打開它的詳細區
  Then 機器人狀態是「執行中」，旁邊另標「1 個標的停擺」
  And ETHUSDT 那一格寫「ETHUSDT · 停擺」
  And 詳細區的 ETHUSDT 寫出「有一支策略腳本算不出來」

Scenario: 整台停擺
  Given 整台機器人停擺，原因是它用的那一份交易策略找不到了
  When 我看機器人清單
  Then 機器人狀態是「停擺」並寫出「它用的那一份交易策略找不到了」
  And 不另標「幾個標的停擺」

Scenario: 合約機器人每個標的的機器人持倉
  Given 合約機器人 BTCUSDT 機器人持倉做多 0.01、ETHUSDT 空手
  When 我打開它的詳細區
  Then BTCUSDT 寫「機器人持倉：多 0.01」、ETHUSDT 寫「機器人持倉：空手」

Scenario: 現貨機器人沒有機器人持倉
  Given 現貨機器人
  When 我打開它的詳細區
  Then 每個監聽標的都不出現機器人持倉

Scenario: 自動下單開關旁不再只講一份持倉
  Given 合約機器人盯 BTCUSDT 與 ETHUSDT
  When 我打開它的編輯頁
  Then 自動下單開關旁不顯示機器人持倉
  And 每個監聽標的各自顯示它的機器人持倉
```

### US-04 — [priority: P1] 執行紀錄依標的看
**As a** 機器人擁有者, **I want** 每一輪標出標的、並能只看某一個標的, **so that** 盯十個標的時仍找得到某一個標的的經過。

```gherkin
Scenario: 每一輪標出標的
  Given 機器人盯 BTCUSDT 與 ETHUSDT，Run 101 是 BTCUSDT、Run 102 是 ETHUSDT
  When 我展開執行紀錄
  Then Run 102 那一列寫著 ETHUSDT、Run 101 那一列寫著 BTCUSDT

Scenario: 只看某一個標的
  Given 同上
  When 我在執行紀錄挑 ETHUSDT
  Then 只列出 ETHUSDT 的那幾輪，由新到舊

Scenario: 回到全部標的
  Given 執行紀錄已挑 ETHUSDT
  When 我改挑「全部標的」
  Then 兩個標的的紀錄都列出

Scenario: 只盯一個標的時不給挑
  Given 機器人只盯 BTCUSDT
  When 我展開執行紀錄
  Then 不出現挑標的的選項，每一列仍寫著 BTCUSDT
```

---

## 4. Business Flow & Logic

- **監聽標的的規則**（送出前在操作台擋下，與交易服務同一套說法）：1 到 10 個；去前後空白、轉大寫後不得重複（說「交易標的 BTCUSDT 重複了」）；一個都沒有說「必須指定這台機器人要盯哪些交易標的」；超過 10 個說「一台機器人最多盯 10 個交易標的」。加入時已在清單上的不再加、已滿 10 個時不再給加。
- **順序**：依加入先後；打開既有機器人時照交易服務給的順序。
- **修改**：表單上的那一串就是送出的完整清單。合約標的不在追蹤名單、槓桿超過某個標的上限等，照交易服務的說法呈現（含標的名稱）。
- **移除被拒**：兩種原因（還有機器人持倉、還有沒做完的自動下單）各自一句說明；頁面留著、使用者填的不會被洗掉。
- **每個監聽標的的一眼狀態**：標的停擺 → 「停擺」（危險語氣）；否則規則打架 → 「規則打架了」（警示語氣）；否則 → 上一次送出的信號（買入／賣出／持有／還沒送出過，一般語氣）。認不得的停擺原因當作沒有停擺。
- **機器人層級**：整台停擺只看機器人自己的停擺原因（且不在執行中）；部分標的停擺 = 機器人沒有整台停擺、且至少一個監聽標的停擺，以警示語氣標「N 個標的停擺」。任一監聽標的規則打架，機器人旁標「規則打架了」。清單上方「停擺」數字只算整台停擺。
- **機器人持倉**：只有合約機器人，在每個監聽標的上顯示；自動下單開關旁不再顯示。
- **執行紀錄篩選**：選項是「全部標的」加上機器人目前的監聽標的；只有一個監聽標的時不給挑。換一台機器人、或立即運算之後，回到「全部標的」。已移除標的的舊紀錄在「全部標的」裡看得到。
- **Edge Cases:** 挑標的的清單讀不到時照舊說明讀不到、已加入的照舊顯示；篩選讀取中又換了另一個標的，只顯示最後挑的那一個的結果。

---

## 5. UI/UX Design & Interaction

- **Prototype Link:** N/A
- **Key Interactions:**
  - 表單：「盯哪些交易標的（最多 10 個）」一格挑標的＋「加入」鍵；已加入的排成一排小標籤，各有一個移除鍵。
  - 清單：每列一欄「監聽標的」，每個標的一個小標籤「標的 · 狀態」；停擺的標的標籤滑過時看得到原因。
  - 詳細區（清單旁展開區與編輯頁）：一份「監聽標的」清單，每列標的（合約標出永續合約）、上次訊號、規則打架、停擺原因、機器人持倉。
  - 執行紀錄：每列輪次編號旁寫標的；上方一個「標的」選單。
  - 頁面副標改成「盯一到十個標的」的說法；中英文皆有。

---

## 6. Non-Functional Requirements

- **Performance:** 執行紀錄篩選由交易服務篩，不在畫面先撈全部再篩。
- **Security:** N/A（沿用既有登入）。
- **Compatibility:** 不保留舊的單一標的寫法；手機寬度下標籤可換行，不出現橫向捲軸。

---

## 7. Dependencies & Risks

- **External Dependencies:** 交易服務 go-trading PR #112（一台機器人盯多個交易標的）必須先合併部署。
- **Known Risks:** 交易服務拒絕移除時沒有另外指出是哪一個標的；以編輯頁上方每個標的的持倉補足。

---

## 8. Appendix

- 交易服務同名切片：`go-trading/.sdd/2026-10-20-multi-symbol-strategy-bot/`。
