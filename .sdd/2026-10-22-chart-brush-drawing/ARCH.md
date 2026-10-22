# 奇異筆：在 K 線圖上任意畫 — Architecture Design

**Status:** Confirmed
**Source PRD:** `.sdd/2026-10-22-chart-brush-drawing/PRD.md`
**Tech context:** Nuxt 4 · TypeScript · Clean / Onion（`.vue` = Controller → Application → Domain ← Proxy）· 繪圖層是疊在 lightweight-charts 上的 canvas

---

## 1. Design Goal & Guiding Principle

- **In one sentence:** 在既有的繪圖目錄與繪圖板上加一種「按住拖曳、點數可變、點不對齊 K 線」的繪圖 `brush`，
  並在新增繪圖時擋下整張繪圖板點數總和超過 4000 的情況。
- **Guiding principle:** **「自由筆跡」是繪圖目錄上的一個屬性，而不是一連串 `kind === 'brush'`。**
  繪圖目錄一列說出「要幾個點（下限到上限）」與「是不是自由筆跡」；領域（點怎麼對到時間、怎麼精簡、放到圖上用小數序位）
  與畫面（按住拖曳的手勢、沒有把手、選取光暈）都只讀這個屬性。下一種自由筆跡類工具（螢光筆、箭頭筆）就只是目錄多一列＋一個畫法。

---

## 2. Change Scope

| Area | Action | What / Why |
| :--- | :--- | :--- |
| `chart-drawing-kind-vo.ts` | **Modify** | `anchorCount: 1 \| 2` 換成 `minimumAnchorCount`／`maximumAnchorCount`，加 `freehand`；新增 `brush` 一列與 `brush` 一格工具格（形狀之後、測量之前） |
| `chart-drawing-color-vo.ts` | **Modify** | 匯出 `DRAWING_ORANGE_TOKEN`（奇異筆預設色） |
| `KCandleTimelineDomain` | **Modify** | 加「小數序位 ↔ 任意時刻」：`freehandAnchor`、`fractionalLogicalIndexOf`；找「涵蓋它的那一根」改用二分搜尋（4000 點 × 數千根時線性搜尋太慢） |
| `ChartDrawingDomain` | **Modify** | 錨點數檢查改看下限／上限；自由筆跡放到圖上用小數序位；`replaceAnchors` 不收零以下的價格；DTO 帶出 `freehand` |
| `ChartDrawingBoardDomain` | **Modify** | `added` 檢查點數總和，超過丟 `ChartDrawingBoardAnchorCapacityError` |
| `ChartDrawingService` / `ChartDrawingApplication` | **Modify** | 新用例 `draftFreehandDrawing(chart, kind, points)`；`shiftAnchor`（一次一點）換成 `shiftAnchors`（一次整組錨點，只建一次時間軸） |
| `use-chart-drawings.ts` | **Modify** | `finishDrawing` 接住點數上限錯誤，改成一閃而過的提示，不算一步 |
| `ChartDrawingLayer.vue` | **Modify** | 自由筆跡手勢（取樣、即時預覽、放開才交出）、畫法（平滑曲線）、點到判斷、沒有把手、選取光暈 |
| `ChartDrawingToolbar.vue` / `AppIcon.vue` | **Modify** | `brush` 圖示 |
| `device-chart-drawing-proxy.ts` | **Modify** | 舊繪圖的錨點數檢查改看下限／上限（只是跟著目錄欄位改名） |
| `chart-drawing-tool-group-dto.ts` | **Modify** | `value` 型別改由目錄的工具格型別推出，不再手寫一份清單 |
| `ChartDrawingBoardProxy` | **Not touched** | 錨點本來就以 ISO 時刻＋價格字串收送，任意時刻原樣可用；種類照字串送 |
| 物件樹、浮動工具列 | **Not touched** | 它們只讀 DTO 的種類名稱與 `styleEditable`，奇異筆的名稱與「可改樣式」由目錄帶出 |
| 既有八種繪圖的放置與對齊 | **Not touched** | 仍對齊到整根（換到粗刻度時落在涵蓋它的那一根），不改成小數序位 |

---

## 3. New Classes / Modules

| Name | Kind | Responsibility (purpose) | Collaborators | Satisfies (PRD scenario) |
| :--- | :--- | :--- | :--- | :--- |
| `FreehandStrokeDomain` | Domain Model | 一筆手畫的取樣點收成要存的那幾個：略過零以下的價格與重複的像素點、Ramer–Douglas–Peucker（1 像素）精簡、超過上限再從頭到尾平均挑，頭尾必留 | `ChartDrawingStrokePointDto` | 很長的一筆最多留 200 個點、幾乎是直線只留很少的點、拖到零以下的點略過、點一下沒拖不留東西 |
| `ChartDrawingStrokePointDto` | DTO（輸入） | 畫面交給 Application 的一個取樣點：畫面上的 x、y（精簡用）＋這張圖上的小數序位與價格（換成時刻用） | — | 同上 |
| `ChartDrawingBoardAnchorCapacityError` | 哨兵錯誤 | 「加上這一個會超過繪圖點數上限」，帶著畫面要說的那一句 | `ChartDrawingBoardDomain` | 超過上限不收、已在上限時連一條趨勢線也不收 |

