# 在指標計算畫面上調策略的旋鈕 — Architecture Design

**Feature:** 在指標計算畫面上調策略的旋鈕
**Status:** Finalized
**PRD:** `PRD.md`（同一資料夾）
**Owner:** James Hsueh

---

## 1. Design Goal & Guiding Principle

**參數不是兩種型別，是一個數字加上一種讀法。** 系統那一側已經這樣定案，
前端**原樣沿用**——同一個概念在兩邊長得不一樣，是最容易累積錯誤的地方。

三個問題要正面回答，其餘都是它們的後果：

1. `StrategyContentDto` 上一個切片才縮到兩個欄位，現在要加回第三個——**這不是走回頭路。**
2. 兩種種類怎麼在 TypeScript 這一側表達成同一份清單，**且不使用 `any`**。
3. 「名字對不上」怎麼一路辨識到畫面，**且不與「算式跑不動」混在一起**。

---

## 2. 為什麼加回第三個欄位不是走回頭路

上一個切片把 `StrategyContentDto` 從四個欄位縮到兩個，拿掉的是
**彙總刻度**與**計算根數**。那次的判準寫得很清楚：

> **不含交易標的、彙總刻度與計算根數**——那三樣描述的是**某一次執行**，不是這套算法。

**同一個判準這次指向相反的方向。** 「快線是二十期」不描述某一次執行——
它換到哪一檔、哪一種粗細、哪一段時間去算都一樣，它是**這套算法的一部分**。

判準沒有改變，改變的是被放進去的東西：

| 欄位 | 屬於誰 | 在 `StrategyContentDto` 裡嗎 |
| :--- | :--- | :--- |
| 算式內容 | 這套算法 | ✅（一直都在） |
| 指標值種類 | 這套算法 | ✅（一直都在） |
| **策略參數** | **這套算法** | ✅（本切片加入） |
| 彙總刻度、要看多長、交易標的 | 某一次執行 | ❌（上一個切片拿掉，維持不變） |

**測它的方式與上次相同**：載入另一支策略時，參數必須跟著換；改動參數必須算「還沒存」。
既有的策略庫因此**一行都不用改**——它比對的是整個 `StrategyContentDto`，
多一個欄位就自動被比對到。這正是那個切片把三處合成一處的回報。

---

## 3. 兩種種類，一份清單，沒有 `any`

沿用系統那一側的答案：**值是一個 `number`，種類說明怎麼讀它。**

```ts
export type StrategyParameterKind = 'lookbackCount' | 'number'   // 有限字面量聯合，規範允許的唯一 type 用途

export class StrategyParameterDto {
  constructor(
    public readonly name: string,
    public readonly kind: StrategyParameterKind,
    public readonly value: number,
  ) {}
}
```

**這裡沒有兩種型別可以裝**，所以不需要任何能裝下兩者的東西。
`number` 是具體型別，`kind` 是宣告的一部分——不是讀取時才猜的。

畫面據此長出正確的格子，**判斷不寫在畫面裡**：

```ts
// StrategyParameterDomain
inputMode(): 'numeric' | 'decimal'   // 回看根數給整數鍵盤，數值給小數鍵盤
step(): number                        // 1 或任意
validationMessage(): string | null    // 「回看根數必須是大於零的整數」
```

元件只把答案接到屬性上，不做 `if (kind === ...)`——那是規範明文禁止的
「把業務判斷寫進 template 的三元運算」。

**`value` 只有一個，不分「這一次的值」與「預設值」。** 在寫算式的畫面上，
試一個值與定一個預設值是同一件事（PRD §5）。圖表那一側才需要分，那是另一個切片，
兩邊的決定各自成立、不互相引用。

---

## 4. 「要看多長」：一個新的 VO，不重用圖表那個

```ts
export class CalculationSpanVo {
  constructor(public readonly label: string, public readonly minutes: number) {}

  kCandleCountAt(interval: AggregationIntervalVo): number {
    return Math.max(1, Math.floor(this.minutes / interval.minutes))
  }
}
```

**不重用 `ChartVisibleRangeVo.kCandleCountAt`。** 它們的算法一模一樣，
但**輸入不同**：圖表那個由兩個時刻相減得出長度，這裡的長度是使用者直接挑的一個選項。
把它們併成一個，就得讓其中一邊憑空造出兩個時刻，或讓另一邊多帶一個用不到的長度——
**兩個小物件各自誠實，好過一個要為兩種來源解釋自己的物件。**

