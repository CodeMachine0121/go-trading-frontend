# Product Requirements Document (PRD) — 行情維護需要登入

**Status:** Finalized
**Version:** v1.0
**Owner:** James Hsueh
**Stakeholders:** Engineering

---

## 1. Background & Goal (Why & Goal)

- **Problem Statement:** 交易服務那一側即將把「改動行情」關到已放行的登入之後（新增、修改、刪除 K 線，
  補齊一檔，歷史同步與它的進度，追蹤名單的加入與移出；現貨與合約都一樣）。操作台上用得到這些的動作，
  那一天之後若沒帶著身分送出，或過期時不照常救回，就會變成一個按了沒用的按鈕。
- **Expected Outcome:** 交易服務關門之後，操作台上每一個行情維護動作照常可用；登入過期照常自己救回，
  救不回來照常請人重新登入；看行情的動作一點都不變。
- **Out of Scope:**
  - 交易服務那一側的把關本身。
  - 在操作台上新增今天沒有的動作（追蹤名單、歷史同步、合約 K 線維護）。
  - 讓沒登入的人看得到任何行情頁。

---

## 2. User Personas

- **Primary Role(s):** 已登入且已被放行的操作者（本系統沒有角色之分）。
- **Usage Context:** 桌上瀏覽器，在 K 線頁維護 K 線、在現貨圖表上按「立刻更新」；常在同一頁停留很久。

---

## 3. User Stories & Acceptance Criteria

### US-01 — 行情維護動作帶著身分送出 [priority: P0]
**As a** 已放行的操作者, **I want** 我維護行情時系統認得是我, **so that** 交易服務關門之後我照樣改得動行情。

```gherkin
Scenario: 新增一根 K 線時帶著身分
  Given 操作者已登入且已被放行
  When 他在 K 線頁新增一根 K 線
  Then 那一次送出帶著他的身分
  And 新增成功，畫面照常重查

Scenario: 修改一根 K 線時帶著身分
  Given 操作者已登入且已被放行
  When 他修改一根 K 線
  Then 那一次送出帶著他的身分
  And 修改成功

Scenario: 刪除一根 K 線時帶著身分
  Given 操作者已登入且已被放行
  When 他確認刪除一根 K 線
  Then 那一次送出帶著他的身分
  And 刪除成功

Scenario: 立刻更新時帶著身分
  Given 操作者已登入且已被放行，正在看台股圖
  When 他按「立刻更新」
  Then 補齊的要求帶著他的身分送出
  And 畫面說出補到幾根並重畫
```

### US-02 — 登入過期時與其他需要登入的動作一樣處理 [priority: P0]
**As a** 在同一頁停留很久的操作者, **I want** 過期的登入被自己救回, **so that** 我不必因為維護一根 K 線而重新登入。

```gherkin
Scenario: 登入過期但救得回來
  Given 操作者的登入憑證剛過期，續用憑證仍然有效
  When 他修改一根 K 線
  Then 系統自己換新一次並把修改重送一次
  And 修改成功，他不會被帶離這一頁

Scenario: 登入過期而且救不回來
  Given 操作者的登入憑證過期，續用憑證也不算數了
  When 他按「立刻更新」
  Then 那一次要求不會再重送第二次
  And 記著的登入被丟掉，他被帶回登入畫面
```

### US-03 — 沒登入的人拿不到這些動作，看行情照舊 [priority: P1]
**As a** 系統擁有者, **I want** 行情維護只給已放行的人, **so that** 共用的行情不被任何人亂改。

```gherkin
Scenario: 沒登入的人打開 K 線頁
  Given 沒有任何登入
  When 他打開 K 線頁
  Then 他被帶到登入畫面，看不到新增、修改、刪除
  And 登入並被放行之後回到 K 線頁

Scenario: 看行情照舊
  Given 操作者已登入
  When 他查一段 K 線或看圖
  Then 結果與今天完全一樣
```

---

## 4. Business Flow & Logic

- **Core Business Rules:**
  - 每一次送往交易服務的請求，只要記著一段登入就帶著那份身分；行情維護不是例外，也不另開一條路。
  - 過期處理只有一條：先救回並重送一次，救不回來才請人重新登入。
  - 操作台整個只給登入且已被放行的人；還沒被放行的人只看得到等待開通那一頁。
- **Edge Cases:**
  - 交易服務說「還沒被放行」：操作台的門已經不讓這種人進到 K 線頁；若仍遇上，照一般的拒絕把原因說出來。
  - 連不上交易服務：照今天的說法。

---

## 5. UI/UX Design & Interaction

- 沒有新的畫面或文字；所有動作、確認、錯誤訊息照舊。

---

## 6. Non-Functional Requirements

- 安全：身分只在瀏覽器記著的那一份裡，不寫進網址。
- 相容：交易服務關門前後，操作台同一版都能用。

---

## 7. Dependencies & Risks

- 依賴交易服務的「行情維護需要登入」一刀；**操作台這一版必須先上線**，交易服務才關門。
- 風險：日後新增的行情維護動作若繞過共用的請求路徑，會漏帶身分——由測試釘住。
