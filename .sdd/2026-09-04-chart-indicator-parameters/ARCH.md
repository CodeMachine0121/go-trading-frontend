# 在 K 線圖表上調策略的旋鈕 — Architecture Design

**PRD:** [`PRD.md`](PRD.md)（28 條驗收條件） · **Brief:** [`BRIEF.md`](BRIEF.md)
**UL:** [`../UL-MAP.md`](../UL-MAP.md)

---

## 1. Design Goal & Guiding Principle

圖表那一側目前**處處以策略識別碼當鍵**：清單、失敗說明、計算中、請求序號、線色。
那套鍵成立的前提是「一支策略在圖上只有一筆」。本切片要讓同一支擺好幾筆，
於是那個前提消失了——**這個設計的主體工作，是把那五處的鍵換掉，而且只換那五處。**

指導原則：**兩種身分，兩種壽命，不要混用。**
- **一次套用的身分**：只在這個畫面活著（清單本來就不留存），用來分辨「圖上這幾筆」。
- **一條線的記憶身分**：跨越每一次打開畫面，用來回想顏色。它**不能**跟著套用走，
  否則使用者挑過的顏色下次就認不得自己了。

把這兩件事混成同一把鑰匙，是這個切片最容易犯、而且**不會報錯**的錯：
顏色會安靜地失憶，沒有任何地方會紅。

---

## 2. 一次套用的身分：為什麼不能沿用策略識別碼

同一支策略可以擺好幾筆，五處鍵值會**同時**撞在一起：

| 現況（以策略識別碼為鍵） | 撞在一起會怎樣 |
| :--- | :--- |
| `appliedStrategies` 的 `filter(applied.id !== strategyId)` | 移除一筆，**兩筆一起消失** |
| `failureMessages: Map<number, string>` | 一筆失敗，**另一筆旁邊也紅** |
| `requestNumbers: Map<number, number>` | 一筆重算會把另一筆在飛的結果判成過期，**那一筆再也畫不出來** |
| `calculatingStrategyIds` | 一筆在算，**兩筆都顯示計算中** |
| `chartIndicators.filter(indicator.strategyId !== …)` | 一筆算完會**覆蓋掉另一筆的線** |

### 身分是什麼

**一個遞增的序號 `appliedIndicatorId`，由 `useChartIndicators` 一處產生。**

它不必跨畫面唯一——清單不留存，重新打開就沒有它了。它唯一的職責是
「在這個畫面上分辨這幾筆」。

**刻意不用參數值當身分**（雖然清單上正是用值來分辨它們給人看）：
- 使用者改一筆的值，身分就會在**計算飛在半空中時改變**，回來的結果認不得自己。
- 一個旋鈕都沒有的策略可以擺兩筆（PRD US-02 邊界），兩筆的值都是空的——撞在一起。

「給人看的區分」與「給程式用的身分」是兩件事。前者要誠實（值本身最誠實），
後者要穩定（序號最穩定），硬用同一個就得在兩邊各讓一步。

---

## 3. 一條線的記憶身分：US-06 的規則落在哪一層

線色的記憶鍵**維持 `策略識別碼:指標名稱` 不變**。它答的是
「**我習慣這支的均線是藍色**」——那個習慣屬於策略，不屬於某一次套用。

於是同一支擺兩筆時，兩筆的**記憶身分完全相同**，兩條線會同色。
PRD US-06 要求第二筆不沿用。規則精確地說是：

> **記住的顏色照用，除非圖上已經有一條「同一個記憶身分」的線正畫著。**

這個措辭很重要——它**不是**「顏色被別人用掉就換一個」。後者會推翻
`.sdd/2026-09-03-chart-indicator-overlay/` 已接受的
「一條線挑過的顏色即使已被別條線用掉也照樣採用」，
而那條規則保護的是使用者對**那一條線**的明確選擇，它仍然對。

這裡的情況不同：占用那個顏色的**就是同一條線**，只是它已經在圖上了。
使用者明說的是「那條線是藍色」，不是「它的第二份複本也是藍色」。

### 誰知道「這是第幾次」——不是畫面

**沒有人需要知道「第幾次」。** 領域需要的是一個事實：
**圖上目前畫著哪些線（它們的記憶身分與顏色）**。那是畫面本來就持有的狀態。

新增 VO **`DrawnChartLinesVo`**，取代 `ChartIndicatorRequestDto` 現有的
`takenColorTokens: readonly string[]`：

