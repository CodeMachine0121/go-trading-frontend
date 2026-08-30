# go-trading-frontend

[go-stock](../go-trading-backend) 台股資訊聚合與 AI 分析 REST API 的前端介面。

## Tech Stack

| 層面 | 選型 |
| :--- | :--- |
| 框架 | **Nuxt 3**（3.21.x）+ Vue 3 |
| 語言 | **TypeScript**（`strict`） |
| 數值處理 | **decimal.js**（金額 / 價格 / 停損，禁用 `number`） |
| 樣式 | **SCSS**（`sass-embedded`）＋ CSS custom property token，中央控管於 `app/assets/styles/` |
| 元件設計 | **Atomic Design**（atoms / molecules / organisms / templates） |
| 打包 | **Vite**（Nuxt 內建） |
| 單元測試 | **Vitest** + `@vue/test-utils` + `happy-dom` |
| Lint | **ESLint 10**（`@nuxt/eslint` + `typescript-eslint`，含 stylistic 排版規則） |
| 樣式 Lint | **Stylelint 17**（`stylelint-config-standard-scss` + `stylelint-config-recommended-vue`） |
| 型別檢查 | `vue-tsc`（`bun run typecheck`） |
| Git hooks | **Husky** + lint-staged |
| 套件管理 / script runner | **Bun**（1.3.x） |

> TSLint 已於 2019 年停止維護並併入 typescript-eslint，因此 TypeScript 的 lint 由 ESLint 的
> `typescript-eslint` 規則集負責（已隨 `@nuxt/eslint` 啟用），不另外安裝 TSLint。

## 架構

分層與命名規範是本專案的硬性要求，動工前先讀 [CLAUDE.md](CLAUDE.md) 與 [.claude/rules/](.claude/rules/)。

```
.vue 元件  ───▶  Application  ───▶  Domain  ◀───  Infrastructure
(Controller)     (use cases)       (核心)         (Proxy 實作)
```

依賴方向一律指向 Domain。前端沒有資料庫，**沒有 Repository**；對外資料一律走 **Proxy**。

```
app/
├── assets/styles/          SCSS 中央層：token / mixin / 全域入口
├── pages/                  Controller：路由層 .vue
├── components/             Controller：畫面元件 .vue（原子化設計四層）
│   ├── atoms/              不可再拆的通用 UI（AppButton…），不認識領域概念
│   ├── molecules/          原子組成的功能單位（BackendHealthCard…）
│   ├── organisms/          畫面上可獨立存在的整塊區域
│   └── templates/          只有版面骨架與插槽
├── application/            XxxApplication（純 TS，不認識 Vue）
├── domain/
│   ├── models/
│   │   ├── entities/       乾淨 Data Model（只有欄位）
│   │   ├── domains/        Domain Model（業務行為所在地）
│   │   ├── dto/            domain 對外的唯一形狀
│   │   └── vo/             value object
│   ├── service/            Domain Service
│   ├── errors/             哨兵錯誤
│   └── interface/          I{能力}Proxy 介面，一介面一檔
├── infrastructure/proxy/   Proxy 實作（唯一能用 $fetch 的地方）
├── plugins/dependencies.ts 組裝根：手動 DI
└── utilities/              不得已的純技術性工具（預設應為空）

tests/                      鏡射 app/ 的目錄結構，檔名 {受測檔名}.spec.ts
```

現有的 `backend-health` 切片是這條呼叫鏈的完整範例，可照著它長新功能：
`BackendHealthProxy` → `BackendHealthService` → `BackendHealthApplication` → `pages/index.vue`。

### 分層由 ESLint 把關

[eslint.config.mjs](eslint.config.mjs) 把架構規範轉成 lint 規則，違規會直接紅：

- Domain 層 import 外層或 Vue / Nuxt → 擋
- Application 層 import infrastructure 或 Vue → 擋
- `.vue` 元件 import entity / domain model / service / proxy → 擋
- `$fetch` / `useFetch` / `localStorage` 出現在 Proxy 以外的地方 → 擋
- `any` / `@ts-ignore` → 擋
- `.vue` 直接放在 `app/components/` 底下（沒進 atoms/molecules/…）→ 擋
- atom import domain / application、下層元件 import 上層元件 → 擋
- `<style>` 沒有 `lang="scss"` / 沒有 `scoped` → 擋

