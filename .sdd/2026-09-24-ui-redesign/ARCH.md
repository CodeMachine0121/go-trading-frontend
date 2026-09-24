# 操作台全面改版 — Architecture Design

**Status:** Confirmed
**Source PRD:** `.sdd/2026-09-24-ui-redesign/PRD.md`
**Tech context:** Nuxt 3（`ssr: false`）· Vue 3 `<script setup lang="ts">` · Clean / Onion（`.vue` = Controller）· SCSS token 中央控管 · Vitest

---

## 1. Design Goal & Guiding Principle

- **In one sentence:** 以設計稿重建 `app/components/` 與 `app/pages/` 整層，保留 application / domain / infrastructure / composables 不動，
  並新增兩個小能力：**外觀（淺色／深色／跟隨系統）**與**現貨／合約對應畫面**。
- **Guiding principle — 換皮不換骨：**
  1. 畫面層的**行為契約沿用舊元件**（props / emits / 向 Application 的呼叫方式），**template 與樣式整個重寫**。
     舊元件裡細緻的互動規則（圖表重新取、即時跟盤、未儲存確認、表單把關）是多輪迭代的成果，
     重寫它們的邏輯只會引入回歸；重寫它們的長相才是這一刀要的。
  2. 所有顏色、間距、字級仍是 token；**淺色主題是同一組 token 名的第二組值**，所以任何元件不需要知道現在是哪一種主題。
  3. atoms 的**公開 API 不變**（`AppButton` 的 variant/size/shape/to…），只加 variant、不改名——上層元件移植成本降到最低。

---

## 2. Change Scope

| Area | Action | What / Why |
| :--- | :--- | :--- |
| `app/assets/styles/abstracts/_tokens.scss` | **Modify** | 換成新設計的色票；新增 `$colors-light`（同一組鍵的淺色值）、程式碼上色與圖表線色 token |
| `app/assets/styles/base/_tokens.scss` | **Modify** | `:root` 展開深色；`:root[data-theme='light']` 展開淺色 |
| `app/spa-loading-template.html` | **Modify** | 門口載入畫面換新色票；以 `prefers-color-scheme` 兩套配色（它在 Vue 之前出現，讀不到使用者選擇） |
| `app/components/atoms/*` | **Add（重建）** | 舊 14 個原子依原 API 重建外觀；新增 `AppSwitch`（開關） |
| `app/components/molecules|organisms/*` | **Add（重建）** | 依舊元件的行為契約移植 script，template／樣式照設計稿重寫 |
| `app/components/templates/ConsoleLayout.vue` | **Add（重建）** | 側欄七個去處＋頂列（現貨／合約開關、顯示時區、外觀切換、助手鍵）＋窄螢幕底部五格 |
| `app/pages/**` | **Add（重建）** | 路由與舊版一致（`/k-candles`、`/contract-k-candles/chart`…），每頁只做接線 |
| 交易策略工作檯 | **Replace** | 拖拉墊子（`TradingStrategyCanvas` / `ConditionMat` / `PieceShelf`）改為步驟卡；拖拉專用的 `use-piece-drag*`、`utilities/piece-drag-markup.ts`、`interactjs` 在無人使用後移除 |
| 助手晶片 | **Remove** | 浮動晶片改為頂列助手鍵；`AssistantTriggerApplication` 一整串（service / proxy / composable / tests）在無人使用後移除 |
| 外觀 | **Add** | `AppearanceApplication` → `AppearanceService` → `IAppearancePreferenceProxy`；`AppearanceDomain` 解析「選擇＋系統」→ 實際主題 |
| 現貨／合約對應畫面 | **Add** | `MarketCounterpartApplication` → `MarketCounterpartDomain`：路徑 → 目前哪一邊、對應畫面在哪 |
| `AppCodeEditor` 的主題 | **Modify** | 由 `@codemirror/theme-one-dark` 改為讀 CSS 變數的自訂主題，兩種外觀自動成立；移除該依賴 |
| `KCandleChart`（lightweight-charts） | **Modify** | 畫布顏色改從 CSS 變數讀取，並在外觀變更時重套 |
| application / domain / infrastructure 其餘 | **Not touched** | 業務規則一條不動；只有上面列出的新增與死碼移除 |
| 後端 go-trading | **Not touched** | 純前端改版 |

---

## 3. New Classes / Modules