```
DrawnChartLinesVo
  ├─ takenColorTokens      → 配色時要避開的（既有行為，一字不改）
  └─ drawnLineKeys         → 已經在圖上的那幾條線的記憶身分
```

`ChartLineColorDomain` 的建構子因此從
`(rememberedToken, takenTokens)` 變成 `(rememberedToken, drawnLines)`，
並在**取用記憶之前**多問一句：這條線的記憶身分是否已經在圖上。
規則仍然只有這一份，仍然住在同一個模型裡。

> **為什麼把兩份清單併成一個 VO 而不是多加一個參數**：它們來自同一個來源
> （圖上其他線），也永遠一起變。分成兩個參數，第三個關於「圖上有什麼」的問題
> 出現時就會變成第三個參數——參數列會長，而它們其實是同一個概念的三個面。

---

## 4. 參數值的記憶：一個新的能力介面，一條合併規則

### 介面（比照 `IChartLineColorPreferenceProxy`，以能力命名）

```ts
// app/domain/interface/i-strategy-parameter-value-preference-proxy.ts
export interface IStrategyParameterValuePreferenceProxy {
  /** 這支策略的這個旋鈕上次被調成什麼，沒調過（或讀不到）時是 null。 */
  readValue(strategyId: number, parameterName: string): number | null
  writeValue(strategyId: number, parameterName: string, value: number): void
}
```

- **逐個名稱讀寫**，與線色那個一模一樣的形狀。理由相同：鍵怎麼組只有領域知道，
  交出一整份表就要求外面也會組同一把鑰匙，而兩邊一旦組得不一樣，**記憶會安靜地消失**。
- 實作 `StrategyParameterValuePreferenceProxy`，前綴
  `go-trading:chart-strategy-parameter:`，讀寫都 `try/catch` 吞掉——
  記不住不影響這一次（PRD US-01 的「不讓網站存東西」那條）。

### 合併規則住在哪裡

新增 Domain Model **`AppliedIndicatorParametersDomain`**：
**宣告是唯一的真相，記憶只是起始值。**

```
constructor(
  strategyId,
  declaredParameters: readonly StrategyParameterDto[],   // 策略現在宣告的
  parameterValuePreferenceProxy,                         // 能力，不是查好的表
)
toDtos(): StrategyParameterDto[]   // 每一格：名稱與種類照宣告，值照記憶或預設
```

逐條走**宣告**（不是走記憶），對每一個名稱問一次記憶：

| 情況 | 結果 | 對應 AC |
| :--- | :--- | :--- |
| 名稱在宣告裡、記憶裡也有 | 用記住的值 | US-01「上次調過的值就是起點」 |
| 名稱在宣告裡、記憶裡沒有 | 用策略的預設值 | US-04「多宣告了一個」 |
| 名稱只在記憶裡 | **不出現，也不參與計算** | US-04「不再宣告某個旋鈕」 |
| 讀不到記憶（瀏覽器不讓存） | 全部用預設值 | US-01「不讓網站存東西」 |

「改名」不需要第四條規則——它就是「少一個舊的、多一個新的」，
上表第二、三列自然涵蓋（US-04 第三條情境）。

### 為什麼不跟指標計算畫面那一側共用

那一側編輯的是**宣告本身**（新增／刪除／改名／改種類／改預設值），
用的是 `StrategyParametersDomain`；這一側**不動宣告**，只填值。
兩者唯一相同的是「一份參數的清單」這個形狀——那個形狀已經共用了
（`StrategyParameterDto`），共用到此為止。
硬把兩個用例塞進同一個模型，會得到一個「有時候可以改名字、有時候不行」的物件，
而那個「有時候」只能靠呼叫端自律。

**驗證共用**：值合不合法（回看根數必須是大於零的整數）仍然問
`StrategyParametersDomain.validationMessage()`——那條規則與宣告在哪裡編輯無關。

---

## 5. 兩段式流程：挑一支不再等於加一支

### 狀態放哪裡

放在既有的 `useChartIndicators`，**不另開 composable**。

理由是**元件的故事一個字都不會變**：它仍然只做一件事——
「使用者挑了一支」→ `applyIndicator(strategy)`。至於這一次是直接上圖、
還是先停在待調整的狀態，是那個 composable 內部的事。

拆成兩個 composable 會讓那個判斷**浮到元件層**（元件得先問草稿、再決定要不要呼叫套用），
而那正是「元件不寫業務規則」要避免的。

