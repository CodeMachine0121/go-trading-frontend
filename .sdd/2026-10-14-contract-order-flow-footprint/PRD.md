# Product Requirements Document (PRD)

**Status:** Draft
**Version:** v1.0
**Owner:** James Hsueh
**Stakeholders:** Engineering

---

## 1. Background & Goal

- **Problem Statement:** 交易服務的合約策略腳本能讀訂單流足跡了，但畫面上宣告不了要它的那個參數、說明裡沒有它、從交易服務讀回來時還會把它當成「數值」，機器人因它停下時也說不出原因。
- **Expected Outcome:** 合約策略腳本畫面能宣告訂單流價位寬度並就地驗證；算式說明列出足跡；讀回來種類不走樣；停擺原因說得出來。
- **Out of Scope:** 圖表畫足跡、訂單流查詢畫面、現貨訂單流、自動決定價位寬度。

---

## 2. User Personas

- **Primary Role:** 策略腳本擁有者（系統唯一的使用者）。
- **Usage Context:** 在合約策略腳本工作台寫訂單流算式、調價位寬度跑回測，再把它掛上合約機器人。

---

## 3. User Stories & Acceptance Criteria

### US-01 — 宣告訂單流價位寬度 [P0]
**As a** 策略腳本擁有者, **I want** 在合約策略腳本畫面選「訂單流價位寬度」這種參數, **so that** 我的算式拿得到足跡。

```gherkin
Scenario: 合約畫面的種類選單有它
  Given 合約行情的策略腳本畫面
  When 列出參數種類
  Then 依序是回看根數、數值、是非、訂單流價位寬度

Scenario: K 線畫面的種類選單沒有它
  Given K 線的策略腳本畫面
  When 列出參數種類
  Then 依序是回看根數、數值、是非,沒有訂單流價位寬度

Scenario: 大於零的寬度沒有錯誤
  Given 一個訂單流價位寬度,值 10
  When 檢查這一份參數
  Then 沒有錯誤

Scenario: 小數寬度沒有錯誤
  Given 一個訂單流價位寬度,值 0.5
  When 檢查這一份參數
  Then 沒有錯誤

Scenario: 寬度為零
  Given 一個訂單流價位寬度,值 0
  When 檢查這一份參數
  Then 說出「訂單流價位寬度必須大於零」

Scenario: 宣告兩個
  Given 兩個訂單流價位寬度,值都是 10、名稱不同
  When 檢查這一份參數
  Then 說出「訂單流價位寬度至多宣告一個」

Scenario: 輸入框
  Given 一個訂單流價位寬度
  When 畫出它的值格
  Then 是可以打小數的數字框,上下箭頭一次跳 1

Scenario: 不讓系統多拿 K 線
  Given 一個訂單流價位寬度,值 10
  When 問它會讓系統多拿幾根
  Then 是零
```

### US-02 — 讀回來不走樣 [P0]
**As a** 策略腳本擁有者, **I want** 存好的訂單流價位寬度讀回來還是同一種, **so that** 不會在我沒察覺時變成一個沒有作用的數值。

```gherkin
Scenario: 自己的策略腳本
  Given 交易服務回來一支策略腳本,帶一個種類為訂單流價位寬度的參數
  When 讀取它
  Then 那個參數的種類是訂單流價位寬度

Scenario: 市集上的策略腳本
  Given 市集上的一支帶著種類為訂單流價位寬度的參數
  When 瀏覽市集
  Then 那個參數的種類是訂單流價位寬度
```

### US-03 — 說明列出足跡 [P0]
**As a** 策略腳本擁有者, **I want** 「算式裡可以用什麼」說出足跡長什麼樣, **so that** 我不必猜欄位名稱。

```gherkin
Scenario: 合約畫面列出足跡
  Given 合約行情的策略腳本畫面
  When 打開「算式裡可以用什麼」
  Then 項目裡有 Footprint,型別 indicator.Footprint
  And 說明裡寫出 Footprint 的 PriceStep、Levels、Delta、PointOfControl
  And 寫出 indicator.PriceLevel 的 Price、BuyVolume、SellVolume、TradeCount
  And 寫出宣告了訂單流價位寬度才有足跡,沒宣告時整份是空的

Scenario: K 線畫面沒有足跡
  Given K 線的策略腳本畫面
  When 打開「算式裡可以用什麼」
  Then 項目裡沒有 Footprint
```

### US-04 — 停擺原因 [P0]
**As a** 策略腳本擁有者, **I want** 機器人因訂單流超出範圍停下時清單上說得出來, **so that** 我知道要縮短回看或放寬價位寬度。

```gherkin
Scenario: 訂單流超出範圍而停擺
  Given 一台停止中的機器人,停擺原因是訂單流超出範圍
  When 看機器人清單
  Then 標為停擺,原因說「它要的訂單流超過一次能給的範圍（天數或價位數）」
```

---

## 4. Business Flow & Logic

- 種類選單由行情種類決定，畫面不比對字串。
- 驗證一次只回一則：先每一個參數自己的規則，再整份的規則（名稱不得重複、訂單流價位寬度至多一個）。
- 足跡的規則（價位怎麼取、上限）全由交易服務決定，畫面只說明。

## 5. UI/UX

- 沿用參數列與「算式裡可以用什麼」既有的版面，不新增元件。

## 6. Non-Functional Requirements

- 中英文字串都要有。

## 7. Dependencies & Risks

- 依賴交易服務的 `orderFlowPriceStep` 參數種類與 `orderFlowRefused` 停擺原因。

## 8. Appendix

- 需求共識：同資料夾的需求簡述；後端切片同名資料夾。
