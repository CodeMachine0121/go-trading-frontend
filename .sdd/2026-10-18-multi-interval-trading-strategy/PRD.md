# Product Requirements Document (PRD) — 交易策略編輯畫面接受多種粗細

**Status:** Finalized
**Version:** v1.0
**Owner:** James Hsueh
**Stakeholders:** 前端、策略研究

---

## 1. Background & Goal (Why & Goal)

- **Problem Statement:** 後端已接受信號來源各用各的彙總刻度，但編輯畫面仍擋下「刻度不一樣」的交易策略，三重濾網這類組合在畫面上存不下去。
- **Expected Outcome:** 刻度不同的交易策略在畫面上存得下去，而且使用者看得到重演會以哪一個刻度為步調。
- **Out of Scope:** 回測、機器人畫面的顯示；新增刻度種類。

---

## 2. User Personas

- **Primary Role(s):** 使用者（在網頁組合信號來源的交易員）。
- **Usage Context:** 交易策略編輯畫面，挑每個信號來源的彙總刻度、儲存。

---

## 3. User Stories & Acceptance Criteria

### US-01 — 刻度不一樣時存得下去 [priority: P0]
**As a** 使用者, **I want** 編輯畫面接受各用各的刻度, **so that** 我能在畫面上直接存下三重濾網這類組合。

```gherkin
Scenario: 一小時與五分鐘的組合不再被擋
  Given 第一個信號來源是一小時、第二個信號來源是五分鐘
  When 使用者打開交易策略編輯畫面
  Then 畫面上沒有「粗細不一樣」的擋下
  And 儲存鍵按得下去

Scenario: 把第二個來源改成一天之後照樣存得下去
  Given 第一個信號來源是十五分鐘
  When 使用者把第二個信號來源改成一天並儲存
  Then 存出去的兩個信號來源分別是十五分鐘與一天

Scenario: 刻度相同時照舊存得下去
  Given 兩個信號來源都是一小時
  When 使用者打開交易策略編輯畫面
  Then 儲存鍵按得下去
```

### US-02 — 刻度不只一種時說明重演步調 [priority: P1]
**As a** 使用者, **I want** 看得到重演會以哪個刻度為步調, **so that** 我讀回測成績時知道它是在哪個粗細上算的。

```gherkin
Scenario: 三種刻度時說出最細的那一個是步調
  Given 信號來源刻度是一天、四小時、十五分鐘
  When 使用者打開交易策略編輯畫面
  Then 畫面顯示「重演以十五分鐘為步調；一天、四小時那幾路只用已經走完的那一根」

Scenario: 刻度都相同時不顯示說明
  Given 信號來源刻度全是一小時
  When 使用者打開交易策略編輯畫面
  Then 畫面不顯示重演步調的說明

Scenario: 英文畫面說英文
  Given 畫面語言是英文，信號來源刻度是一小時與一天
  When 使用者打開交易策略編輯畫面
  Then 畫面顯示英文說明，指出一小時是步調、一天那一路只用已經走完的那一根
```

---

## 4. Business Flow & Logic

- **Core Business Rules:**
  - 重演步調是信號來源裡最細的那一個彙總刻度；較粗的那幾路依由細到粗的順序列出，同一刻度只列一次。
  - 刻度只有一種時沒有說明。
- **Edge Cases:** 認不得的刻度代號沿用既有規則（退回最細的那一種）。

---

## 5. UI/UX Design & Interaction

- 說明放在「交易策略吃哪一種行情」說明的同一區，同樣用資訊色的提示框；不影響儲存鍵。
- 每個來源旁邊照舊顯示它自己的刻度。

---

## 6. Non-Functional Requirements

- **Performance / Security / Compatibility:** 與現行相同。
- **Analytics / Tracking:** N/A

---

## 7. Dependencies & Risks

- **External Dependencies:** 後端同名切片（接受多刻度）必須先上線，否則存檔會被後端拒絕。
- **Known Risks:** 無。

---

## 8. Appendix

- 後端切片：`go-trading/.sdd/2026-10-18-multi-interval-trading-strategy/`