若日後兩邊真的長出第三種用法，屆時抽共用的依據會比現在清楚。

---

## 5. 「名字對不上」怎麼一路走到畫面

系統那一側回的是 **400**（與「請求本身有問題」同一種），訊息裡指名是哪一個參數。
**它與「算式跑不動」的 422 是不同的回應**——那正是兩者分得開的依據。

> 補記：這一條在系統那一側**原本沒有被對映**，會掉成 502「系統壞了」。
> 寫這份設計時發現並修掉了（見 go-trading 的 `.sdd/2026-09-04-strategy-parameters/CONTRACT.md`）。

前端這一側：

```
IndicatorCalculationProxy
  400 且訊息指名了參數 → StrategyParameterNotDeclaredError（新的哨兵）
  422                  → IndicatorScriptFailedError（既有）
  其餘 400             → IndicatorCalculationFieldError（既有）
```

**判斷「訊息指名了參數」不能靠比對字串。** 讓系統那一側在回應裡多帶一個
**參數名稱**欄位，前端據此辨識——訊息的文字是給人看的，不是給程式比對的。

畫面因此有**第五則**說明，與既有四則並列：欄位錯、**名字對不上**、算式跑不動、連不上、未預期。

---

## 6. Change Scope

### 新增

| 層 | 檔案 | 為什麼 |
| :--- | :--- | :--- |
| domain/models/dto | `strategy-parameter-dto.ts` | 一個參數的唯一形狀（雙向） |
| domain/models/domains | `strategy-parameter-domain.ts` | 一個參數的所有規則與畫面要問的問題 |
| domain/models/domains | `strategy-parameters-domain.ts` | **整份**的規則：名稱不重複、有沒有可用的一份 |
| domain/models/vo | `calculation-span-vo.ts` | 「要看多長」與它換算格數的方式 |
| domain/errors | `strategy-parameter-not-declared-error.ts` | 第五則說明的哨兵 |
| components/molecules | `StrategyParameterList.vue` | 參數這一整塊（宣告 ＋ 值 ＋ 新增／移除） |

### 修改

| 檔案 | 改什麼 |
| :--- | :--- |
| `dto/strategy-content-dto.ts` | 多一個 `parameters` |
| `domains/strategy-domain.ts`／`strategy-write-domain.ts` | 參數的往返與驗證 |
| `dto/indicator-calculation-request-dto.ts` | 帶參數；`candleCount` 由「要看多長」推導 |
| `proxy/strategy-proxy.ts`／`indicator-calculation-proxy.ts` | wire 形狀與第五種錯誤的辨識 |
| `IndicatorCalculationPanel.vue` | 參數區、「計算根數」換成「要看多長」、第五則說明 |

### 刻意不動

- ~~**策略庫（載入／另存／未儲存判斷）一行不改**——它比對整個 `StrategyContentDto`。~~
  > **實作時發現這句是錯的。** 載入與另存確實不必改（它們整份搬運 `StrategyContentDto`），
  > 但「未儲存判斷」不是整份比對——`StrategyDraftDomain` 是**逐欄位**列出來比的，
  > 於是新的那一欄它看不見：宣告了幾個旋鈕、改了名字、換了順序，
  > 全都不算「有東西還沒存」，下一次載入會把它們靜靜蓋掉。已補上比對
  > （`StrategyParametersDomain.isSameAs`，順序算數），並補了七條測試釘住它。
  > **教訓**：「整份比對」與「逐欄位比對」在型別上長得一模一樣，
  > 只有打開來看才分得出——設計時憑欄位名稱推斷它是哪一種，是在猜。
- **彙總刻度的既有規則**：仍屬於這一次執行。
- **K 線圖表的每一條路徑**：那是下一個切片。

### Depth check

| 診斷 | 結果 |
| :--- | :--- |
| 元件需要自己判斷種類嗎？ | 否。`inputMode()`／`step()`／`validationMessage()` 由 domain 回答 |
| 呼叫端需要自己把整份兜起來嗎？ | 否。`StrategyParametersDomain` 回答整份的問題 |
| 新增了幾個元件？ | 一個。參數清單是一個 UI 概念，不是「一列」加「一塊」兩個 |
| 有 `any` 嗎？ | 沒有。值是 `number`，種類是有限字面量聯合 |