```
useChartIndicators 新增：
  pendingAppliedIndicator: ref<AppliedIndicatorDto | null>   // 還沒上圖的那一筆
  applyIndicator(strategy)          // 唯一入口：內部決定直接上圖或停下來
  changePendingParameterValue(name, value)
  confirmPendingIndicator()
  cancelPendingIndicator()
```

### 「一個旋鈕都沒有的策略挑了就直接上圖」不是畫面裡的 if

`applyIndicator` 拿到的是 Application 交出來的 **`AppliedIndicatorDto`**，
它自己答得出來：

```ts
class AppliedIndicatorDto {
  readonly id: number
  readonly strategy: StrategyDto
  readonly parameters: readonly StrategyParameterDto[]
  /** 沒有任何一格要調——挑了就該直接上圖，不該多一步確認。 */
  get readyToApply(): boolean { return this.parameters.length === 0 }
  /** 清單上用來分辨同一支的好幾筆：把這一次的值攤成一句話。 */
  get parameterSummary(): string { … }
  withParameterValue(name, value): AppliedIndicatorDto
}
```

判斷住在資料旁邊，composable 只是照它的答案走；元件連這個問題都不必問。

### Application 的入口

```
ChartIndicatorApplication.prepareAppliedIndicator(strategy, appliedIndicatorId)
  → AppliedIndicatorDto      // 宣告與記憶已經合併好
ChartIndicatorApplication.rememberParameterValues(appliedIndicatorDto)
  → void                     // 確認上圖時，把這一次的值記下來
```

`prepareAppliedIndicator` 是一個**深的介面**：呼叫端說「我要套用這一支」，
裡面吞掉了讀記憶、對照宣告、丟掉過期名字、補上預設值四件事。
呼叫端不知道記憶存在，也不該知道。

---

## 6. Change Scope

### 新增

| 元件 | 職責（單一） | 滿足的情境 |
| :--- | :--- | :--- |
| `dto/applied-indicator-dto.ts` | 清單上的**一筆**：身分、策略、這一次的值；答得出「要不要調」與「怎麼標」 | US-01.3、US-02.3/5 |
| `domains/applied-indicator-parameters-domain.ts` | 宣告 × 記憶 → 這一次的那幾格 | US-01.1/4/5、US-04 全部 |
| `interface/i-strategy-parameter-value-preference-proxy.ts` | 「記住一個旋鈕被調成什麼」這個能力 | US-03.2、US-04 |
| `proxy/strategy-parameter-value-preference-proxy.ts` | 上者的實作（瀏覽器儲存，存不了就當沒調過） | US-01.5 |
| `vo/drawn-chart-lines-vo.ts` | 圖上目前畫著哪些線：顏色與記憶身分 | US-06 全部 |
| `molecules/AppliedIndicatorParameterFields.vue` | 待調整那一筆的那幾格 | US-01.1/2 |

> **為什麼參數那幾格是新元件而不是重用 `StrategyParameterList`**：
> 那一個管的是**宣告**（改名、改種類、新增、刪除），這裡一格都不能改那些——
> 只有值。同一個元件要同時服務兩者，就得長出「哪些欄位可以動」的開關，
> 而那個開關會讓兩邊都變得更難讀。它們不是同一個 UI 概念：
> 一個是「這支策略有哪些旋鈕」，一個是「這一次要轉到幾」。

### 修改

| 檔案 | 改什麼 |
| :--- | :--- |
| `composables/use-chart-indicators.ts` | 五處鍵換成 `appliedIndicatorId`；`selectableStrategies` **移除過濾**；新增待調整那一筆的狀態與四個動作 |
| `service/chart-indicator-service.ts` | 送出的參數改用**這一次的值**（取代現在的「照策略記著的那一份」）；配色改收 `DrawnChartLinesVo` |
| `domains/chart-indicator-domain.ts` | 收 `DrawnChartLinesVo`；線的記憶身分維持 `策略識別碼:指標名稱` |
| `domains/chart-line-color-domain.ts` | 取用記憶前多問一句：這條線是否已經在圖上 |
| `dto/chart-indicator-request-dto.ts` | `strategy` 之外多帶這一次的參數值；`takenColorTokens` → `DrawnChartLinesVo` |
| `dto/chart-indicator-dto.ts` | `strategyId` → `appliedIndicatorId`（外加 `strategyId` 供記憶身分用）；`usedColorTokens` → 交出 `DrawnChartLinesVo` 需要的兩份 |
| `application/chart-indicator-application.ts` | 兩個新入口 |
| `molecules/ChartIndicatorPanel.vue` | 清單改以 `appliedIndicatorId` 為鍵；顯示這一次的值；待調整那一筆的區塊 |
| `plugins/dependencies.ts` | 注入新的偏好 proxy |

