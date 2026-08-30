# Component Design — 原子化設計與 SCSS 中央控管

本檔規範 `.vue` 元件怎麼切、怎麼共用，以及樣式寫在哪裡。
分層歸屬（元件屬於 Controller 層、只認識 Application 與 DTO）見 [architecture.md](architecture.md)，
命名格式見 [naming.md](naming.md)，型別與語法見 [code-style.md](code-style.md)。

核心只有兩句：

1. **同一個 UI 概念，全專案只留一個元件**——長相由使用端決定，不是複製一份新元件。
2. **樣式值只有一個來源**——所有顏色 / 間距 / 字級都是 token，字面值只准出現在 `app/assets/styles/`。

---

## 一、原子化設計（Atomic Design）

元件依「組成粒度」分層，資料夾即層級：

| 層級 | 資料夾 | 是什麼 | 例 |
| :--- | :--- | :--- | :--- |
| **Atoms（原子）** | `app/components/atoms/` | 不可再拆的通用 UI 單位。**純展示、不認識任何領域概念** | `AppButton`、`AppInput`、`AppBadge`、`AppSpinner` |
| **Molecules（分子）** | `app/components/molecules/` | 幾個原子組成的一個功能單位，開始認識 DTO | `BackendHealthCard`、`StockSymbolSearchField` |
| **Organisms（有機體）** | `app/components/organisms/` | 由分子與原子組成的完整區塊，通常對應畫面上的一個獨立段落 | `InvestmentVerdictTable`、`PipelineRunTimeline` |
| **Templates（樣板）** | `app/components/templates/` | 只負責版面骨架與插槽，**不綁任何資料** | `DashboardLayout` |
| **Pages（頁面）** | `app/pages/` | Nuxt 路由層。呼叫 Application、拿 DTO、往下餵給元件 | `investment-verdicts/index.vue` |

- **`app/components/` 底下不得直接放 `.vue`**，一定要落在四個層級資料夾之一（ESLint 會擋）。
- 判斷粒度的方法：**「這東西再拆下去還有意義嗎？」** 沒有 → atom；「它是不是由好幾個小東西湊成、且本身有一個明確用途？」→ molecule；「它是不是畫面上可以獨立存在的一整塊？」→ organism。
- 拿不定主意時**往下放一層**（先當 molecule）。往上升級只是搬檔案，往下拆則要改介面。

### 依賴方向只能由上往下

```
pages → templates → organisms → molecules → atoms
```

- 下層**不得** import 上層（atom 不認識 molecule，molecule 不認識 organism）。ESLint 會擋。
- 同層之間可以組合，但要留意別繞成環。
- **Atoms 連 DTO 都不准 import。** 領域資料從 molecule 才開始出現——原子必須能在任何專案的任何畫面重用。
- 資料一律**由上往下用 props 傳、事件由下往上 emit**，中間層不自己去拿資料（拿資料是 page 的事）。

### 元件之間一律顯式 import

```ts
import AppButton from '~/components/atoms/AppButton.vue'
```

Nuxt 的 auto-import 雖然可用（`components.pathPrefix` 已設為 `false`，元件名不帶資料夾前綴），
但**元件組合另一個元件時一律顯式 import**：依賴關係看得見、ESLint 的層級規則擋得到，
元件測試也能在不啟動 Nuxt runtime 的情況下直接 `mount`。

### 命名

- **Atoms 一律 `App` 前綴**（`AppButton`、`AppTag`）——它是全站唯一的那一個通用元件，前綴同時避開與原生標籤同名。
- **Molecules 以上用領域語彙命名**（`BackendHealthCard`、`InvestmentVerdictTable`），不加層級前綴。
- 不叫 `XxxView` / `XxxContainer` / `XxxWrapper`。

---

## 二、一個 UI 概念只有一個元件

**這是原子化設計的重點，也是最常被破壞的一條。**

畫面上會有主要按鈕、次要按鈕、危險按鈕、小按鈕、整寬按鈕——
但「按鈕」這個概念在專案裡**永遠只有 `AppButton` 一個元件**。

