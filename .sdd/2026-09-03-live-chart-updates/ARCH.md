# 圖表跟著眼前這一刻走 — Architecture Design

**Feature:** 圖表跟著眼前這一刻走
**Status:** Finalized
**PRD:** `PRD.md`（同一資料夾）
**Owner:** James Hsueh

---

## 1. Design Goal & Guiding Principle

兩項改動看起來無關，其實共用同一句話：**畫面上的東西要對應使用者眼前這一刻**。

1. **指標的計算範圍改由顯示區間決定。** 這是把一條綁錯的線接回去——
   「算哪一段」與「要不要重新取資料」本來就是兩個問題。
2. **圖上最後那一根跟著市場走。** 這是第一次引入一條會持續送東西進來的通道。

指導原則三句：

- **持續送進來的那條通道只有 proxy 知道。** `EventSource` 一個字都不許離開
  `app/infrastructure/proxy/`；往內傳的是已經正規化好的 entity。
- **合併的計算掛在持有那批 K 線的 domain model 上**，不是散在 composable 裡。
  「同一根反覆更新不重複累加」要**由結構保證**，不能靠呼叫端記帳。
- **取資料的規則一行不改。** 本切片只改「指標算哪一段」與「最後那一根長什麼樣」。

---

## 2. Change Scope

### 新增

| 層 | 檔案 | 為什麼存在 |
| :--- | :--- | :--- |
| domain/models/entities | `live-k-candle-update.ts` | 一則即時更新在 domain 內的本體形狀：交易標的、狀態、那一根 K 線 |
| domain/models/vo | `chart-visible-range-vo.ts` | 顯示區間本身，帶「跟另一段是不是同一段」的判斷 |
| domain/models/domains | `live-k-candle-chart-domain.ts` | **本切片的核心**：把即時更新併進圖上那批 K 線 |
| domain/interface | `i-live-k-candle-proxy.ts` | 「持續跟著一個交易標的」這個能力的契約 |
| domain/service | `live-k-candle-service.ts` | 跟盤的編排：開始跟、把每一則併進去、換標的、收尾 |
| application | `live-k-candle-application.ts` | 用例：畫面說我在看哪一個，拿回一份會自己更新的圖 |
| infrastructure/proxy | `live-k-candle-proxy.ts` | 唯一知道那條通道長什麼樣子的地方 |

### 修改

| 檔案 | 改什麼 |
| :--- | :--- |
| `app/composables/use-chart-indicators.ts` | `recalculateAll(chart)` → `recalculateForRange(range)`；新增停手等待與「同一段就不算」 |
| `app/components/organisms/KCandleChartPanel.vue` | 重算的觸發改掛在顯示區間變動；接上即時更新與「即時已停止」的呈現 |
| `app/plugins/dependencies.ts` | 組裝新的 proxy／service／application |
| `.sdd/2026-09-03-chart-indicator-overlay/` 的既有測試 | 兩條被取代的條款（見 §7） |

### 刻意不動

- **`KCandleChartViewportDomain` 一行不改。** 它回答的是「要不要重新取、取哪一段」，
  那個問題本切片沒有改變。指標改看顯示區間，與它無關。
- **`ChartIndicatorService` / `ChartIndicatorDomain` / 顏色那一整條路徑。**
  指標怎麼畫、怎麼配色、怎麼對位，全部沿用。
- **`KCandleChart.vue` 的繪圖邏輯。** 它收到什麼就畫什麼；即時更新只是讓它收到的東西變了。
- **既有的每一支各記「第幾次要求」的機制。** 新的觸發來源走的是同一個 `calculateOne`，
  因此亂序保護、顏色配置、失敗隔離**全部自動沿用，一行都不必新增**。

---

## 3. New Classes / Modules

### `LiveKCandleUpdate`（entity）

```ts
export type LiveKCandleStatus = 'forming' | 'closed' | 'stalled'

export class LiveKCandleUpdate {
  constructor(
    public readonly symbol: string,
    public readonly status: LiveKCandleStatus,
    public readonly kCandle: KCandle,
  ) {}
}
```