### 刻意不動

- **重算的觸發**（顯示區間、停手、跟盤）：一個字都不改。多幾筆就是多算幾次。
- **K 線圖表本身**、**指標計算畫面**：後者是上一個切片的地盤。
- **線色的記憶鍵格式**：改了它等於忘掉所有人挑過的顏色。
- **失敗分類**（連不上／算式跑不動／名字對不上）：沿用既有的
  `messageOf`，它已經認得名字對不上那一種（上一個切片建立）。

### Depth check

| 介面 | 呼叫端要知道幾件事 | 判定 |
| :--- | :--- | :--- |
| `prepareAppliedIndicator(strategy, id)` | 「我要套用這一支」 | ✅ 深（吞掉四件事） |
| `applyIndicator(strategy)` | 同上；直接上圖或停下來由裡面決定 | ✅ 深 |
| `IStrategyParameterValuePreferenceProxy` | 兩個方法、兩個參數，鍵怎麼組不外洩 | ✅ |
| `DrawnChartLinesVo` | 一個概念取代兩個平行清單 | ✅ 參數列變短 |

---

## 7. Extensibility & Handoff Notes

### 最可能的下一個需求

**「把圖上那幾筆存起來，下次打開還在。」**

現在清單刻意不留存，但一旦使用者調了三筆各自不同的參數，重擺一次的成本就變高了——
這正是本切片自己在 Known Risks 裡記下的代價。

**吸收它的接縫**：`AppliedIndicatorDto` 已經**完整描述一筆**
（策略識別碼 + 這一次的值），而 `appliedIndicatorId` 刻意設計成
「不必跨畫面唯一」。要留存時，只需要：
1. 多一個 `IAppliedIndicatorPreferenceProxy`（同一套形狀）；
2. 打開畫面時把讀回來的每一筆各配一個新序號。

**不會被迫改的**：線色的記憶身分（本來就不跟著套用走）、
參數值的記憶（那是另一個問題的答案，兩者可以並存）、重算的每一條路徑。

### 給下一個接手的人

- **兩種身分不要混。** `appliedIndicatorId` 短命、`策略識別碼:指標名稱` 長命。
  看到有人把套用序號寫進儲存的鍵裡，那是 bug——顏色會在下次打開時全部失憶。
- **宣告是唯一的真相。** 任何「記憶裡有但宣告裡沒有」的東西一律丟掉。
  留著它只會讓一個畫面上找不到的旋鈕繼續影響計算。
- `useChartIndicators` 動完之後約 380 行、四組狀態（圖上那幾筆、待調整那一筆、
  正在看的那一段、停手計時）。**這是已知的債**：見 §9。

---

## 8. Traceability

| PRD 情境 | 由誰滿足 |
| :--- | :--- |
| US-01.1 先看到那幾格 | `applyIndicator` → `prepareAppliedIndicator` → `pendingAppliedIndicator` |
| US-01.2 調好才上圖、算的是調過的值 | `confirmPendingIndicator` → `ChartIndicatorRequestDto.parameters` |
| US-01.3 沒有旋鈕就直接上圖 | `AppliedIndicatorDto.readyToApply` |
| US-01.4 上次的值是起點 | `AppliedIndicatorParametersDomain` × 偏好 proxy |
| US-01.5 存不了東西照樣運作 | proxy 的 `try/catch` → 讀不到即預設值 |
| US-01.6 不改動策略的預設值 | 值只進 `ChartIndicatorRequestDto`，**不經過任何儲存策略的路徑** |
| US-02.1 已套用的仍然挑得到 | `selectableStrategies` 移除過濾 |
| US-02.2/4/5 擺兩次、各自移除 | `appliedIndicatorId` 為鍵的五處 |
| US-02.3 用值分辨 | `AppliedIndicatorDto.parameterSummary` |
| US-02.6 兩條線預設不同色 | `DrawnChartLinesVo` + `ChartLineColorDomain` |
| US-03.1 只有那一次重算 | `calculateOne(appliedIndicator)` 只碰它自己那一筆 |
| US-03.2 改過的值下次還在 | `rememberParameterValues` |
| US-03.3 清單不留存 | 不做任何事（既有行為） |
| US-03.4 記住最後設定的那個 | 逐個名稱寫入，後寫的蓋前寫的 |
| US-04.1/2/3 宣告變了 | `AppliedIndicatorParametersDomain` 的三條規則 |
| US-05.1/2 名字對不上就地指名 | 既有 `messageOf` × 以套用為鍵的 `failureMessages` |
| US-05.3 只有失敗那一次沒有線 | 同上（鍵換掉之後自然成立） |
| US-05.4/5 留在清單上、收掉上一輪的線 | 既有行為，鍵換掉之後對每一筆各自成立 |
| US-06.1/3 挑過的照挑的畫 | `ChartLineColorDomain` 規則一（不變） |
| US-06.2 第二筆不沿用 | `drawnLineKeys` 命中時跳過記憶 |
| US-06.4 顏色用光照樣畫 | `FALLBACK_CHART_LINE_COLOR`（不變） |