> `FreehandStrokeDomain` 只有一個公開動作（`simplified()`），取樣點的清理、精簡、抽樣全藏在裡面；呼叫端不必依序叫三個步驟。

---

## 4. Modified Components

| Component | Current role | Change needed |
| :--- | :--- | :--- |
| `ChartDrawingKindVo` | 一種繪圖的目錄列 | `minimumAnchorCount`、`maximumAnchorCount`、`freehand`；`brush`：2–200 點、`brush` 格、無快捷鍵、橘色、線寬 2、可改樣式、自由筆跡 |
| `KCandleTimelineDomain` | 第幾根 ↔ 哪一刻（整數） | `freehandAnchor(logicalIndex, price)`：第 ⌊i⌋ 根起始＋小數部分×一根的長度；`fractionalLogicalIndexOf(time)`：涵蓋它的那一根＋（它－那一根起始）÷一根的長度（落在休市空檔時對到之後那一根，與整數版一致）。資料範圍外照刻度往前後推 |
| `ChartDrawingDomain` | 一個繪圖能做的事 | 建構時錨點截到上限；`replaceAnchors` 數量要在下限～上限、價格要大於零；`placedOn` 自由筆跡用 `fractionalLogicalIndexOf` |
| `ChartDrawingDto` | 繪圖對外的樣子 | 加 `freehand`（畫面據此決定手勢、把手與光暈，不自己判斷種類） |
| `ChartDrawingBoardDomain` | 繪圖板與繪圖紀錄 | `added` 先算點數總和；`CHART_DRAWING_BOARD_ANCHOR_CAPACITY = 4000` |
| `ChartDrawingService` | 繪圖編排 | `draftFreehandDrawing`：`FreehandStrokeDomain` 精簡 → 時間軸換成錨點 → 照目錄預設樣式起一個草稿 |
| `useChartDrawings.finishDrawing` | 收進板子、選取、決定回不回游標 | 收不下時把錯誤帶的那一句交給既有的提示，板子與工具都不動 |
| `ChartDrawingLayer.vue` | 繪圖層的手勢與畫法 | 見 §5 |

---

## 5. Component Relationships

```mermaid
flowchart TD
    Layer[ChartDrawingLayer.vue<br/>按住拖曳取樣] -->|ChartDrawingStrokePointDto[]| App[ChartDrawingApplication.draftFreehandDrawing]
    App --> Svc[ChartDrawingService]
    Svc --> Stroke[FreehandStrokeDomain.simplified]
    Svc --> Timeline[KCandleTimelineDomain.freehandAnchor]
    Svc --> Draft[ChartDrawing → ChartDrawingDomain → ChartDrawingDto]
    Layer -->|放開：finish| Composable[useChartDrawings.finishDrawing]
    Composable --> Add[ChartDrawingApplication.addDrawing]
    Add --> Board[ChartDrawingBoardDomain.added<br/>點數上限]
    Board -.->|超過| Error[ChartDrawingBoardAnchorCapacityError]
    Error -.-> Composable
    Composable -->|announcement| Toast[既有的一閃提示]
    Layer -->|每次重畫| Place[placeDrawings → ChartDrawingDomain.placedOn<br/>自由筆跡用小數序位]
```

**繪圖層的自由筆跡手勢：**
- 按下：選的工具起草稿後 `freehand` 為真時，開始一筆（記第一個取樣點、攔下圖的拖動縮放）。磁鐵不參與。
- 移動：取樣（x、y、`xToLogical` 的小數序位、`yToPrice`），每次以全部取樣點問 Application 要草稿——草稿就是放開後會存下的樣子。
- 放開：草稿至少兩個點才交出 `finish`；恢復圖的拖動縮放。
- 取消（換工具、換檔／刻度、Esc、瀏覽器取消）：沿用既有的「丟掉草稿」。
- 畫法：以相鄰兩點的中點為端點、點本身為控制點畫二次曲線，筆跡平順。
- 點到判斷：任一段與指標的距離 < 6 像素＋半個線寬。
- 沒有把手；選取或滑過時先畫一道較寬的淡色同色光暈；兩軸不標範圍。

---

## 6. Extensibility & Handoff Notes

- **Most likely next requirement:** 另一種自由筆跡（螢光筆：半透明粗筆；箭頭筆：尾端帶箭頭），或讓奇異筆可以填色。
- **Where it lands:** 繪圖目錄（`CHART_DRAWING_KINDS` 多一列，`freehand: true`、點數上下限）＋繪圖層的 `painters`／`hitTesters` 表各一列；
  取樣、精簡、時間對位、點數上限全部共用，不必改。
