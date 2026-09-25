# Product Requirements Document (PRD)

**Status:** Finalized
**Version:** v1.0
**Owner:** James Hsueh
**Stakeholders:** Engineering

---

## 1. Background & Goal

- **Problem Statement:** 後端把助手對使用者既有策略腳本／交易策略的改寫改成**待確認修改**，但畫面看不到、也按不了。
- **Expected Outcome:** 待確認修改出現在所屬問答下方，能展開看完整內容，能就地確認或拒絕，被擋下時就地說明原因。
- **Out of Scope:** 差異比對、獨立清單頁、把結果帶回助手。

## 2. User Personas

- **Primary Role:** 已登入的使用者，對話與待確認修改的擁有者。
- **Usage Context:** 桌面或手機瀏覽器的助手抽屜或助手整頁。

## 3. User Stories & Acceptance Criteria

### US-01 — 看得到有一筆修改在等我 [P0]
**As a** 使用者，**I want** 在那一次問答底下看到助手提出的修改，**so that** 我知道它還沒生效、要我決定。

```gherkin
Scenario: 寫完的回答下方列出它的待確認修改
  Given 一則已寫完的回答帶著一筆等你確認的策略腳本修改「二十根均線」
  When 我打開這段對話
  Then 那則回答下方出現「策略腳本「二十根均線」」與狀態「等你確認」
  And 它有「確認」與「拒絕」兩個動作

Scenario: 沒寫完的問答把它列在提問下方
  Given 一則失敗的問答帶著一筆等你確認的修改
  When 我打開這段對話
  Then 那一筆出現在那則提問下方

Scenario: 處理過的只顯示狀態
  Given 一筆已確認、一筆已拒絕的修改
  When 我打開這段對話
  Then 它們分別顯示「已確認」與「已拒絕」
  And 兩筆都沒有確認或拒絕的動作

Scenario: 看得到改成的完整內容
  Given 一筆等你確認的修改
  When 我展開它
  Then 我看到它改成的完整內容

Scenario: 交易策略的修改說得出是交易策略
  Given 一筆等你確認的交易策略修改「動能追蹤」
  When 我打開這段對話
  Then 它顯示「交易策略「動能追蹤」」
```

### US-02 — 就地確認或拒絕 [P0]
**As a** 使用者，**I want** 在那一筆上直接按確認或拒絕，**so that** 不必離開對話。

```gherkin
Scenario: 確認
  Given 一筆等你確認的修改
  When 我按確認
  Then 系統送出確認，並重讀這段對話
  And 那一筆顯示「已確認」

Scenario: 拒絕
  Given 一筆等你確認的修改
  When 我按拒絕
  Then 系統送出拒絕，並重讀這段對話
  And 那一筆顯示「已拒絕」

Scenario: 送出中不能再按
  Given 我按下確認，結果還沒回來
  When 我再按那一筆的確認或拒絕
  Then 不會再送出任何一次

Scenario: 被擋下時就地說原因
  Given 後端以「這幾台機器人正在用它跑：早盤突破，請先停止它們」擋下確認
  When 我按確認
  Then 那一筆底下出現「這幾台機器人正在用它跑：早盤突破，請先停止它們」
  And 那一筆仍是等你確認，可以再按

Scenario: 連不上後端
  Given 後端連不上
  When 我按確認
  Then 那一筆底下出現連不上後端的說明
```

## 4. Business Flow & Logic

- 狀態只來自後端：按下後一律重讀整段對話，不在畫面自己改狀態。
- 認不出來的狀態當成「已處理」顯示且不給動作——寧可少一顆鍵，也不讓人對一筆不確定的東西按確認。
- 認不出來的種類顯示為「項目」。
- 一筆的錯誤說明在它再被處理、使用者讀回這段對話、換到別段或開新對話時清掉；**作答中的回頭詢問不清**——它每兩秒一次，那一句會來不及讀。
- **一次只處理一筆**：有一筆在等結果時，畫面上每一筆的鍵都鎖住——兩筆同時送出時誰先生效說不準，而那正是「提出後已被改過」要擋的事。
- 送出成功但重讀失敗時，那一筆暫時仍顯示舊狀態；下一次讀回這段對話即補上，再按一次會得到「已經處理過了」。

## 5. UI/UX Design & Interaction

- 放在訊息泡泡下方的一張小卡：標題（種類「名稱」）、狀態徽章、可展開的內容（等寬字）、兩顆鍵（確認為主要、拒絕為次要）、錯誤一行。
- 抽屜與整頁共用同一個元件。

## 6. Non-Functional Requirements

- **Security:** 內容以純文字顯示，不當作 HTML。
- **Compatibility:** 後端沒有帶這一項時與今天完全相同。

## 7. Dependencies & Risks

- 依賴後端 `POST /chat/pending-revisions/{id}/confirm|reject` 與對話回應中的 `pendingRevisions`。

## 8. Appendix

- 後端切片：go-trading `.sdd/2026-09-26-assistant-injection-hardening/`
