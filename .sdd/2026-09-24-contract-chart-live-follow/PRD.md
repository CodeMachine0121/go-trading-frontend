# Product Requirements Document (PRD) — 合約 K 線圖表的即時跟盤

**Status:** Draft · **Version:** v1.0 · **Owner:** James Hsueh

---

## 1. Background & Goal

- **Problem Statement:** 合約 K 線圖表沒有即時跟盤，最新那一根要等背景每分鐘同步、再動一下圖才看得到；
  畫面上還常駐一句「合約圖表沒有即時跟盤」。系統已經有了合約自己的即時跟盤，圖表還沒接上。
- **Expected Outcome:**
  - 看著合約追蹤名單上的某個合約標的時，圖上最新那一根與最新價跟著合約市場一起動。
  - 不在名單上的合約標的明說沒有即時更新、加進名單就會有。
  - 跟不動時明說即時更新已停止。
  - 現貨圖表的即時跟盤一字不變；兩邊互不影響。
- **Out of Scope:** 合約圖表的指標與立刻更新；標記價格／指數價格的即時線；在圖表頁直接加入合約追蹤名單。

---

## 2. User Personas

- **Primary Role:** 看盤的使用者（寫合約策略腳本、養合約機器人的人）。
- **Usage Context:** 桌機或手機上打開合約 K 線圖表盯某個永續合約的走勢。

---

## 3. User Stories & Acceptance Criteria

### US-01 — 看著合約圖表就即時跟盤 [P0]

**As a** 看盤的使用者, **I want** 合約圖表上最新那一根跟著合約市場動,
**so that** 我不必一直重新整理才看得到現在的價格。

```gherkin
Scenario: 畫出一個名單上的合約標的就開始跟
  Given BTCUSDT 在合約追蹤名單上
  When 我打開合約圖表並畫出 BTCUSDT
  Then 開始跟 BTCUSDT 的合約即時更新

Scenario: 還在走的那一根跟著動
  Given 正在跟 BTCUSDT，圖上最新那一根收 64000
  When 一則「還在走、收 64050」的更新進來
  Then 圖上最新那一根收盤與最新價都變成 64050

Scenario: 走完一根就多一根
  Given 正在跟 BTCUSDT
  When 一則「走完了」的更新進來，接著下一根開始
  Then 那一根定下來，圖上多出一根新的

Scenario: 換合約標的就改跟新的那一個
  Given 正在跟 BTCUSDT
  When 我換成 ETHUSDT
  Then 停止跟 BTCUSDT、改跟 ETHUSDT
  And 之後才到的 BTCUSDT 更新不會改到圖上

Scenario: 離開就停
  Given 正在跟 BTCUSDT
  When 我離開合約圖表
  Then 停止跟盤

Scenario: 圖取不到就不跟
  Given 取圖被拒絕
  When 合約圖表回報被拒絕
  Then 不跟盤，圖清空並說出被拒絕的原因
```

### US-02 — 不在合約追蹤名單上的明說沒有即時更新 [P0]

**As a** 看盤的使用者, **I want** 知道某個合約標的為什麼不會動,
**so that** 我知道該去把它加進合約追蹤名單，而不是一直等。

```gherkin
Scenario: 不在名單上的合約標的
  Given DOGEUSDT 有合約 K 線但不在合約追蹤名單上
  When 我畫出 DOGEUSDT
  Then 不跟盤
  And 圖照樣畫出
  And 畫面說「這個合約標的不在合約追蹤名單上，沒有即時更新——把它加進合約追蹤名單就會即時跟盤」

Scenario: 名單上的合約標的沒有這一句
  Given BTCUSDT 在合約追蹤名單上
  When 我畫出 BTCUSDT
  Then 畫面沒有「不在合約追蹤名單上」那一句
```

### US-03 — 跟不動時明說 [P0]

**As a** 看盤的使用者, **I want** 即時更新斷了時被告知,
**so that** 我不會把一張停住的圖當成市場沒動。

```gherkin
Scenario: 即時更新斷了
  Given 正在跟 BTCUSDT
  When 即時更新斷了
  Then 畫面說「即時更新已停止，正在重新連上」
  And 圖照樣顯示手上有的

Scenario: 重新跟上
  Given 畫面正說著即時更新已停止
  When 重新跟上、一則帶著 K 線的更新進來
  Then 那一句消失，圖跟著動

Scenario: 合約沒有收盤中
  Given 合約圖表任何時候
  Then 從不出現「收盤中」
```

### US-04 — 畫面上的說明只說還沒有的 [P1]

```gherkin
Scenario: 常駐說明
  Given 打開合約圖表
  Then 常駐的說明只說合約圖表沒有指標
  And 不再說合約圖表沒有即時跟盤
```

### US-05 — 現貨圖表不變 [P0]

```gherkin
Scenario: 現貨圖表跟的是現貨那一條
  Given 現貨圖表看著 BTCUSDT
  Then 它跟的是現貨的即時更新，行為一字不變

Scenario: 兩邊互不影響
  Given 合約圖表與現貨圖表都看著 BTCUSDT
  When 合約那一邊的一則更新進來
  Then 只有合約圖表跟著動
```

---

## 4. Business Flow & Logic

- **Core Business Rules:**
  - 一張合約圖畫出來之後才跟；每換一批（換合約標的、換一段、換每根涵蓋）就換一次跟的對象，舊的更新一律不採用。
  - 只在所選合約標的**在合約追蹤名單上**時才跟；不知道它在不在名單上時（清單取不到）照常跟，由即時那一邊說話。
  - 提示一次只說一句，優先序：不在合約追蹤名單上 ＞ 即時更新已中斷 ＞ 即時更新已停止。沒有「收盤中」。
  - **已中斷與已停止不同**：通道一開始就被拒絕（不在名單上、名單已變、系統正在關機）時不會自己接回來，
    說「即時更新已中斷，不會自己重新連上——確認這個合約標的還在合約追蹤名單上，再重新整理頁面」；
    連線掉了才說「正在重新連上」。現貨圖表同樣分開（「重新整理頁面再試一次」）。
  - 換到不在名單上的合約標的、圖還沒回來就換回原本那一個時，原本那一個接著跟。
  - 一則帶著 K 線的更新進來，就代表跟得動，「已停止」那一句消失。
  - 即時更新只併進圖、不存、不觸發任何計算。
- **Edge Cases:**
  - 取圖失敗：圖與跟盤一起放掉，之後到的更新不改圖。
  - 合約標的清單取不到：照常嘗試跟盤。

---

## 5. UI/UX Design & Interaction

- 提示位置與樣式比照現貨圖表：「不在名單上」為提示語氣、「已停止」為警告語氣。
- 常駐說明改為「合約圖表沒有指標」。

---

## 6. Non-Functional Requirements

- **Performance:** 同一時間一個合約圖表只維持一條跟盤；換標的時先停再開。
- **Compatibility:** 現貨圖表的行為與測試不變。

---

## 7. Dependencies & Risks

- **External Dependencies:** 後端合約即時跟盤（只服務合約追蹤名單上的合約標的）。
- **Known Risks:** 後端拒絕不在名單上的合約標的時，瀏覽器只知道連不上、分不出原因——所以畫面先照名單判斷、不去跟。

---

## 8. Appendix

- `.sdd/2026-09-24-contract-chart-live-follow/BRIEF.md`
- 後端 `.sdd/2026-09-24-contract-live-follow/`
