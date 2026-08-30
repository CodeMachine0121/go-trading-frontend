# go-trading-frontend

[go-stock](../go-trading-backend) 台股資訊聚合與 AI 分析 REST API 的前端介面。

## Tech Stack

| 層面 | 選型 |
| :--- | :--- |
| 框架 | **Nuxt 3**（3.21.x）+ Vue 3 |
| 語言 | **TypeScript**（`strict`） |
| 打包 | **Vite**（Nuxt 內建） |
| 單元測試 | **Vitest** + `@vue/test-utils` + `happy-dom` |
| Lint | **ESLint 10**（`@nuxt/eslint` + `typescript-eslint`，含 stylistic 排版規則） |
| 型別檢查 | `vue-tsc`（`pnpm typecheck`） |
| Git hooks | **Husky** + lint-staged |
| 套件管理 | **pnpm** |

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
├── pages/                  Controller：路由層 .vue
├── components/             Controller：畫面元件 .vue
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

## Commands

```bash
pnpm install          # 安裝依賴（會自動跑 nuxt prepare 與 husky install）
pnpm dev              # 開發 server（預設 http://localhost:3000）
pnpm build            # 產出 .output/
pnpm preview          # 預覽 production build
pnpm generate         # 靜態產出

pnpm lint             # ESLint
pnpm lint:fix         # ESLint 自動修
pnpm typecheck        # vue-tsc 型別檢查
pnpm test             # Vitest 跑一次
pnpm test:watch       # Vitest watch 模式
pnpm test:coverage    # 覆蓋率報告
pnpm verify           # lint + typecheck + test（等同 pre-push 的檢查）
```

## Git Hooks

| Hook | 動作 |
| :--- | :--- |
| `pre-commit` | 對 staged 檔案跑 `eslint --fix`，再跑全專案 `pnpm typecheck` |
| `pre-push` | `pnpm lint` + `pnpm typecheck` + `pnpm test` |

緊急情況要跳過：`git commit --no-verify`（請盡量不要）。

## 環境變數

複製 [.env.example](.env.example) 成 `.env` 後調整：

| 變數 | 預設值 | 用途 |
| :--- | :--- | :--- |
| `NUXT_PUBLIC_BACKEND_BASE_URL` | `http://localhost:8080` | 後端 go-stock REST API base URL |
