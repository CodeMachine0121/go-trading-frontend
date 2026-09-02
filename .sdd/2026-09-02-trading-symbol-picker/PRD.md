# Product Requirements Document (PRD)

**Feature:** 交易標的選單
**Status:** Finalized
**Version:** v1.0
**Owner:** James Hsueh
**Stakeholders:** 前端（go-trading-frontend）、後端（go-trading）

---

## 1. Background & Goal (Why & Goal)

- **Problem Statement:**
  交易標的是一個要手打的欄位。打錯一個字母不會有人告訴你，畫面只會說「查無 K 線」——
  而那句話跟「這檔真的沒資料」長得一模一樣。使用者於是開始懷疑時間填錯、懷疑後端沒開，
  就是不會懷疑自己少打了一個字母。

- **Expected Outcome:**
  凡是要讀行情的畫面，交易標的都從清單裡挑，打錯字這件事從此不會發生；
  而且清單上的每一檔都真的查得出東西（後端給的是「實際握有 K 線」的那些）。

- **Out of Scope:**
  - 在畫面上新增、修改或移除清單裡的交易標的。
  - 交易標的的搜尋、篩選、分組。
  - 清單旁邊附帶的其他資訊（有幾根、最新一根是什麼時候）。
  - 把清單記下來重複使用——每個畫面各自取一次。
  - 既有的查詢條件、圖表縮放、指標算式等行為。

---

## 2. User Personas

- **Primary Role(s):** 專案作者本人。單人使用、本機執行。
- **Usage Context:** 桌機瀏覽器。每次打開一個要讀行情的畫面，第一件事就是決定「看哪一檔」。

---

## 3. User Stories & Acceptance Criteria

### US-01 — 從清單裡挑，不用手打 [priority: P0]

**As a** 要讀行情的人，**I want** 交易標的是一份可以挑的清單，
**so that** 我不會因為打錯一個字母而以為沒有資料。

```gherkin
Scenario: 讀行情的畫面呈現可挑的清單
  Given 後端說系統握有 BTCUSDT 與 ETHUSDT
  When 進入 K 線圖表
  Then 交易標的呈現為一份可挑的清單，內含 BTCUSDT 與 ETHUSDT

Scenario: 挑另一檔就換那一檔的行情
  Given 清單上有 BTCUSDT 與 ETHUSDT，目前是 BTCUSDT
  When 挑 ETHUSDT
  Then 畫面改以 ETHUSDT 取行情

Scenario: 依後端給的順序呈現
  Given 後端依序說有 BTCUSDT、ETHUSDT、SOLUSDT
  When 觀察清單
  Then 清單依這個順序呈現
```

### US-02 — 原本帶的那一檔不在清單上時 [priority: P0]

**As a** 要讀行情的人，**I want** 畫面上顯示的那一檔是真的挑得到的，
**so that** 我不會盯著一個查不出東西、也選不掉的名字。

```gherkin
Scenario: 原本帶的那一檔就在清單上
  Given 畫面原本帶 BTCUSDT
  And 後端說有 BTCUSDT 與 ETHUSDT
  When 取回清單
  Then 仍然是 BTCUSDT，不做任何切換

Scenario: 原本帶的那一檔不在清單上
  Given 畫面原本帶 BTCUSDT
  And 後端只有 ETHUSDT 與 SOLUSDT
  When 取回清單
  Then 改選 ETHUSDT

Scenario: 後端一檔都沒有
  Given 畫面原本帶 BTCUSDT
  And 後端一個交易標的都沒有
  When 取回清單
  Then 仍然是 BTCUSDT
  And 畫面說明目前沒有任何交易標的
```

### US-03 — 取不到清單時說清楚 [priority: P0]

**As a** 要讀行情的人，**I want** 選單空的時候知道為什麼，
**so that** 我不會對著一個空白的選單猜是後端沒開還是真的沒資料。