```
❌ PrimaryButton.vue / DangerButton.vue / SmallButton.vue / IconButton.vue
✅ AppButton.vue（variant / size / block 由使用端決定）
```

### 長相由使用端決定

元件負責**結構與行為**，使用端負責**外觀選擇**。三種手段，優先序由上而下：

| 手段 | 用在 | 例 |
| :--- | :--- | :--- |
| **有限 union 的 variant / size prop** | 設計系統認可的幾種長相 | `<AppButton variant="danger" size="small">` |
| **slot** | 內容（文字、圖示）一律用 slot，不用 `label` prop | `<AppButton><AppIcon name="refresh" />重新檢查</AppButton>` |
| **class fallthrough** | 只調整「這個位置的排版」（margin、grid 位置） | `<AppButton class="toolbar__action">` |

- variant / size 一律是**有限的字面量 union**（`'primary' | 'secondary' | 'ghost' | 'danger'`），不是任意字串、更不是傳一包 style 物件進來。
- **需要新長相時，是在該元件內新增一個 variant（必要時先補 token），不是新增一個元件。**
- 互斥的外觀用 **variant enum**，不要用一堆布林旗標疊（`primary` + `danger` 同時為 true 是無意義狀態）。布林只用於真正的開關（`block`、`loading`）。
- 原生行為（`type`、`disabled`、`@click`）一律走 **attribute fallthrough**，不重新包一層 props。

### 什麼時候才真的該有第二個元件

只有**語意不同**時：`AppButton`（送出動作）與 `AppLink`（導航）是兩個元件，因為一個渲染 `<button>`、一個渲染 `<a>`。
**只是長得不一樣，永遠不構成新元件的理由。**

### 元件內不寫業務規則

「裁決是 sell 所以顯示紅色」是業務規則，不是樣式問題。
讓 Domain Model 算好、DTO 帶出來（例如 `verdictDto.tone === 'danger'`），元件只負責把它接到 `variant`：

```vue
❌ <AppBadge :variant="verdict.finalVerdict === 'sell' ? 'danger' : 'success'" />
✅ <AppBadge :variant="verdict.tone" />
```

---

## 三、SCSS 中央控管

### 一律 SCSS、一律 scoped

- 樣式一律寫在該元件的 **`<style scoped lang="scss">`** 內（ESLint `vue/block-lang` 會擋掉沒有 `lang="scss"` 的 style 區塊）。
- **禁止**：純 CSS 的 `<style>`、inline `style="..."`、CSS-in-JS、utility class 框架（Tailwind 之類）、以及在 `app/` 各處散落 `.css` 檔。
- **全域樣式只有一支入口**：`app/assets/styles/main.scss`（於 `nuxt.config.ts` 的 `css` 註冊）。要加全域樣式前先問「這是不是其實該屬於某個元件」——九成是。

### 樣式中央層的結構

```
app/assets/styles/
├── abstracts/            只有變數 / 函式 / mixin，不產生任何 CSS
│   ├── _tokens.scss      ★ 全站唯一寫字面值的地方（顏色、間距、字級、圓角、陰影…）
│   ├── _functions.scss   token 存取函式：color() / spacing() / font-size() / radius() …
│   ├── _breakpoints.scss 斷點 map 與 respond-to() mixin
│   ├── _mixins.scss      跨元件重複的樣式片段（focus-ring、surface…）
│   └── _index.scss       @forward 以上四支
├── base/
│   ├── _tokens.scss      把 abstracts 的 map 展開成 :root 的 CSS custom property
│   ├── _reset.scss       最小限度 reset
│   └── _typography.scss  全站文字底色調
└── main.scss             唯一的全域入口
```

**abstracts 由 `nuxt.config.ts` 的 `vite.css.preprocessorOptions.scss.additionalData` 自動注入**到每一個 `.scss`
與 `<style lang="scss">`，所以元件**不必也不應該**自己 `@use` 它，直接用 `color()`、`spacing()`、`@include respond-to()` 即可。
`vitest.config.ts` 有一份等價設定讓元件測試也能編譯，**兩邊要一起改**。

