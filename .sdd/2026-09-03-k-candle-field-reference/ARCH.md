# 算式收到的 K 線有哪些欄位 — Architecture Design

PRD: `PRD.md`
Brief: `BRIEF.md`

---

## 1. Design Goal & Guiding Principle

這塊說明的價值全在「它說的是對的」。所以設計只有一個重點：
**讓它不可能與外框各說一套。**

外框上那一行 `func Calculate(data []indicator.KCandle)` 由 `IndicatorScriptDomain` 產生。
如果欄位清單住在元件裡，兩者就是兩份各自演化的沙箱契約副本——
後端哪天改了 `vo.KCandleVo`，外框那一行照舊（它不提欄位），而說明會繼續說舊的那一套，
使用者照著它寫、編譯不過，然後怪自己。

→ 欄位清單住在 **domain**，並且與外框走**同一個 domain service**。
畫面一個欄位名、一個型別名都不自己寫。

## 2. Change Scope

| 檔案 | 動作 |
| :--- | :--- |
| `app/domain/models/vo/k-candle-field-vo.ts` | 新增：`KCandleFieldVo` + `K_CANDLE_FIELDS` 清單 |
| `app/domain/models/dto/k-candle-field-dto.ts` | 新增：交給畫面的形狀 |
| `app/domain/service/indicator-calculation-service.ts` | 加 `listKCandleFields()` |
| `app/application/indicator-calculation-application.ts` | 加 `listKCandleFields()` 轉呼叫 |
| `app/components/molecules/KCandleFieldReference.vue` | 新增：那一塊說明 |
| `app/components/organisms/IndicatorCalculationPanel.vue` | 右欄包一層 `__side`，把說明擺在「執行條件」底下；欄寬 19rem → 21rem |

**不動**：後端、proxy、外框的產生邏輯、`IndicatorScriptDomain`。

## 3. New Classes / Modules

| 名稱 | 住在 | 職責 |
| :--- | :--- | :--- |
| `KCandleFieldVo` | `domain/models/vo/` | 一個欄位：算式裡的名字、沙箱裡的型別、給人看的意思。`toDto()` 交出去 |
| `K_CANDLE_FIELDS` | 同檔案的 module 常數 | 那十個欄位，**由細節註解說明它與資料庫那張表的三個差異**——差異的理由寫在資料旁邊，不寫在畫面上 |
| `KCandleFieldDto` | `domain/models/dto/` | 畫面看得到的形狀 |
| `KCandleFieldReference.vue` | `components/molecules/` | 把清單攤成「名字 / 型別 + 意思」兩欄，加一段點出差異的說明 |

比照 `AGGREGATION_INTERVALS` 的既有做法（VO 清單 + service 轉成 DTO）——
同一個 codebase 裡同一種東西只該有一種寫法。轉換寫在來源身上（`field.toDto()`），
不是在 service 裡 `new KCandleFieldDto(...)`。

## 4. Modified Components

### 右欄變成一個堆疊

原本右欄只有「執行條件」一塊，自己 `overflow-y: auto`。現在它裝兩塊，
所以捲動的職責上移一層：包一個 `__side` 負責捲，兩塊面板各自 `flex: none`。

欄寬從 19rem 放寬到 21rem，讓最長的欄位名（`TakerBuyQuoteVolume`）加型別加意思
擺得下一行而不必折行——折行的清單掃起來會慢很多。

### 說明的文字寫在元件裡

點出差異的那一段是**畫面文案**，寫在元件的 template 內，比照既有的
`calculation-notice`（「計算一律排除最新一根 K 線…」）。
欄位資料來自 domain，說明文案屬於畫面——兩者不混。

## 5. Component Relationships

```
IndicatorCalculationPanel
   │  listKCandleFields()（進畫面時取一次，它不會變）
   ▼
IndicatorCalculationApplication → IndicatorCalculationService
                                       ├── describeIndicatorScript()  ← 外框
                                       └── listKCandleFields()        ← 欄位
                                              （同一份沙箱契約的兩半）
   │
   ▼
KCandleFieldReference（只負責攤開，不認識任何欄位名）
```

## 6. Extensibility & Handoff Notes

- 後端改了 `vo.KCandleVo`（多一個欄位、換一個型別），要改的只有 `K_CANDLE_FIELDS` 那一份清單。
- 之後若要「點欄位就插進編輯區」，插入的目標是編輯器，說明這一塊只要多發一個事件；
  欄位資料的來源不必動。
- 之後若沙箱多開放一個套件，要改的是元件裡那一段文案與外框的 `frameHeader()`——
  這兩處都在既有的檔案裡，**沒有第三處**。

## 7. Traceability

| AC (PRD) | 落在哪 |
| :--- | :--- |
| 逐一列出每一個欄位 / 說法與 K 線瀏覽一致 | `K_CANDLE_FIELDS` + `KCandleFieldReference.vue` |
| 時間是 Unix 秒的整數 | `K_CANDLE_FIELDS` 裡 `OpenTimeUnixSeconds` / `int64` 那一列 |
| 不列出算式看不到的東西 | 清單裡沒有 `ID`、沒有 `OpenTime`（刻意，註解說明理由） |
| 點出它是算式看得到的形狀 | `KCandleFieldReference.vue` 的 `__note` |
| 標出算式收到的參數形式 | `KCandleFieldReference.vue` 的 `#meta`（`data []indicator.KCandle`） |

## 8. Risks & Open Decisions

| 項目 | 決定 |
| :--- | :--- |
| 欄位清單要不要從後端拿？ | **不要。** 它是型別，不是資料；後端也沒有這樣的端點。代價是後端改型別時前端要跟著改一份清單——用註解把「這份清單對應後端哪一個型別」寫清楚，讓下一個人找得到 |
| VO 與 DTO 形狀一樣，要不要省掉 VO？ | **不省。** 比照 `AGGREGATION_INTERVALS`；而且若日後要問「哪些欄位是數值」，那是 VO 的行為，有地方放 |
| 說明要不要可折疊？ | **不要。** 十個欄位一次看得完，折疊只是多一個要記得的狀態 |