---

## 7. Extensibility & Handoff Notes

### 最可能的下一個需求

**「圖表上套用時也要能調這些參數」**——那正是下一個切片，而且接縫已經在對的位置：
`StrategyParameterDto` 是雙向的，圖表那一側直接拿它當「這一份的值」的形狀。
真正要新增的是「**每一份各自一組值**」這個概念，它屬於圖表，不屬於這裡。

**「多一種參數種類」**——`kind` 是有限字面量聯合，多一個**數字類**的種類
（例如百分比）只要多一個字面量與一組答案。但**是非不是數字**，
它需要的不只是多一個字面量——值的型別會變。屆時該做的是讓值變成一個
帶種類的小物件，而不是把 `number` 撐大成什麼都能裝。

### 給下一個接手的人

- **不要把「這一次的值」與「預設值」在這個畫面上分開。** 這裡是寫算式的地方，
  兩者是同一件事；圖表那裡才不是。
- **不要靠比對訊息文字認出「名字對不上」。** 訊息是給人看的。
- **不要為了省一個小物件而把 `CalculationSpanVo` 併進 `ChartVisibleRangeVo`。** 見 §4。

---

## 8. Traceability

| PRD 情境 | 由誰滿足 |
| :--- | :--- |
| US-01.1 新增一個參數 | `StrategyParameterList.vue` 的新增，預設值由 `StrategyParameterDomain` 給 |
| US-01.2 參數跟著策略一起存 | `StrategyContentDto.parameters` ＋ 既有策略庫 |
| US-01.3 載入時參數跟著換 | 同上（載入覆蓋整個 `StrategyContentDto`） |
| US-01.4 刪掉一個參數 | `StrategyParameterList.vue` 的移除 |
| US-01.5 一個都不宣告時照常運作 | `StrategyParametersDomain` 允許空的一份 |
| US-01.6 改動算是還沒存的東西 | 既有策略庫比對整個 `StrategyContentDto`——**靠不做額外的事達成** |
| US-01.7 名稱空白就地說明 | `StrategyParametersDomain` 的驗證 |
| US-01.8 名稱重複就地說明 | 同上（整份的性質） |
| US-01.9 回看根數不合法就地說明 | `StrategyParameterDomain.validationMessage()` |
| US-02.1 說要看多長就夠了 | `CalculationSpanVo.kCandleCountAt` |
| US-02.2 換粗一點格數跟著變 | 同上 |
| US-02.3 有回看根數也不必填 | 格數仍由 §4 得出；回看由系統那一側加上 |
| US-02.4 畫面上沒有「計算根數」 | `IndicatorCalculationPanel.vue` 移除該欄位 |
| US-02.5 看不了那麼長就地說明 | 系統那一側的 400 → `IndicatorCalculationFieldError`，標在「要看多長」旁 |
| US-03.1 名字對不上就失敗並指名 | `StrategyParameterNotDeclaredError` |
| US-03.2 與「算式跑不動」是兩則 | 同上（不同的哨兵、不同的呈現位置） |
| US-03.3 改對就算得出來 | 無特別機制——改對之後就是一次普通的成功計算 |

---

## 9. Risks & Open Decisions

### 對既有測試的影響

- **`StrategyContentDto` 變寬**：每一處建構它的測試都要多帶一個參數清單。
  斷言的行為**一條都沒變**——載入會覆蓋、改動算未存，這兩件事本來就是這樣。
- **「計算根數」欄位消失**：指標計算畫面的測試中，填那一格、斷言它的錯誤訊息的那幾條
  要改成「要看多長」。**這是刻意的行為變更**，PRD US-02.4 明文要求它不存在。
- **`StrategyDraftDomain` 多比一個欄位**：既有斷言一條都沒改，只多了七條新的。
- 其餘測試不受影響。

### Risks / trade-offs

- **`value` 一個欄位承載兩種讀法。** 回看根數是整數卻存在 `number` 裡——
  與系統那一側同一個取捨，理由也相同（整數在 `number` 裡精確到 2^53）。
  代價是「這是整數」只由 `kind` 保證，不由型別保證；
  所以 `validationMessage()` 必須真的檢查它是不是整數，而不是假設。
- **依賴系統那一側回應裡的參數名稱欄位。** 若那個欄位沒送，
  前端就退回把它當成一般的欄位錯誤——會失去「這是哪一個名字」的精確度，
  但不會誤報成算式壞了。