---

## 9. Risks & Open Decisions

### 對既有測試的影響

- **`selectableStrategies` 的斷言要反過來**：既有測試斷言「已套用的那一支不再出現在
  可挑清單裡」，現在它必須出現。**這是刻意的行為變更**（PRD US-02.1 明文要求），
  不是把過濾弄丟了——理由見 PRD 的 Known Risks。
- **以策略識別碼查失敗說明／計算中的測試**改用套用序號。斷言的**行為沒有變**：
  一筆失敗只標在它自己旁邊。變的只是「它自己」怎麼指認。
- **`remove-indicator-${strategy.id}` 這類測試識別字**跟著換成套用序號。
- **線色測試**：既有那條「挑過的顏色即使被別條線用掉也照樣採用」**必須維持綠**——
  它沒有被推翻，被加上例外的是「同一條線已經在圖上」那一種，那是新的一條。
- 其餘測試不受影響。

### Risks / trade-offs

- **`useChartIndicators` 實測 436 行、仍是四組狀態**（圖上那幾筆、待調整那一筆、
  正在看的那一段、停手計時）。收尾時重新量過：**訊號尚未觸發**，維持原判。
  接受的理由不變：把「待調整那一筆」拆出去會讓「要不要直接上圖」的判斷浮到元件層。
  **該回頭處理的訊號**：當「正在看的那一段 + 停手計時」那兩組狀態也開始被別的
  畫面需要，或這個檔案長出第五組彼此獨立的狀態時，先拆那兩組（它們與套用無關），
  而不是拆待調整那一筆。
- **參數值記憶是「每支策略每個名稱一份」，不是「每一筆套用一份」。**
  習慣同時看兩個值的人下次要重擺一次。這與清單不留存是同一個代價，PRD 已記。
- **`AppliedIndicatorDto` 同時帶策略識別碼與套用序號**，看起來像兩個身分。
  它們確實是兩個，而且刻意如此（§2、§3）。命名上以 `id` 專指套用序號、
  `strategy.id` 專指策略，避免出現裸的 `strategyId` 欄位造成誤用。

### 收尾時做的一件事：讓每一列自己知道自己是什麼樣子

`ChartIndicatorPanel` 原本收 **10 個 props（其中 3 個是函式）**，每畫一列要拿那一列的
身分**查五次表**：有沒有在算、失敗說明、那幾格、畫了哪些線、是不是什麼都沒畫。
函式型 props 就是那個訊號——它等於請上層代查，而每一次查表都是一次
「外面也要會算同一把鑰匙」的要求；鑰匙一旦兩邊算得不一樣，畫面會**安靜地**少畫一列的狀態。

新增 `AppliedIndicatorRowDto`（連同 `AppliedIndicatorLineDto`），由 composable 一處併好。
結果：**props 10 → 6、函式型 props 3 → 0、逐列查表 5 → 0**，
`KCandleChartPanel` 那兩處把 Application 的答案轉手給下層的地方也一併消失
（那個問法搬進了 composable，它本來就持有 Application）。
**一條測試都沒有改**——行為完全沒變，這正是它是重構而不是改行為的證據。

### 實作時發現的一處既有死碼

`useChartIndicators.recalculateAfterKCandleClosed` 開頭的
「還沒有正在看的那一段就不算」那道關卡**走不到**：面板在載入當下就已經設好了那一段，
所以一根走完時它必然存在。它是型別收窄需要的那一行（那個欄位可能是 `undefined`），
拿不掉，也測不動——寫了一條要釘住它的測試，跑出來證明的正是「這條路不存在」。

本切片沒有動到它（`git diff` 可證），因此不在這次覆蓋率關卡的範圍內；
**該回頭處理的訊號**：若哪天「正在看的那一段」改成延後設定（例如等圖表回報第一次區間），
這道關卡就會變成真的路徑，那時要補一條測試釘住它。

### Open decisions

- 無。
