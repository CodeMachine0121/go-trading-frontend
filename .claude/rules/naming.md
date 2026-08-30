# Naming Conventions（前端版）

命名規範。**大小寫、檔名格式一律 follow TypeScript / Vue 自身的慣例**，本檔只規定「名字怎麼取」。

## 通則

- **命名一律全名，避免縮寫**（`institutionalScore` 不寫 `instScore`、`confidenceLevel` 不寫 `confLvl`）。
- 識別字大小寫：class / interface / type 用 `PascalCase`，變數與 method 用 `camelCase`，常數用 `SCREAMING_SNAKE_CASE`。

## 各層角色固定後綴

| 角色 | 後綴 | 層 |
| :--- | :--- | :--- |
| Controller | **`.vue` 元件檔本身**（不加 `Controller` 後綴） | `app/pages/`、`app/components/` |
| Application | `Application` | `app/application/` |
| Domain service | `Service` | `app/domain/service/` |
| Proxy | `Proxy` | `app/infrastructure/proxy/` |

**前端沒有資料庫，因此沒有 `Repository`。** 所有對外資料存取一律 `Proxy`。

`Service` 後綴**僅**用於跨物件的編排；單一物件的計算放它自己的 Domain Model。

### Controller 就是 `.vue` 元件

`.vue` 元件扮演後端 controller 的角色，但**不加 `Controller` 後綴**——Vue 生態的慣例是用元件本身的名字。它的「controller 身分」由所在資料夾（`pages/` / `components/`）決定，不由名字決定。

- 檔名 `PascalCase.vue`，以畫面上的東西命名（`InvestmentVerdictTable.vue`、`PipelineRunStatusBadge.vue`）。
- `pages/` 底下依 Nuxt 的檔案路由慣例用 kebab-case（`investment-verdicts/index.vue`）。
- **不叫 `XxxView.vue`、`XxxContainer.vue`、`XxxWrapper.vue`** 這種只描述技術角色、不描述內容的名字。

### 外部資源一律用 `Proxy`

**只要是透過 API 呼叫外部資源 / 服務，封裝它的物件一律以 `Proxy` 結尾。** 不論對方是自家後端 REST、第三方 REST、GraphQL 或 SDK。

- **介面**用「做什麼事」命名：`I{能力}Proxy`，放 `app/domain/interface/`。
- **實作**用「誰來做」命名：`{Provider}{能力}Proxy`，放 `app/infrastructure/proxy/`。
- **不使用 `Client`、`Gateway`、`Adapter`、`Api`、`Service`、`Connector` 等同義後綴。**
- **一個外部資源一個 Proxy**：所有對該資源的呼叫都從這個 proxy 出去，其他層一律透過介面呼叫。**`$fetch` / `useFetch` / `axios` 只准出現在 proxy 實作檔內**，application、domain、`.vue` 元件一律不得直接呼叫。
- Proxy 負責把後端回傳的原始 JSON **正規化成 entity / VO** 再往內傳，不把 wire 格式漏進 domain。後端回傳的 snake_case、日期字串、`null` 都在 proxy 這一層收乾淨。

## 資料物件命名

| 類別 | 規則 | 位置 |
| :--- | :--- | :--- |
| **Entity**（乾淨 Data Model，只有欄位） | 以領域語彙命名，**不加任何後綴** | `app/domain/models/entities/` |
| **Domain Model**（行為所在地） | **`Domain` 後綴** | `app/domain/models/domains/` |
| **DTO**（service 回傳給 application 的純資料） | `Dto` 後綴 | `app/domain/models/dto/` |
| **VO**（不可變、無行為的值物件） | **`Vo` 後綴** | `app/domain/models/vo/` |
| **Request**（送往後端的 body 形狀） | `Request` 後綴 | proxy 同層 |

- querystring / route 參數**不立 class**，直接在元件內以 `useRoute()` 逐一解析後傳給 Application。
- 元件收到的**一律是 DTO**，不另立 `ViewModel` / `Props` 型別當資料多型手段（`defineProps` 的型別直接指向 DTO class）。

### 四種 model 的後綴一眼可辨

同一個領域概念會同時存在四種形狀，後綴就是它們的身分證——看到名字就知道它屬於哪一層、能不能帶行為、能不能離開 domain：

```
InvestmentVerdict         entity      只有欄位
InvestmentVerdictDomain   行為         由 entity 轉換而來，業務規則住在這裡
InvestmentVerdictDto      對外形狀      domain 交給 application / 元件的唯一形狀
MoneyVo                   值           不可變、無行為
```

**Entity 是唯一不帶後綴的**，因為它是那個領域概念的本體；其餘三種都是它的某種投影，各自加上後綴表明自己是什麼。