```gherkin
Scenario: 連不上後端
  Given 後端服務沒有啟動
  When 取交易標的清單
  Then 畫面說明取不到交易標的清單
  And 不呈現一個空白的選單

Scenario: 取清單失敗時仍看得出目前是哪一檔
  Given 畫面原本帶 BTCUSDT
  When 取交易標的清單失敗
  Then 畫面上仍然顯示 BTCUSDT
```

### US-04 — 建資料的地方仍然手打 [priority: P0]

**As a** 要建一根新交易標的的 K 線的人，**I want** 新增表單仍然可以自己打名字，
**so that** 我建得出系統還沒有任何資料的那一檔。

```gherkin
Scenario: 新增一根系統還沒有過的交易標的
  Given 系統沒有任何 XRPUSDT 的資料
  When 在新增 K 線的表單填交易標的
  Then 可以直接打出 XRPUSDT，不受清單限制

Scenario: 修改既有的一根時交易標的仍然唯讀
  Given 正在修改一根既有的 K 線
  When 觀察交易標的欄位
  Then 它是唯讀的
```

---

## 4. Business Flow & Logic

**Flow:**

1. 進入一個要讀行情的畫面。
2. 畫面向後端要「系統握有哪幾檔」。
3. 取到清單 → 交易標的欄位呈現為可挑的清單；原本帶的那一檔不在裡面就改選第一個。
4. 取到空清單 → 維持原本那一檔，並說明目前沒有任何交易標的。
5. 取不到 → 說明取不到，維持原本那一檔。

**Core Business Rules:**

- **BR-1 清單來源**：一律來自後端，畫面不寫死任何標的名稱。
- **BR-2 順序**：依後端給的順序，畫面不重排。
- **BR-3 落單修正**：清單非空、且目前這一檔不在清單上時，改選清單上的第一個。
- **BR-4 空清單**：清單是空的時候**維持目前這一檔**（清空欄位會變成「請指定交易標的」，
  那是在怪使用者沒填，但真正的原因是後端還沒有任何資料）。
- **BR-5 讀寫分開**：讀行情的畫面從清單挑；新增／修改 K 線的表單維持手打（修改時仍唯讀）。

**Edge Cases:**

- 取清單成功但畫面已經離開 → 沒有畫面要更新，不做任何事。
- 取清單與取行情同時進行 → 兩者互不等待；行情先回來就先畫。

---

## 5. UI/UX Design & Interaction

- **Key Interactions:**
  - 交易標的：下拉式選單，選項就是清單。
  - 清單載入中：選單暫時不能操作。
  - 清單是空的：選單不能操作，欄位下方說明「後端目前沒有任何交易標的」。
  - 取不到清單：選單不能操作，欄位下方說明取不到，語氣與既有的「連不上後端」一致。
  - 欄位本身的錯誤（例如未指定交易標的）沿用既有的欄位錯誤呈現方式。

---

## 6. Non-Functional Requirements

- **NFR-1 不擋畫面**：取清單與取行情各自進行，取清單慢不影響行情先畫出來。
- **NFR-2 不寫死**：**選單裡的選項**不得有任何寫死的交易標的名稱——它們一律來自後端。
  各畫面「進畫面時先帶哪一檔」的起點（目前是 BTCUSDT）不在此限：
  它只是一個起點，清單回來之後會依 BR-3 修正；完全不帶的話畫面一進去就會顯示
  「請指定交易標的」，那是在怪使用者沒填。

---

## 7. Dependencies & Risks

- **External Dependencies:** 後端 `go-trading` 的可查交易標的清單能力
  （`.sdd/2026-09-02-tradable-symbol-list/`）。
- **Known Risks:**
  - 三個畫面各自取一次清單，同一份資料一次進站會被要三次。
    以單人本機使用而言可以接受；要處理時，快取屬於 Application 或 composable，不進 Domain。

---

## 8. Appendix

- 需求共識：`.sdd/2026-09-02-trading-symbol-picker/BRIEF.md`
- 通用語言：`.sdd/UL-MAP.md`
- 後端對應切片：`../go-trading/.sdd/2026-09-02-tradable-symbol-list/`