乾淨的 data model，無行為（行為在 domain model）。`status` 是有限字面量聯合——
規範允許的唯一 `type` 用途。

### `ChartVisibleRangeVo`（vo）

顯示區間的起訖，加上一個 `isSameAs(other)`。

**為什麼要有這個 VO，而不是傳兩個 `Date`：**
「顯示區間沒真的變就不重算」是一條業務規則，而判斷「是不是同一段」的資料就是這兩個時間——
**行為要住在它操作的資料旁邊**。傳兩個 `Date` 的話，這個判斷只能長在呼叫端。

它另外知道「這一段裡有幾根」（`kCandleCountAt(interval)`），因為根數是由區間長度
除以彙總刻度得來的——同樣是這兩個時間的性質。

### `LiveKCandleChartDomain`（domain model）★ 本切片的核心

**把即時更新併進圖上那批 K 線。** 建構子收下目前這張圖；`applying(update)` 回傳一個
新的實例；`toChartDto()` 給出併好之後的樣子。

```ts
constructor(chart: KCandleChartDto, liveKCandles: ReadonlyMap<number, KCandle>)
applying(update: LiveKCandleUpdate): LiveKCandleChartDomain
toChartDto(): KCandleChartDto
```

**「同一根反覆更新不重複累加成交量」由結構保證。** 它持有的是
**「五分鐘那一根的起始時間 → 那一根最新的樣子」的對照表**，而不是一個累加中的數字。
同一根再送一次就是**取代**對照表裡那一筆，不是加上去——
因此重複累加**在結構上不可能發生**，呼叫端也不必記任何帳。
這正是「不要讓呼叫端記帳」的做法：把狀態換成一個天生冪等的形狀。

合併的規則（`toChartDto` 內）：
- 每一根即時 K 線依**畫面正在看的彙總刻度**歸到它所屬的那一格。
- 那一格的最高價取兩者較高、最低價取兩者較低、收盤價取**起始時間最晚**的那一根的收盤價、
  成交量為原本那一格加上落在其中的每一根即時 K 線（每個起始時間只算一次）。
- 歸屬的那一格若不存在，圖上就多一根。

### `ILiveKCandleProxy`（domain/interface）

```ts
export interface ILiveKCandleProxy {
  followKCandles(symbol: string, onUpdate: (update: LiveKCandleUpdate) => void): () => void
}
```

**回傳的是「怎麼停」。** 不另外定義一個訂閱物件——停止是唯一需要的操作，
一個函式就是完整的契約，也讓呼叫端不可能忘記怎麼收尾。

介面以**能力**命名（跟著一個交易標的），不綁供應商。

### `LiveKCandleService`（domain service）

跟盤的編排：`followKCandles(symbol, chart, onChart)`——開始跟、每收到一則就併進去、
把併好的圖交出去。換標的與離開畫面由回傳的停止函式處理。

`Service` 後綴用得對：它跨了 proxy 與 domain model 兩者，是編排而非單一物件的計算。

### `LiveKCandleProxy`（infrastructure）

唯一知道那條通道長什麼樣子的地方：接上、把每一則訊息正規化成 `LiveKCandleUpdate`、
斷掉時送出一則「即時已停止」。wire 形狀（`type LiveKCandleUpdateWire`）
只存在於這個檔案內，不匯出。

### Depth check

| 診斷 | 結果 |
| :--- | :--- |
| 呼叫端需要自己排步驟嗎？ | 否。`followKCandles` 一次做完接上／併入／交出 |
| 參數會不斷長大嗎？ | proxy 兩個參數；service 三個（其中一個是回呼） |
| 呼叫端需要記帳嗎？ | **否**——這是本設計最在意的一點，見上方 |
| domain 認識傳輸嗎？ | 不認識。往內傳的是 entity |

---

## 4. 節流住在哪一層，以及為什麼

**「使用者還在動的時候不算」是業務規則，「等三百毫秒」是實現它的機制。**
兩者分開放：