## 介面：以「能力」抽象命名，不以「供應商」命名

- `interface` 只用於「行為契約」，一律 `I` 前綴。
- **集中放在 `app/domain/interface/`，一個介面一個檔案。**
- **實作檔內不得宣告任何 `interface`。**
- 不使用「port」一詞或資料夾。

### 介面只抽象「行為」，絕不抽象「資料」

**`interface` 的唯一用途是抽象業務層的 method——proxy 這類「做什麼事」的契約。**
**資料一律用 `class` 定義，不論它是 entity、domain model、DTO、VO 還是 service 的參數。**

```ts
✅ interface IInvestmentVerdictProxy { fetchLatestVerdicts(): Promise<InvestmentVerdict[]> }
❌ interface InvestmentVerdictDto { stockSymbol: string; finalVerdict: string }   // 這是資料，該用 class
✅ class InvestmentVerdictDto { /* 建構子可驗證、可帶 toXxx() 轉換 */ }
```

這條在 TypeScript 特別容易破功，因為 `interface` / `type` 描述資料太方便了。判準很簡單：**它有沒有「多個實作要替換」？** 沒有就不該是 interface。一份資料形狀永遠只有一種樣子，抽成 interface 只是把 class 少寫了一個字，換來的是它從此無法帶建構子驗證、無法帶 `toXxx()` 轉換、也無法在執行期辨認型別——而**執行期存在**正是我們要的：DTO 是 class，才能在元件裡當 `defineProps` 的型別、才能被 `instanceof` 檢查。

**Service 與 Application 接收的物件一律用 DTO。** 需要一組參數時，把它們封裝成 `XxxDto`，不要抽 interface、不要用 `type` alias、也不要直接用行內的物件字面量型別（`{ from: string; to: string }`）當參數。DTO 因此是雙向的——它既是 domain 交給 application 的回傳形狀，也是元件交給 application 的輸入形狀。

### 核心原則

**介面命名要 focus 在「這個能力是什麼」，而不是「現在是誰在提供」。**

供應商只是眾多可替換實作的其中之一。介面若綁死供應商，換一家就得多開一個介面，抽象就失效了。

```
❌ IGoStockBackendProxy   ← 綁死供應商，換後端就得改名
✅ IInvestmentVerdictProxy ← 綁定能力，誰來實作都行
```

| 介面（能力，抽象） | 實作（供應商，具體） |
| :--- | :--- |
| `IInvestmentVerdictProxy` | `InvestmentVerdictProxy` |
| `IMapProxy` | `GoogleMapProxy`、`AmazonMapProxy` |
| `IObjectStorageProxy` | `AmazonObjectStorageProxy`、`AzureObjectStorageProxy` |

判斷方式：**如果明天換一家供應商，介面名字要不用改**——改到了就代表抽象層次不對。

### 同樣原則套用到所有角色

| 角色 | 介面 | 實作 |
| :--- | :--- | :--- |
| Application | `I{用例}Application` | `{用例}Application` |
| Proxy | `I{能力}Proxy` | `{Provider}{能力}Proxy`（單一供應商時直接用純角色名） |

Application 的抽象維度是**用例**，不是實作手段。Application 目前只有單一實作、由組裝根直接注入元件，**除非真的需要替換，否則不必為它開介面**。

## 檔名

**檔名格式 follow 語言慣例**，一律遵守「**一檔一主角，檔名對齊主要型別**」：

| 種類 | 格式 | 例 |
| :--- | :--- | :--- |
| `.vue` 元件 | `PascalCase.vue` | `InvestmentVerdictTable.vue` |
| `pages/` 路由 | kebab-case（Nuxt 檔案路由） | `investment-verdicts/index.vue` |
| 其餘 `.ts` | `kebab-case.ts` | `investment-verdict-application.ts` |
| 介面檔 | `i-` 前綴、一檔一介面 | `i-investment-verdict-proxy.ts` |
| 測試檔 | 受測檔名 + `.spec.ts` | `investment-verdict-service.spec.ts` |

- 介面檔獨立成檔，**實作檔內不得宣告 interface**。
- 實作檔用實作本身的名字（純角色名，或帶供應商前綴），不帶 `I`。
- **不使用 `index.ts` 做 barrel re-export**——它會讓「檔名對齊主型別」失效，也讓循環依賴難查。一律 import 到具體檔案。

## 業務詞彙

**不得自創同義詞。** 前端的領域詞彙一律沿用後端 `.sdd/UL-MAP.md` 的通用語言（`KCandle`、`Open` / `High` / `Low` / `Close`、`Volume`…），不在前端另取名字。後端叫什麼，前端的 entity / DTO 欄位就叫什麼。