- **How to add it:** 在 `chart-drawing-kind-vo.ts` 加一列 → `ChartDrawingKindValue` 加一個值（TypeScript 會指出 `painters`、`hitTesters`、`TOOL_ICONS` 缺哪幾列）→ 補畫法與圖示。
- **Patterns applied & why:** 表驅動目錄（既有）＋以目錄屬性取代種類判斷；精簡演算法收在單一 Domain Model 裡，換演算法（例如改用 Visvalingam）只改它。
- **Do not hardcode:** 2／200 點數上下限從目錄讀；4000 是 `CHART_DRAWING_BOARD_ANCHOR_CAPACITY`；1 像素是 `FreehandStrokeDomain` 的常數。
- **Known debt / deferred:** 無。（原本整筆拖動逐點呼叫 `shiftAnchor`、每點重建一次時間軸；
  improve-codebase 階段已改成一次平移一整組錨點的 `shiftAnchors`，一次移動只建一次時間軸。）

---

## 7. Traceability

| PRD Scenario | Fulfilled by |
| :--- | :--- |
| US-01 選了奇異筆，畫一個圈 | `ChartDrawingLayer`（手勢）+ `ChartDrawingService.draftFreehandDrawing`（橘色、線寬 2、實線）+ `useChartDrawings.finishDrawing` |
| US-01 奇異筆在工具列上的位置 | `CHART_DRAWING_TOOL_GROUPS` / `CHART_DRAWING_KINDS`（`brush` 格、無快捷鍵）+ `ChartDrawingService.listToolGroups` |
| US-01 點一下沒拖不留東西 | `FreehandStrokeDomain`（重複點只留一個）+ `ChartDrawingLayer`（不到兩點不交出） |
| US-01 連續繪圖關著／開著 | `useChartDrawings.finishDrawing`（既有） |
| US-01 磁鐵模式對奇異筆無效 | `KCandleTimelineDomain.freehandAnchor`（不吸）+ `ChartDrawingLayer`（自由筆跡不走 `alignAnchor`） |
| US-01 畫到一半按 Esc | `ChartDrawingLayer.abandonGesture`（既有，`activeDrawingKind` 變了就丟） |
| US-02 經過兩根之間的地方也畫在兩根之間 | `KCandleTimelineDomain.freehandAnchor` + `ChartDrawingDomain.placedOn`（小數序位）+ 繪圖層二次曲線 |
| US-02 換每根涵蓋的時間，筆跡仍在原本那一刻 | `KCandleTimelineDomain.fractionalLogicalIndexOf` |
| US-02 縮放與平移後形狀不變 | 錨點只存時刻與價格；`placedOn` 每次依時間軸重算 |
| US-02 很長的一筆最多留 200 個點 | `FreehandStrokeDomain.simplified`（平均抽樣、頭尾必留） |
| US-02 幾乎是直線的筆跡只留很少的點 | `FreehandStrokeDomain.simplified`（RDP 1 像素） |
| US-02 拖到零以下的點略過 | `FreehandStrokeDomain`（略過）+ `ChartDrawingDomain.applied`（拖動也不收零以下） |
| US-03 點在筆跡旁邊選取它／點在圈的中間選不到 | `ChartDrawingLayer.hitTesters.brush` |
| US-03 整筆拖動 | `ChartDrawingLayer` 既有整筆移動 + `ChartDrawingService.shiftAnchors` + `fractionalLogicalIndexOf` |
| US-03 改線色、線寬、線型 | 目錄 `styleEditable: true` + `ChartDrawingDomain.applied`（既有） |
| US-03 沒有逐點的把手 | `ChartDrawingLayer.handlesOf`（`freehand` 時沒有）+ 選取光暈 |
| US-03 鎖定的奇異筆拖不動 | `ChartDrawingDomain.applied`（既有鎖定規則） |
| US-03 上一步與下一步 | `ChartDrawingBoardDomain`（既有） |
| US-03 出現在物件樹 | `ChartDrawingObjectTree`（讀 `kindLabel`，目錄帶出「奇異筆」） |
| US-03 另一台電腦看到同一筆 | `ChartDrawingBoardProxy`（既有，時刻原樣收送） |
| US-04 沒超過上限照收／剛好到上限照收 | `ChartDrawingBoardDomain.added` |
| US-04 超過上限不收／已在上限時連一條趨勢線也不收 | `ChartDrawingBoardDomain.added` → `ChartDrawingBoardAnchorCapacityError` → `useChartDrawings.finishDrawing` 提示 |

---

## 8. Risks & Open Decisions

- **Risks / trade-offs:**
  - 每次移動都以全部取樣點重新精簡：一筆數百個取樣點時 RDP 成本可忽略；換來的是「看到的就是存下的」。
  - 筆跡取樣的 x、y 是取樣當下的畫面座標；畫的途中圖不能拖動縮放（既有攔截），所以精簡用的座標彼此一致。
  - `replaceAnchors` 不收零以下價格也套用到既有八種繪圖：交易服務本來就會拒絕，這只是讓拖到零以下變成「不動」而不是「存不進去」。
- **Open decisions (for implementation):** 無。