| 部分 | 住在哪 | 理由 |
| :--- | :--- | :--- |
| **同一段區間就不算** | `ChartVisibleRangeVo.isSameAs` | 純粹是那兩個時間的性質，可用表格測試 |
| **等停手才算** | `useChartIndicators`（composable） | 它需要計時器。專案規範明訂測試「時間用 `vi.useFakeTimers()`，不自己包一層時鐘物件」——把等待包成一個 domain 物件，等於為了純度做出規範明文反對的東西 |

**為什麼不把等待放進 domain：** 一個「等一下再做」的物件，它的行為只能靠時間推進來觀察，
而 domain model 在這個專案裡的價值正是「不必推進時間就能驗」。
把它留在 composable，換來的是 `ChartVisibleRangeVo` 保持純粹，
而等待本身用假時鐘驗——兩邊都測得動。

**這不是把業務規則放進畫面。** composable 沒有做任何判斷：
它只是「隔一段時間再問一次 application」。要不要真的算，由 VO 回答。

---

## 5. Component Relationships

```
KCandleChartPanel.vue
   │  顯示區間變了
   ├──▶ useChartIndicators.recalculateForRange(range)
   │        │ 等停手 300ms → range.isSameAs(上次算的)? 不同才往下
   │        └──▶ ChartIndicatorApplication ──▶（既有路徑，含每支自己的要求序號）
   │
   │  正在看哪一個交易標的
   └──▶ LiveKCandleApplication.followKCandles(symbol, chart, onChart)
            └──▶ LiveKCandleService
                     ├──▶ ILiveKCandleProxy（impl 持有那條通道）
                     └──▶ LiveKCandleChartDomain.applying(update).toChartDto()
```

### 執行順序 — 使用者拖動

1. 圖表元件送出顯示區間變動（既有事件，不新增）。
2. composable 記下這一段，等三百毫秒；期間再有變動就重新等。
3. 停手後與「上次算過的那一段」比對；相同就結束。
4. 不同則對每一支呼叫既有的 `calculateOne`——**亂序保護與配色沿用**。

### 執行順序 — 市場有動靜

1. proxy 收到一則，正規化成 `LiveKCandleUpdate`。
2. service 交給 `LiveKCandleChartDomain.applying(update)`，拿回新的一份。
3. 併好的圖交回畫面；圖重畫最後那一根。
4. **狀態是「還在走」→ 不重算指標**（它本來就不算數）。
   **狀態是「走完了」→ 重算每一支**（可用的資料真的多了一根）。
   **狀態是「即時已停止」→ 只更新那一行說明**，圖與指標都不動。

---

## 6. Extensibility & Handoff Notes

### 最可能的下一個需求

**「我想同時看兩檔」**（分割畫面）。它會打在哪：`ILiveKCandleProxy` 是**每個交易標的一次呼叫、
回傳自己的停止函式**，所以第二檔就是第二次呼叫——**介面一個字都不必改**。
`LiveKCandleChartDomain` 也已經是「一張圖一個實例」，天生可以有兩個。
真正要動的只有畫面：兩個 panel 各自持有自己的那一份。

**「即時更新也要餵給指標」**——**不要做**。系統那頭明確不算進行中的那一根，
畫面自己算會讓同一支策略在同一時刻有兩個答案。這條在 PRD 與後端切片都有背書。

### 給下一個接手的人

- **不要把「算哪一段」重新綁回「要不要重新取資料」。** 那正是本切片修掉的東西，
  理由寫在 PRD 的 Dependencies & Risks。
- **不要把成交量改成累加。** 對照表的形狀就是防重複累加的機制，改成累加就得開始記帳。
- **不要在 composable 裡判斷「要不要算」。** 那個判斷屬於 `ChartVisibleRangeVo`。

---

## 7. 被取代的既有條款，與對測試的影響

| 被取代 | 原本 | 現在 |
| :--- | :--- | :--- |
| `chart-indicator-overlay` US-02「換到需要重新取 K 線的區間時重算」 | 掛在「要不要重新取」 | 掛在「顯示區間變了」 |
| `chart-indicator-overlay` US-02「圖上那批 K 線沒換就不重算」 | 條件是「那批資料沒換」 | 條件收窄為「**顯示區間真的沒變**」 |

