# Product Requirements Document (PRD)

**Status:** Finalized
**Version:** v1.0
**Owner:** James Hsueh
**Stakeholders:** 使用者本人（看盤、在圖上做記號）

---

## 1. Background & Goal (Why & Goal)

- **Problem Statement:** 畫完一個繪圖，工具就跳回游標；連續畫同一種要一直重選工具。只有打開「連續繪圖」開關才不會跳回，
  而這個開關不顯眼、按下去也看不出差別。
- **Expected Outcome:**
  1. 畫完任一種繪圖，工具都留在原本選的那一個。
  2. 回到游標只靠明確的動作：Esc、游標那一格、再按一次正在用的那一格。
  3. 「連續繪圖」開關拿掉，工具列少一個看不懂的按鈕。
- **Out of Scope:** 跨頁記住選的工具；保留「畫完回到游標」的選項。

---

## 2. User Personas

- **Primary Role(s):** 看盤的人——專案作者本人，單人使用。

---

## 3. User Stories & Acceptance Criteria

### US-01 — 畫完一個，工具不變 [priority: P0]
**As a** 看盤的人, **I want** 畫完一個繪圖後工具仍是我選的那一個, **so that** 我能連著畫好幾條線或好幾個框，不必每次重選。

```gherkin
Scenario: 拖曳畫完一條趨勢線
  Given 選了趨勢線
  When 在 A 按下、拖到 B 放開
  Then 圖上出現 A 到 B 的一條線
  And 它被選取
  And 目前的工具仍是趨勢線

Scenario: 點一下畫好水平線
  Given 選了水平線
  When 在 60000 點一下
  Then 圖上出現 60000 的水平線
  And 目前的工具仍是水平線

Scenario: 畫完一筆奇異筆
  Given 選了奇異筆
  When 畫完一筆
  Then 目前的工具仍是奇異筆
```

### US-02 — 明確地回到游標 [priority: P0]
**As a** 看盤的人, **I want** 用明確的動作回到游標, **so that** 我畫完之後能去選取、拖動已經畫好的東西。

```gherkin
Scenario: 按 Esc
  Given 選了矩形、剛畫完一個
  When 按 Esc
  Then 目前的工具回到游標

Scenario: 再按一次正在用的那一格
  Given 選了矩形、剛畫完一個
  When 再按一次形狀那一格
  Then 目前的工具回到游標
```

### US-03 — 沒有連續繪圖開關 [priority: P1]
**As a** 看盤的人, **I want** 工具列上只有有用的開關, **so that** 我不會猜一個按鈕是做什麼的。

```gherkin
Scenario: 工具列上的開關
  When 看左側工具列分隔線下方
  Then 只有磁鐵模式、鎖定所有繪圖、隱藏所有繪圖三個開關與移除所有繪圖
```

---

## 4. Business Flow & Logic

畫完一個 → 收進繪圖板、選取它、記一步、稍後存回帳號 → **工具不變**。
點數上限擋下時不收、提示、不記一步，工具同樣不變。

---

## 5. UI/UX Design & Interaction

- 左側工具列拿掉「連續繪圖」那一顆（筆加一個加號的圖示）與它的提示文字。
- 正在用的工具那一格持續亮著，畫完之後也亮著。

---

## 6. Dependencies & Risks

- 只動前端畫面狀態，不改交易服務與外掛。
- 風險：習慣畫完就點既有繪圖去拖的人，現在會多畫一個；以 Esc／再按一次那一格回到游標，並靠上一步復原。
