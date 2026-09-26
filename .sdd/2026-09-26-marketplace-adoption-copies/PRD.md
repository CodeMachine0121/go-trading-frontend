# Product Requirements Document (PRD)

**Status:** Finalized · **Owner:** James Hsueh

## 1. Background & Goal
後端把加入改成複製；畫面要拿掉「已加入／取消加入」，把採用來的那一組當成副本，移除即刪除。

## 2. User Personas
- 已登入的使用者，在市集加入別人的策略腳本、在「我的策略腳本」管理它們。

## 3. User Stories & Acceptance Criteria

### US-01 — 市集只有加入 [P0]
```gherkin
Scenario: 別人的策略腳本只有加入
  Given 市集上有別人分享的「動能」
  When 我看市集
  Then 那張卡有「加入」
  And 沒有「已加入」也沒有「取消加入」

Scenario: 自己的照舊標明
  Given 市集上有我自己分享的「均線」
  When 我看市集
  Then 那張卡標明是我自己的，沒有「加入」

Scenario: 加入成功
  Given 市集上有別人分享的「動能」
  When 我按加入
  Then 顯示「已複製一份到你的策略腳本；之後作者怎麼改都不會影響你」
  And 我的策略腳本重讀一次

Scenario: 加入被拒
  Given 我已有一支叫「動能」的策略腳本
  When 我加入別人的「動能」
  Then 顯示「策略腳本名稱「動能」已被使用」
```

### US-02 — 我的策略腳本裡的副本 [P0]
```gherkin
Scenario: 副本標示從市集加入
  Given 我有一份從市集加入的「動能」
  When 我看我的策略腳本
  Then 採用來的那一組有「動能」，標示「從市集加入」，沒有分享者

Scenario: 移除副本就是刪掉它
  Given 我有一份從市集加入的「動能」
  When 我移除它
  Then 系統刪除那一支副本
  And 清單上不再有它

Scenario: 副本仍然唯讀
  Given 我有一份從市集加入的「動能」
  When 我打開它
  Then 算式看不到、改不動
```

## 4. Business Flow & Logic
- 市集卡只分「自己的」與「別人的」兩種。
- 採用來的那一組識別碼就是副本自己的；刪除走一般刪除策略腳本。

## 6. Non-Functional Requirements
- 後端不再有取消加入的路徑；畫面不得再呼叫它。

## 8. Appendix
- 後端切片：go-trading `.sdd/2026-09-26-marketplace-adoption-copies/`