| Name | Kind | Responsibility (purpose) | Collaborators | Satisfies (PRD scenario) |
| :--- | :--- | :--- | :--- | :--- |
| `AppearanceChoiceVo` | VO（字面量 union） | `'light' \| 'dark' \| 'system'` 與其順序、標籤 | — | US-02 全部 |
| `AppearanceDomain` | Domain Model | 建構子收「記住的選擇（可能是 null / 看不懂）」與「系統偏好深色與否」，正規化非法值為 `system`，`toDto()` 回選擇與實際主題 | `AppearanceChoiceVo` | 沒選過時跟隨系統、跟隨系統時系統切換、手動選擇不受系統影響 |
| `AppearanceDto` | DTO | `choice`、`resolvedTheme: 'light' \| 'dark'`、`options` | — | 兩個入口一致 |
| `IAppearancePreferenceProxy` / `AppearancePreferenceProxy` | 介面 / Proxy | 讀寫 localStorage 的外觀選擇；讀不到或寫不進去時安靜退回 | localStorage | 選過的外觀重新整理後仍在、瀏覽器記不住 |
| `AppearanceService` | Domain Service | 還原與選擇外觀：組 Domain Model、叫 proxy 寫入、回 DTO | proxy、`AppearanceDomain` | US-02 |
| `AppearanceApplication` | Application | `restoreAppearance(systemPrefersDark)`、`selectAppearance(choice, systemPrefersDark)`、`resolveForSystemChange(choice, systemPrefersDark)` | `AppearanceService` | US-02 |
| `useAppearance` | Composable | 跨畫面共用一份外觀狀態；讀 `matchMedia('(prefers-color-scheme: dark)')` 並監聽變化；把實際主題寫到 `<html data-theme>` | `AppearanceApplication` | US-02 |
| `MarketCounterpartDomain` | Domain Model | 由路徑判斷目前在哪一邊（現貨／合約／不分）與對應畫面路徑；建立／編輯機器人時對應到另一邊的清單 | — | US-01 全部 |
| `MarketCounterpartDto` | DTO | `market: 'spot' \| 'contract' \| null`、`counterpartPath: string \| null`、`switchable` | — | US-01 |
| `MarketCounterpartApplication` | Application | `describeCounterpart(path)` | `MarketCounterpartDomain` | US-01 |
| `AppSwitch` | Atom | 開關（`role="switch"`、`aria-checked`、disabled），左右兩個 slot 標籤 | — | US-01 |
| `MarketSwitch` | Molecule | 吃 `MarketCounterpartDto`，按下時導向對應畫面；不可切時說明原因 | `AppSwitch` | US-01 |
| `AppearanceToggle` | Molecule | 三選一的外觀切換（頂列圖示版、設定頁文字版為同一元件的 `variant`） | `AppTabs` | 兩個入口一致 |
| `TradingStrategySignalSourceCard` | Organism | 步驟卡一：訊號來源清單與新增／刪除／改代號／改腳本／改刻度／改參數 | `use-trading-strategy-form` | 引用的訊號來源被刪掉 |
| `TradingStrategyConditionCard` | Organism | 步驟卡二／三：一邊的條件板——頂層且／或、條件列（來源＋信號）、一組（扣成組、改運算子、拆開）、新增／刪除 | `ConditionBoardDto`、條件板編輯行為 | 加一條買入條件、手機上可以編、把兩條扣成一組 |
| `ConditionClauseSentence` | Molecule | 把一條或一組條件讀成一句話（文字由 DTO 帶，元件只排版） | `ConditionBoardItemDto` | 把兩條扣成一組 |

> 條件板的「挑一個來源放上去、扣成一組、拆開、改運算子」在舊版由 `usePieceDrag` 的落點語意驅動。
> 步驟卡直接呼叫**同一組條件板編輯行為**（`dropOnMat` / `dropOntoPiece` / `dropOnShelf` 背後的那組 form 方法），
> 不經過拖拉手勢；若那組行為目前只住在 `usePieceDrag`，就把「搬動語意」留在它原本的 composable 裡、只拿掉手勢層。

---

## 4. Modified Components

