# Product Requirements Document (PRD) — 策略腳本的用途（操作台）

**Status:** Finalized
**Version:** v1.0
**Owner:** James Hsueh
**Stakeholders:** Engineering（操作台；交易服務同名需求同步上線）

---

## 1. Background & Goal (Why & Goal)

- **Problem Statement:** 策略腳本同時被拿來畫在 K 線圖上與當交易策略的訊號來源，兩種腳本混在每一份清單裡。交易服務已讓每一支腳本標明**用途**（圖表用／計算用）並在計算的地方只收計算用；升級後既有腳本全是計算用。操作台若不跟上，擁有者既選不了、也切不了用途，圖表選單還會列出交易服務認定不屬於圖表的腳本。
- **Expected Outcome:**
  - 新增腳本時選用途（預設計算用）；隨時在腳本庫切換用途（包含市集副本）。
  - 腳本庫與市集看得到每一支的用途。
  - 圖表的指標選單只列圖表用；訊號來源與標的篩選只列計算用。
  - 一支圖表用的腳本都沒有時，圖表說得出下一步。
- **Out of Scope:** 依指標值種類自動推測用途；新的用途種類；改寫內容時順便改用途；在交易策略或圖表那一頁切換用途。

---

## 2. User Personas

- **Primary Role(s):** 策略腳本擁有者；從市集加入副本的使用者；看盤的使用者；交易策略擁有者。
- **Usage Context:** 桌機上在策略腳本頁寫腳本與整理用途；在看盤工作區挑指標；在交易策略工作台挑訊號來源。

---

## 3. User Stories & Acceptance Criteria

### US-01 — [priority: P0] 新增時選用途
**As a** 策略腳本擁有者, **I want** 另存新腳本時決定它的用途, **so that** 它一開始就出現在對的地方。

```gherkin
Scenario: 另存成圖表用
  Given 我要另存一支新腳本，用途選「圖表用」
  When 我存下
  Then 送給交易服務的新腳本用途是圖表用

Scenario: 沒動用途
  Given 我要另存一支新腳本，用途沒動
  When 我存下
  Then 送給交易服務的新腳本用途是計算用
  And 對話框打開時用途預選的就是「計算用」

Scenario: 改名時不問用途
  Given 我要替一支既有的腳本改名
  When 打開對話框並送出
  Then 對話框上沒有用途那一格
  And 送出的內容沒有用途
```

### US-02 — [priority: P0] 切換用途
**As a** 策略腳本擁有者, **I want** 在腳本庫切換任何一支（包含市集副本）的用途, **so that** 升級後我能把畫線用的腳本放回圖表。

```gherkin
Scenario: 自己的腳本改成圖表用
  Given 腳本庫裡一支自己的計算用腳本「均線」
  When 我按「改成圖表用」
  Then 那一列標成「圖表用」
  And 顯示「已把「均線」改成圖表用」

Scenario: 市集副本改成圖表用
  Given 腳本庫裡一份計算用的市集副本
  When 我按「改成圖表用」
  Then 那一列標成「圖表用」

Scenario: 圖表用改回計算用
  Given 腳本庫裡一支自己的圖表用腳本
  When 我按「改成計算用」
  Then 那一列標成「計算用」

Scenario: 被交易策略用著
  Given 一支計算用腳本，交易策略「4H 趨勢」在用
  When 我按「改成圖表用」而交易服務拒絕並點名「4H 趨勢」
  Then 顯示交易服務那一句（點名「4H 趨勢」）
  And 那一列仍標「計算用」
```

### US-03 — [priority: P0] 圖表只列圖表用
**As a** 看盤的使用者, **I want** 指標選單只列畫線用的腳本, **so that** 清單乾淨好找。