**對既有測試的影響：** `tests/components/organisms/KCandleChartPanelIndicators.spec.ts`
中依賴「換標的才重算」的案例仍然成立（換標的必然改變顯示區間所對應的資料），
但「小幅拖動不重算」那一條的**理由**變了——它現在成立的原因是那一段區間相同，
而不是那批資料沒換。該測試需重寫其斷言的依據，並補上「拖到不同區間會重算」的新案例。
**這是刻意的行為變更，不是回歸。**

---

## 8. Traceability

| PRD 情境 | 由誰滿足 |
| :--- | :--- |
| US-01.1 算的是顯示區間 | `useChartIndicators.recalculateForRange` 帶 `ChartVisibleRangeVo` 的起訖與根數 |
| US-01.2 拖到另一段就重算 | 同上（觸發改為顯示區間變動） |
| US-01.3 拉遠也重算 | 同上 |
| US-01.4 還在動時不算 | `useChartIndicators` 的停手等待 |
| US-01.5 一支都沒套用不計算 | 既有的「清單為空即返回」 |
| US-01.6 區間沒真的變就不算 | `ChartVisibleRangeVo.isSameAs` |
| US-02.1 收盤價跟著變 | `LiveKCandleChartDomain.toChartDto` |
| US-02.2 更高的成交價推高最高價 | 同上 |
| US-02.3 較低的成交價不拉低最高價 | 同上 |
| US-02.4 一根走完多出一根新的 | 同上（歸屬的那一格不存在即新增） |
| US-02.5 成交量不重複累加 | `LiveKCandleChartDomain` 持有的對照表（取代而非累加） |
| US-02.6 換標的就換跟的對象 | `LiveKCandleService` 回傳的停止函式 + 重新跟 |
| US-02.7 離開畫面就不再跟 | 同上（元件卸載時呼叫） |
| US-03.1 併進所屬的那一根 | `LiveKCandleChartDomain` 依彙總刻度歸屬 |
| US-03.2 併進去時最高取較高 | 同上 |
| US-03.3 跨過邊界才多一根 | 同上 |
| US-03.4 五分鐘刻度時不需要併 | 同上（歸屬即自己） |
| US-04.1 進行中的變動不重算 | `KCandleChartPanel.vue` 依狀態分流：`forming` 不觸發重算 |
| US-04.2 一根走完時重算 | 同上：`closed` 觸發 `recalculateForRange` |
| US-04.3 沒套用時走完也不計算 | 既有的「清單為空即返回」 |
| US-05.1 停止時明說 | `LiveKCandleProxy` 斷線時送出「即時已停止」；面板呈現 |
| US-05.2 停止時圖不清空 | 面板只更新那一行說明，不動 `chart` |
| US-05.3 恢復後說明消失 | 收到任何非停止狀態即清掉說明 |
| US-05.4 即時不能用時其餘照常 | 即時是獨立的一條路徑；失敗只影響那一行說明 |

---

## 9. Risks & Open Decisions

### Risks / trade-offs

- **合併是畫面自己算的。** 系統那頭給的一律是五分鐘一根，畫面把它併進更粗的那一格。
  若合併結果與系統下次回覆的彙總 K 線有出入，**下一次重新取資料就會蓋過去**，
  因此偏差不會累積——但在兩次取資料之間，畫面上最後那一根是畫面的算法，不是系統的。
- **對照表只在同一張圖的生命週期內有效。** 換標的、重新取一批 K 線都會換掉那張圖，
  對照表跟著重來。這是刻意的：舊的即時資料屬於舊的那一批。
- **「不重複累加」只保證同一根被反覆更新的情形。** 若系統回覆的那一格已經包含某一根
  五分鐘 K 線、而即時通道又送來同一根，理論上會重複算一次。實務上不會發生——
  即時送來的是**還沒走完**的那一根，而系統存的一律是走完的。
  **該回頭處理的訊號**：若日後即時通道改成也重送已走完的歷史 K 線，這條就不再成立。

### Open decisions

- 「即時已停止」的說明文字，與既有錯誤訊息的語氣統一——實作時定案。
