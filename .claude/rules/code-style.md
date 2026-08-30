# Code Style（TypeScript / Vue）

格式與 lint 交給 ESLint（`@nuxt/eslint` + `typescript-eslint`）與各自的官方慣例。本檔只規定 lint 擋不掉的設計原則。

## 型別要明確

- **禁止 `any`。** 也不准用 `as any`、`@ts-ignore`、`@ts-expect-error` 繞過型別檢查。
- **禁止用 `unknown` 當資料多型手段**——`unknown` 只用於「真的還不知道形狀、下一步立刻 narrow」的邊界（如 `catch (error: unknown)`）。
- **禁止 `object`、`Record<string, any>`、`{ [key: string]: any }` 當通用資料容器。**
- 需要多型時用**具名 interface（行為）**或**明確的 union type（有限集合）**。
- 唯一可接受的鬆散結構：泛型型別參數（`<T>`），以及對接第三方 SDK 時它自己要求的形狀，且**必須侷限在 infrastructure 層內**。
- `tsconfig` 一律開 `strict`；不得為了讓某段程式通過而在專案層級關掉任何 strict 旗標。

## 資料一律用 `class`，不用 `interface` / `type`

TypeScript 最容易破功的一條，規則詳見 [naming.md](naming.md)：**`interface` 只抽象行為**，entity / domain model / DTO / VO 一律 `class`。

`type` alias 只用於**有限的字面量聯合**（`type FinalVerdict = 'buy' | 'hold' | 'sell' | 'avoid'`），不用來描述物件形狀。

**唯一例外：proxy 檔內描述後端 wire 形狀的 `type XxxWire`。** 它描述的是外部契約而非我們的 model，永遠不會有實例被 `new` 出來（它從 `JSON.parse` 來），也永遠不帶行為，因此不適用「資料一律 class」。條件是它**必須宣告在 proxy 實作檔內、不得匯出、不得進 `domain/models/`**——詳見 [data-access.md](data-access.md)。

## 變數宣告當下即賦值

禁止「先宣告、後賦值」。

```ts
// ❌
let total: number
total = calculate()

// ✅
const total = calculate()
```

- **預設用 `const`**；只有真的要重新賦值才用 `let`。**禁用 `var`。**
- 例外：序列化 / binding 的 decode 目標（需要先有一個空殼給框架填）。

## 行為掛在物件上

- 業務計算一律是 **Domain Model 的 method**，不是散落的匯出函式。
- **model 內禁止任何 `static` method**（entity / domain model / DTO / VO 皆然），含看似無害的工廠與轉換。建構用建構子，轉換用來源身上的 `toXxx()`——詳見 [architecture.md](architecture.md)。
- **禁止 `private static` method**：它的參數屬於誰，就把 method 搬進誰裡面，改用自身 property 運算。
- **`private` method 只有被 2 個以上 public method 共用時才留**，否則直接 inline。
- 例外：真正無狀態的轉換模組（parser、formatter）可用純函式，見下方 helper 門檻。

### 禁止 static helper class 與雜物模組

**不准開 `XxxHelper` / `XxxUtils` / `XxxManager` 這類「一堆靜態方法的雜物櫃」，也不准開 `helpers.ts` / `utils.ts` / `common.ts` 這種一堆匯出函式的雜物模組。**

看到想寫 helper 的衝動，先照 [architecture.md](architecture.md) 的三步搬家：這個方法的參數屬於誰，就搬進誰裡面。多數 helper 的存在，只是因為行為沒有放回它的資料旁邊。

**真的不得已**才建立 helper，門檻是**全部**符合：

1. 完全無狀態，且**不碰任何領域資料**（碰了就該是 Domain Model 的行為）
2. 沒有任何一個既有物件「擁有」這個行為——搬給誰都不合理
3. 純技術性轉換或框架黏合（格式解析、編碼轉換、字串正規化）

符合的話：

- **一律放 `app/utilities/`**，不散落在各層，也不放進 Nuxt 會自動 import 的 `app/utils/`。
- 職責要具體（`date-formatter.ts` 優於 `common-utils.ts`）。
- 不放任何業務規則。**業務規則進了 `utilities/` 就是設計錯了。**

## 金額用精確小數型別

- 價格、金額、停損等**金錢欄位一律用精確小數型別**（`decimal.js`），**禁用 JavaScript `number`**——`0.1 + 0.2 !== 0.3` 在交易數字上不可接受。
- 後端以字串回傳金額時，proxy 一律轉成精確小數型別再進 domain，**不要中途經過 `number`**（經過就已經失真了）。
- 非金額的權重、比例、分數（如 `sourceWeight`、信心指數）可用 `number`。
- 只在最後要渲染時才 `.toString()` / 格式化成字串。

> 目前專案尚未安裝 `decimal.js`——**第一個金額欄位出現時再裝**，不要先用 `number` 頂著。

## Vue 元件

- 一律 `<script setup lang="ts">`，不用 Options API、不用 `defineComponent`。
- `defineProps` / `defineEmits` 用型別參數宣告，**不用執行期的物件語法**。
- **元件內不寫業務規則**：看到 `if` 在判斷業務條件（哪種裁決該顯示什麼顏色、信心夠不夠），那是 Domain Model 的事，讓它算好放進 DTO。
- 元件只允許認識 Application 與 DTO（見 [architecture.md](architecture.md)）。

## 錯誤處理

- 對外邊界（後端 API）的錯誤要在 **proxy 或 domain service** 包成**領域可辨識的具名錯誤**（自訂 `Error` 子類別 / 哨兵錯誤），讓元件能分流錯誤畫面，而不是把底層的 `FetchError` 原封往上丟。
- `catch` 一律 `catch (error: unknown)` 後立刻 narrow，**不得 `catch (error: any)`**。
- **不吞錯誤**：`catch` 區塊裡什麼都不做等於製造無聲失敗。要嘛處理、要嘛往上拋。