### token 是唯一的值來源

```scss
❌ color: #b91c1c;              // 字面值
❌ padding: 12px;               // 魔術數字
❌ color: var(--color-danger);  // 繞過函式，打錯字不會有人發現
✅ color: color('danger');
✅ padding: spacing('sm') spacing('md');
```

- 存取函式回傳的是 CSS custom property 參照（`var(--color-danger)`），因此**執行期仍可換主題**；
  同時在**編譯期檢查 token 是否存在**——打錯名字直接讓建置失敗，而不是安靜地產出空的 `var()`。
- 需要一個沒有的值時：**先在 `abstracts/_tokens.scss` 的 map 補一個 token**，再在元件裡用它。
  `base/_tokens.scss` 會自動展開成 CSS 變數，不必手動同步。
- 沒有 token 的一次性數值（`z-index`、`flex-basis`、動畫關鍵影格的位移）可以直接寫，但**顏色、間距、字級、圓角、陰影、斷點沒有例外**。
- 斷點一律 `@include respond-to('md')`，不自己寫 `@media (min-width: 768px)`。

### class 命名與巢狀

- class 一律 **BEM**：`block`、`block__element`、`block--modifier`，全小寫 kebab-case（stylelint 會擋）。
- block 名稱對齊元件名（`AppButton` → `.app-button`）。
- 用 SCSS 的 `&__element` / `&--modifier` 巢狀寫，但**巢狀深度不超過兩層**——再深就是該拆子元件了。
- **禁止 `!important`**（stylelint 會擋）。改不動的樣式是選擇器設計錯了，不是權重不夠。
- `:deep()` 只在不得已要覆寫第三方元件時使用，並在旁邊註解原因；不用它去伸手改自己家的子元件（改用 prop / variant）。

---

## 四、lint 把關

| 規範 | 由誰擋 |
| :--- | :--- |
| `.vue` 不得直接放 `app/components/` 底下 | ESLint `atomic-design-placement` |
| atoms 不得 import domain / application / 上層元件 | ESLint `atom-purity` |
| molecules / organisms 不得依賴更上層 | ESLint `atomic-design-composition`、`organism-composition` |
| SFC 一律 `<script setup lang="ts">` + `<style scoped lang="scss">` | ESLint `vue/block-lang`、`vue/component-api-style`、`vue/enforce-style-attribute` |
| 元件內不得出現色碼 / 具名顏色 / `rgb()` | stylelint `color-no-hex`、`color-named`、`function-disallowed-list` |
| class 一律 BEM | stylelint `selector-class-pattern` |
| 禁 `!important` | stylelint `declaration-no-important` |

指令：`bun run lint`（ESLint）、`bun run lint:style`（stylelint）、`bun run verify`（全部）。
字面值的白名單只有 `app/assets/styles/**`——**token 的定義本身就是字面值，那是它唯一該待的地方**。

---

## 五、動手前的檢查清單

新增一個元件時：

- [ ] 這個 UI 概念**已經有元件**了嗎？有 → 加 variant，不是加元件。
- [ ] 它屬於 atom / molecule / organism / template 哪一層？放進對應資料夾。
- [ ] 是 atom 嗎？那它**不能認識任何領域概念**（含 DTO）。
- [ ] 外觀是不是由使用端決定（variant / slot / class），而不是寫死？
- [ ] 有沒有把業務判斷寫進 template 的三元運算？有 → 推回 Domain Model，由 DTO 帶出來。
- [ ] style 區塊是 `scoped lang="scss"` 嗎？裡面有沒有字面值？
- [ ] 需要的顏色 / 間距有 token 嗎？沒有 → 先補進 `abstracts/_tokens.scss`。
- [ ] 有互動邏輯的元件，測試放在 `tests/components/{層級}/{元件名}.spec.ts`（見 [testing.md](testing.md)）。