```gherkin
Scenario: 圖表用、畫得成線
  Given 一支圖表用、畫得成線的腳本
  When 我打開圖表的指標選單
  Then 它列在選單裡而且挑得到

Scenario: 計算用、畫得成線
  Given 一支計算用、畫得成線的腳本
  When 我打開圖表的指標選單
  Then 它不在選單裡

Scenario: 圖表用、畫不成線
  Given 一支圖表用、畫不成線的腳本
  When 我打開圖表的指標選單
  Then 它列在選單裡但挑不到

Scenario: 一支圖表用的都沒有
  Given 我只有計算用的腳本
  When 我打開圖表的指標選單
  Then 顯示「沒有圖表用的策略腳本」並說明到策略腳本頁新增一支或把既有的改成圖表用

Scenario: 上次擺著的指標現在是計算用
  Given 上次圖上擺著一支腳本，它現在是計算用
  When 我打開圖表
  Then 那一支不還原回圖上
```

### US-04 — [priority: P0] 訊號來源與篩選只列計算用
**As a** 交易策略擁有者, **I want** 只挑得到計算用的腳本, **so that** 不會拼出一份存不下的交易策略。

```gherkin
Scenario: 計算用、吐訊號
  Given 一支計算用、吐訊號的腳本
  When 我挑訊號來源
  Then 它挑得到

Scenario: 圖表用、吐訊號
  Given 一支圖表用、吐訊號的腳本「突破線」
  When 我挑訊號來源
  Then 它不在選項裡
  And 已經指著它的訊號來源顯示「突破線（這支是圖表用，當不了訊號來源）」

Scenario: 吐訊號的全是圖表用
  Given 我所有吐訊號的腳本都是圖表用
  When 我打開訊號來源卡
  Then 顯示說明：吐訊號的腳本都是圖表用，到策略腳本庫把要用的改成計算用

Scenario: 計算用但吐數字
  Given 一支計算用、吐一串數字的腳本
  When 我挑訊號來源
  Then 它照舊不在選項裡

Scenario: 篩選不列圖表用
  Given 一支合約、吐訊號、圖表用的腳本
  When 我挑篩選設定的腳本
  Then 它不在選項裡
```

### US-05 — [priority: P1] 用途看得到、市集標得出
**As a** 市集使用者, **I want** 看到每一支的用途, **so that** 加入之前就知道它放在哪裡用。

```gherkin
Scenario: 市集卡標圖表用
  Given 市集上一支圖表用的腳本
  When 我瀏覽市集
  Then 那張卡標「圖表用」

Scenario: 市集卡標計算用
  Given 市集上一支計算用的腳本
  When 我瀏覽市集
  Then 那張卡標「計算用」

Scenario: 副本留著加入當下的用途
  Given 我加入過一支圖表用的副本，發佈者之後把原腳本切成計算用
  When 我看自己的腳本庫
  Then 那份副本仍標「圖表用」

Scenario: 交易服務沒說用途
  Given 交易服務沒說某一支的用途
  When 我在市集或腳本庫看到它
  Then 它標「計算用」
```

---

## 4. Business Flow & Logic

- **Core Business Rules:**
  - 用途二選一：圖表用、計算用；沒說、說了不認得的一律讀作計算用。
  - 圖表選單：只列圖表用；圖表用之中畫不成線的照舊列出但挑不到。
  - 訊號來源：計算用而且吐訊號；篩選：計算用而且原有規則成立。
  - 用途只在新增時送；改寫與改名不送；切換是獨立的動作。
  - 存交易策略、存篩選設定、回測市集副本被交易服務以用途拒絕時，照交易服務那一句顯示。
- **Edge Cases:**
  - 切換失敗：用途不變，顯示那一句。
  - 交易服務連不上：沿用腳本庫既有說法。

---

## 5. UI/UX Design & Interaction

- 新增對話框：名稱、說明下方一組兩個單選（圖表用／計算用），各附一句說明。
- 腳本庫每一列：用途標記＋「改成圖表用／改成計算用」小鍵。
- 市集卡：與行情種類並排的用途標記。

---

## 6. Non-Functional Requirements

- 中文與英文兩種說法都有。

---

## 7. Dependencies & Risks

- **Dependencies:** 交易服務同名需求（go-trading `.sdd/2026-11-11-strategy-script-usage/`）。
- **Known Risks:** 升級後既有腳本全是計算用，圖表選單暫時是空的——空清單說明指出改成圖表用的路。

---

## 8. Appendix

- `BRIEF.md`（同資料夾）
