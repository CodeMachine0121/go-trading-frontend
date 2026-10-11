# Product Requirements Document (PRD) — 回測送出後在列表裡看進度與結果（網頁）

**Status:** Finalized
**Version:** v1.0
**Owner:** James Hsueh
**Stakeholders:** Engineering

---

## 1. Background & Goal (Why & Goal)

- **Problem Statement:** 後端把回測改成先記下一筆回測輪次、立刻回覆，成績單留在輪次上。操作台今天按開始回測後鎖住等答案、答案只活在這一頁；後端改了之後它會拿到一筆輪次卻把它當成績單畫。
- **Expected Outcome:**
  - 三個回測區塊送出後立刻顯示「已送出，輪次 #N」，表單可再送。
  - 區塊下方的「我的回測」列表看得到排隊中／進行中／完成／失敗／已取消與進度，自己更新、可取消。
  - 回測紀錄總覽頁列全部輪次，可篩狀態、分頁。
  - 點一筆完成的輪次用既有成績單畫面呈現。
- **Out of Scope:** 比較兩筆輪次；行情助手與交易日誌比對的畫面；手動刪除輪次。

---

## 2. User Personas

- **Primary Role(s):** 已登入的使用者。
- **Usage Context:** 桌面瀏覽器為主，手機直立也要可讀；一次送多筆後離開、稍後回來看。

---

## 3. User Stories & Acceptance Criteria

### US-01 — [priority: P0] 送出就回、列表立刻多一筆
**As a** 使用者, **I want** 按下開始回測立刻看到它進了列表, **so that** 不必盯著鎖住的按鈕等。

```gherkin
Scenario: 合法的回測送出後列表多一筆
  Given 在合約策略腳本頁，回測表單合法
  When 按開始回測
  Then 顯示「已送出，輪次 #40」
  And 下方「我的回測」最上面多一筆 #40，徽章排隊中
  And 開始回測按鈕可以再按

Scenario: 欄位錯誤就地擋下
  Given 區間結束早於開始
  When 按開始回測
  Then 錯誤標在區間欄位上
  And 列表不變

Scenario: 每人上限滿了
  Given 我已有 3 筆排隊中或進行中
  When 按開始回測
  Then 顯示「你同時最多 3 筆，等其中一筆結束再送」
  And 列表不變

Scenario: 三個回測區塊行為相同
  When 在現貨策略腳本頁或交易策略詳細頁按開始回測
  Then 同樣顯示已送出並在該頁列表多一筆
```

### US-02 — [priority: P0] 列表自己更新、可取消
**As a** 使用者, **I want** 列表自己跟著進度變, **so that** 我不必重新整理。

```gherkin
Scenario: 進度與狀態自己更新
  Given #40 進行中 40%
  When 幾秒後後端說 70%
  Then 列上寫進行中 70%
  When 後端說完成，報酬率 +25.5%
  Then 徽章變完成，列上寫 +25.5%、最大回撤、交易筆數

Scenario: 全部結束就停止更新
  Given 列表裡沒有排隊中或進行中
  Then 不再向後端重讀

Scenario: 更新不閃等待進度條
  Given 列表正在自己更新
  Then 畫面頂端的等待進度條不出現

Scenario: 取消排隊中的
  Given #41 排隊中
  When 按 #41 的取消
  Then 徽章變已取消

Scenario: 已結束的沒有取消
  Given #42 已完成
  Then #42 那一列沒有取消按鈕

Scenario: 離開再回來列表仍在
  Given #40 進行中
  When 離開頁面再回到同一頁
  Then 列表從後端重讀，#40 的最新狀態仍在
```

### US-03 — [priority: P0] 點開看成績單
**As a** 使用者, **I want** 點一筆完成的輪次就看到今天那套成績單, **so that** 結果不再只活在一次回覆裡。

```gherkin
Scenario: 完成的輪次用既有成績單畫面
  Given #40 完成，有調參段與驗證段
  When 點 #40
  Then 顯示調參段與驗證段兩組摘要卡、權益曲線、交易表
  And 畫面與今天當場回覆時相同

Scenario: 失敗的只顯示原因
  Given #43 失敗：超過時間上限
  When 點 #43
  Then 顯示「失敗：超過時間上限」，沒有成績單

Scenario: 已取消的只顯示狀態
  Given #44 已取消
  When 點 #44
  Then 顯示已取消，沒有成績單
```

### US-04 — [priority: P1] 回測紀錄總覽頁
**As a** 使用者, **I want** 一頁看完全部回測, **so that** 不必逐個腳本去找。

```gherkin
Scenario: 列全部、可篩、分頁
  Given 我有 25 筆輪次，其中 3 筆失敗
  When 打開回測紀錄頁
  Then 新到舊列 20 筆，顯示總數 25，可翻到下一頁
  When 篩狀態為失敗
  Then 只列那 3 筆

Scenario: 總覽頁也能點開
  When 在總覽頁點 #40
  Then 同樣用成績單畫面呈現

Scenario: 空狀態
  Given 我沒有任何輪次
  When 打開回測紀錄頁
  Then 顯示「還沒有回測，去策略腳本或交易策略頁送出一筆」
```

### US-05 — [priority: P1] 說明文字跟著改
```gherkin
Scenario: 回測區塊的說明
  When 打開任一回測區塊
  Then 說明寫「送出後會在背後計算，可在下方列表或回測紀錄頁查看」
  And 沒有「請等待」這類字眼
```

---

## 4. Business Flow & Logic

- 送出 → 後端回輪次 → 插到列表最上面 → 有未結束的就每幾秒背景重讀 → 全部結束停 → 點開取完整成績單。
- 列表只呈現後端給的狀態、進度、摘要；不自己算任何數字。
- 區塊下方列表只列該來源（腳本或交易策略）的輪次；總覽頁列全部。

---

## 5. UI/UX Design & Interaction

- 徽章沿用既有徽章元件：排隊中中性、進行中資訊色＋進度百分比、完成成功色、失敗危險色、已取消中性。
- 列表每列：編號、徽章、要跑什麼（標的 · 刻度 · 期間 · 槓桿與交易模式若有）、送出時間、摘要或原因、取消按鈕。
- 載入中：列表骨架；失敗：一行原因；空：一句引導。
- 手機直立：每列換行成兩行，仍可點開與取消。

---

## 6. Non-Functional Requirements

- **Performance:** 列表不載入成績單本體；更新用背景方式；離開頁面停止更新。
- **Security:** 一律帶登入身分；401 走既有救回登入。
- **Compatibility:** 既有成績單畫面零改動。
- **i18n:** 新文字繁中與英文都有。

---

## 7. Dependencies & Risks

- 後端切片先完成。
- 風險：多個區塊同時在同一頁時更新迴圈要只有一個；比照行情助手的做法。

---

## 8. Appendix

- `BRIEF.md`（本切片）；後端 PRD。