| Component | Current role | Change needed |
| :--- | :--- | :--- |
| `app/plugins/dependencies.ts` | 組裝根 | 註冊 `appearanceApplication`、`marketCounterpartApplication`；移除 `assistantTriggerApplication` |
| `app/app.vue` | 根：進度條、助手抽屜、浮動晶片 | 移除浮動晶片；抽屜改由頂列助手鍵開；初始化 `useAppearance` |
| `AppCodeEditor` | CodeMirror 包裝 | 自訂 CSS 變數主題（`EditorView.theme` + `HighlightStyle` 以 `var(--color-code-*)`） |
| `KCandleChart` | lightweight-charts 包裝 | 顏色由 CSS 變數讀取；接收 `resolvedTheme` prop 變化時重套 |
| `LayoutDensityDomain` | 疏密與導覽形狀 | 「積木工作檯可否編輯」那一條拿掉（窄螢幕也能編）；其餘不動 |
| `tests/components/**` | 舊元件測試（已隨舊元件刪除） | 只為**有互動邏輯**的元件補回：從舊 spec 移植仍成立的行為案例，刪掉只驗舊長相的案例 |

---

## 5. Component Relationships

```mermaid
flowchart TD
    Page[pages/*] --> Layout[ConsoleLayout]
    Layout --> MarketSwitch --> AppSwitch
    Layout --> AppearanceToggle
    Page --> Organisms[重建的 organisms<br/>（行為契約沿用舊版）]
    MarketSwitch -. DTO .-> MCApp[MarketCounterpartApplication] --> MCDomain[MarketCounterpartDomain]
    AppRoot[app.vue] --> useAppearance --> AppApp[AppearanceApplication] --> AppSvc[AppearanceService]
    AppSvc --> AppDomain[AppearanceDomain]
    AppSvc --> AppProxy[(AppearancePreferenceProxy<br/>localStorage)]
    useAppearance --> Html[&lt;html data-theme&gt;]
    Html --> Tokens[base/_tokens.scss<br/>:root / :root[data-theme=light]]
```

---

## 6. Extensibility & Handoff Notes

- **Most likely next requirement:** 第三條行情線（例如另一種合約）或第三種外觀（高對比）。
- **Where it lands:**
  - 行情線 → `MarketCounterpartDomain` 的對應表（一列一組對應畫面）；`MarketSwitch` 不必改。
  - 外觀 → `AppearanceChoiceVo` 加一個值、`_tokens.scss` 加一組同鍵的 map、`base/_tokens.scss` 加一個選擇器。元件一個都不必改。
- **Patterns applied & why:** token 雙值（主題切換的唯一接點）；Domain Model 正規化外部輸入（記住的選擇可能是舊值或亂碼）。
- **Do not hardcode:** 任何色碼只准在 `abstracts/_tokens.scss` 與 `spa-loading-template.html`（後者由 `lint:tokens` 對齊）；
  圖表與編輯器一律讀 CSS 變數。
- **Known debt / deferred:** 自訂版面拖拉、存多組版面不做；導覽上有兩邊的去處跟著使用者最後停留的那一邊（`useMarketSide`），不另外各佔一格。
- **測試成本：** 開發中只跑受影響的 spec（限 worker）；全套只在收尾跑一次。

---

## 7. Traceability

| PRD Scenario | Fulfilled by |
| :--- | :--- |
| US-01 從現貨行情圖表切到合約／從合約機器人清單切回現貨 | `MarketCounterpartDomain`、`MarketSwitch` |
| US-01 編輯機器人時切到另一邊，去的是清單 | `MarketCounterpartDomain`（`/strategy-bots/:id`、`/new` → 另一邊清單） |
| US-01 從網址直接進入合約畫面 | `MarketSwitch` 以目前路徑求 DTO |
| US-01 不分現貨合約的畫面 | `MarketCounterpartDto.switchable = false`、`MarketSwitch` 說明文字 |
| US-02 沒選過時跟隨系統／系統切換／手動不受影響 | `AppearanceDomain`、`useAppearance`（matchMedia 監聽） |
| US-02 選過的外觀重新整理後仍在／瀏覽器記不住 | `AppearancePreferenceProxy` |
| US-02 兩個入口一致 | `useAppearance` 單一共用狀態、`AppearanceToggle` 兩處使用 |
| US-03 全部 | `TradingStrategySignalSourceCard`、`TradingStrategyConditionCard`、`use-trading-strategy-form`、`LayoutDensityDomain`（移除唯讀限制） |
| US-04 全部 | `KCandleEditorPanel`（移植）、`KCandleWriteDomain` 既有把關 |
| US-05 即時跟盤／合約標記價格／回測在編輯器下方／需要處理的那一輪／手機助手／連不上後端 | 移植後的 `KCandleChartPanel`、`KCandleContractChartPanel`、`IndicatorCalculationPanel` + `StrategyScriptBacktestPane`、`StrategyBotRunHistory`、`pages/chat`、各頁的後端不可用狀態 |