Stylelint（[stylelint.config.mjs](stylelint.config.mjs)）則把樣式的中央控管轉成規則：

- 元件內寫色碼、具名顏色、`rgb()` → 擋（一律用 `color('token')`）
- class 不是 BEM → 擋
- `!important` → 擋
- 白名單只有 `app/assets/styles/**`——字面值只該住在 token 定義裡

## 樣式

樣式規範見 [.claude/rules/component-design.md](.claude/rules/component-design.md)。重點：

```
app/assets/styles/
├── abstracts/            只有變數 / 函式 / mixin，不產生任何 CSS（由 Vite 自動注入每個 SCSS 檔）
│   ├── _tokens.scss      ★ 全站唯一寫字面值的地方
│   ├── _functions.scss   color() / spacing() / font-size() / radius() / shadow() …
│   ├── _breakpoints.scss respond-to() mixin
│   └── _mixins.scss      focus-ring / surface 等共用片段
├── base/                 :root 的 CSS custom property、reset、排版底色調
└── main.scss             唯一的全域入口（nuxt.config.ts 的 `css`）
```

- 元件一律 `<style scoped lang="scss">`，且**不必自己 `@use` abstracts**——已由
  `nuxt.config.ts` 的 `vite.css.preprocessorOptions.scss.additionalData` 注入
  （`vitest.config.ts` 有等價設定，兩邊要一起改）。
- 值一律走 token 函式：`color('danger')`、`spacing('md')`；打錯 token 名字會讓建置直接失敗。
- 需要新的顏色 / 間距，先加進 `abstracts/_tokens.scss` 的 map，`base/_tokens.scss` 會自動展開成 CSS 變數。

## Commands

```bash
bun install           # 安裝依賴（會自動跑 nuxt prepare 與 husky install）
bun run dev           # 開發 server（預設 http://localhost:3000）
bun run build         # 產出 .output/
bun run preview       # 預覽 production build
bun run generate      # 靜態產出

bun run lint          # ESLint
bun run lint:fix      # ESLint 自動修
bun run lint:style    # Stylelint（.scss 與 .vue 的 <style>）
bun run lint:style:fix # Stylelint 自動修
bun run typecheck     # vue-tsc 型別檢查
bun run test          # Vitest 跑一次
bun run test:watch    # Vitest watch 模式
bun run test:coverage # 覆蓋率報告
bun run verify        # lint + lint:style + typecheck + test（等同 pre-push 的檢查）
```

> ⚠️ **一定要 `bun run test`，不要 `bun test`。** `bun test` 會跑 bun 內建的測試 runner
> 而不是 package.json 裡的 `test` script，我們的 Vitest 測試會整批被略過而看起來「沒事」。
> 其他 script 名稱沒有這個衝突，但統一都加 `run` 最安全。

Bun 只取代 pnpm 那一層（套件管理與 script runner）；**打包仍然是 Nuxt 內建的 Vite**，
測試仍然是 Vitest。依賴的 postinstall script 由 package.json 的 `trustedDependencies`
明確授權（`esbuild`、`unrs-resolver`），這是 bun 的安全預設。

## Git Hooks

| Hook | 動作 |
| :--- | :--- |
| `pre-commit` | 對 staged 檔案跑 `eslint --fix` 與 `stylelint --fix`，再跑全專案 `bun run typecheck` |
| `pre-push` | `bun run lint` + `bun run lint:style` + `bun run typecheck` + `bun run test` |

緊急情況要跳過：`git commit --no-verify`（請盡量不要）。

## 環境變數

複製 [.env.example](.env.example) 成 `.env` 後調整：

| 變數 | 預設值 | 用途 |
| :--- | :--- | :--- |
| `NUXT_PUBLIC_BACKEND_BASE_URL` | `http://localhost:8080` | 後端 go-stock REST API base URL |