### 實作期間的兩處設計調整

- **`StrategyParameterFieldDto` 改成把旋鈕本身一起帶著**，而不是讓畫面拿
  「旋鈕清單」與「呈現方式清單」兩份平行資料靠 index 對位。對位一旦交給畫面，
  它就得回答「第 n 列的描述不存在時怎麼辦」——一個永遠不會發生、
  卻必須寫在畫面上的分支，寫下去之後就沒有人能再證明它不會發生
  （它也正是覆蓋率上唯一補不起來的那兩條）。合成一份之後那個問題不存在。
- **刪掉三個沒有呼叫端的取值器與 `isEmpty`，以及「計算根數」的預設值**
  （`defaultCandleCount`）。最後一個是這次的孤兒：那一格已經不存在，
  留著它，下一個人會以為畫面某處還在用二十這個數字。

### 收尾時做了的三件事

- **`readNumberInput`（`app/utilities/`）**：`type="number"` 的框交出來的可能是數字、
  也可能是還沒讀成數字的那一段文字，兩處要一模一樣地處理。它過得了 helper 的門檻
  （無狀態、不碰領域資料、純框架黏合）；哪些數字合法仍然由領域回答。
- **`useStrategyParameters`**：改一列旋鈕原本是「讀出整份 → 交給 Application → 寫回去」
  三步，而那三步在面板裡重複了五次。順序搬到它操作的資料旁邊。
- **`useIndicatorCalculationRun`**：七個 ref 加一段二十行的失敗分流。它們的不變式是
  **一次計算只會留下其中一樣**，而那條不變式原本只靠一個「記得每一樣都要清掉」的
  函式維持——少清一個不會有任何地方報錯，只會留下一句屬於上一次的紅字。
  搬動時踩到一個真的坑：**請求的組裝本身就會失敗**（「要看多長」不合理是組裝那一刻
  才知道的），先組好再傳進去，那一種失敗就落在 try 之外、畫面上什麼都不會說。
  改成傳「怎麼組」而不是「組好的」。既有測試當場抓到了它。

### 看過但**刻意不做**的兩件事

- **不把 `IndicatorCalculationService` 那五個維護旋鈕的方法收成一個。**
  合成一個吃命令物件的方法會讓介面**更淺**：呼叫端仍得知道那五個動詞，
  還多一個要建的物件。**該回頭處理的訊號**：當第二個畫面也要編輯旋鈕，
  或這五個方法之中有任何一個不再只是轉呼叫時，把它們抽成 `StrategyParameterService`。
- **不按版面把 `IndicatorCalculationPanel` 拆成子有機體。**
  那幾塊（策略列／編輯區／參數／執行欄／結果）共用同一份互相牽動的狀態，
  照版面拆會換來二十幾條 props 與 emits——那是把耦合搬到介面上，不是解耦。
  真正的接縫在**狀態歸屬**，而三組狀態現在都已經在自己的 composable 裡
  （策略庫、旋鈕、最近那一次計算），面板本身只剩「使用者按了什麼」與版面。
  **該回頭處理的訊號**：當面板裡又長出第四組彼此獨立的 ref，
  或某一塊開始需要被別的畫面重用時。

### 事後發現的一個版面缺陷（已修）

把「參數」加進工作區時，它是以**第三個**子元素放進那個兩欄格線的，而且沒有給它欄位定位。
CSS 的自動排版於是把三個東西排成：

```
[算式編輯區] [參數]        ← 參數被擠進 21rem 的窄欄
[執行條件  ]              ← 執行條件掉到編輯區底下
```

兩塊都在錯的地方，而且**沒有任何地方會報錯**——版面壞掉不會讓測試變紅。

**修法不是補一行 `grid-column`。** 那只會把錯的東西擺回原來也不對的位置：
執行條件本來就不該是一根跟編輯區一樣高的側欄（它只有三個欄位，下面永遠空著一大塊，
而編輯區——這個畫面上唯一需要空間的東西——反而被擠窄）。
改成一條貼在頂上的橫列之後，工作區剩下**兩個**子元素，自動排版自然就對了。

> **教訓**：往一個格線容器裡多塞一個東西時，要問的是「這個容器現在有幾格」，
> 不是「這個東西長什麼樣」。

### Open decisions

- 無。
