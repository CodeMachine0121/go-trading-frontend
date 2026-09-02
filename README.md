# go-trading-frontend

[go-trading](../go-trading) 交易服務後端 REST API 的前端介面。
後端提供 K 線（KCandle）的讀寫與自訂指標計算，本專案是它的操作介面——
後端每一條路由都能從畫面操作，不必再開 Postman。

## 畫面

| 路徑 | 做什麼 | 重點 |
| :--- | :--- | :--- |
| `/` | **連線狀態** | 後端是否可用；連不上時明確告知而非留白 |
| `/k-candles` | **K 線瀏覽與維護** | 指定標的與區間查詢，結果**由新到舊**列出並標示漲跌；每一列可編輯，另可新增與刪除（刪除需二次確認），任何一次成功的維護都會自動重查 |
| `/k-candles/chart` | **K 線圖表** | 同一批 K 線改用圖呈現。**拉遠拉近就是在選要看多長**，每根涵蓋多久跟著自動換（五分鐘／十五分鐘／一小時／四小時／一天，挑最細的且畫面上不超過 400 根的那一種）；快捷區間一天到一年一鍵切換，畫法可在蠟燭與曲線之間切換。取資料時兩側各多取半段，因此小幅拖動不重新取 |
| `/indicator-calculations` | **指標計算** | **只寫算式內容**——套件宣告、匯入與 `Calculate` 進入點由畫面依「指標值種類」備妥並唯讀顯示在上下方；內容區有語法著色、自動縮排與常用片段。指標值種類四選一（一個數字／一串數字／一個是非／一串是非），結果依種類呈現：一串逐個列出、是非顯示「是」／「否」；附一鍵帶入該種類的範例內容 |

四種狀態（載入中／查無資料／被拒絕／連不上）與四類失敗（欄位填錯、請求的問題、
後端出錯、連不上）在每個畫面上的呈現方式一致，使用者一眼知道下一步該做什麼。

**交易標的一律從清單裡挑，不手打**：三個要讀行情的畫面（K 線瀏覽、K 線圖表、指標計算）
共用同一個 `SymbolField`，選項來自後端 `GET /trading-symbols`——那是它**已登錄的**標的
（後端 `make migrate` 時登錄的 BTCUSDT、ETHUSDT）加上**實際有 K 線的**，
所以後端剛建好資料庫、一根 K 線都還沒抓的時候，選單就已經有東西可挑。
清單是空的或取不到時，欄位會說明原因並保留目前那一檔，不會變成一個空白的選單。
**新增／修改 K 線的表單維持手打**：那正是新的交易標的誕生的地方。

### 介面走暗色

這是開發者自己在用的操作台，因此**只走暗色一種主題**。配色以編輯器的 One Dark 為錨——
程式碼區塊用的就是它的底色，其餘介面沿著同一條表面色階（頁面底 → 面板 → 程式碼）往上鋪，
層次靠「越上層越亮」表達而不是靠陰影。所有顏色一律是 `app/assets/styles/abstracts/_tokens.scss`
裡的 token，元件內不得出現任何色碼（stylelint 會擋）。

### 算式編輯區

指標計算的算式區是一整塊「看起來就是一份 Go 檔案」的區塊：

- **唯讀外框與可編輯內容是同一個原子的兩種樣子**（`AppCodeEditor` 的 `readonly`），
  因此共用同一套語法著色、同一條行號欄與同一組字體行高。
- **行號連著整份檔案數下去**：外框從第一行開始，內容接在後面，收尾的括號在最後——
  後端說「第 12 行出錯」時，畫面上就是那一行。
- **內容整段縮排一層**，因為它住在進入點裡面。
- 區塊留著一份夠大的高度，多出來的空白落在檔尾（不是塞進可編輯的那一段，
  否則收尾括號會被推離程式碼），**點那片空白就接著最後一行繼續打字**。

## 開發流程（SDD）

每個功能切片都走 **clarify → prd → architecture → implement (code-first) → contract**，
文件放在 `.sdd/{日期}-{切片名}/`：

| 切片 | 文件 |
| :--- | :--- |
| K 線瀏覽 | [`.sdd/2026-08-30-k-candle-browsing/`](.sdd/2026-08-30-k-candle-browsing/) |
| K 線維護 | [`.sdd/2026-08-30-k-candle-management/`](.sdd/2026-08-30-k-candle-management/) |
| 指標計算 | [`.sdd/2026-08-30-indicator-calculation/`](.sdd/2026-08-30-indicator-calculation/) |
| 只寫算式的內容 | [`.sdd/2026-09-02-strategy-script-authoring/`](.sdd/2026-09-02-strategy-script-authoring/) |
| K 線圖表 | [`.sdd/2026-09-02-k-candle-chart-view/`](.sdd/2026-09-02-k-candle-chart-view/) |
| 交易標的選單 | [`.sdd/2026-09-02-trading-symbol-picker/`](.sdd/2026-09-02-trading-symbol-picker/) |

共用的詞彙與專案前提在 [`.sdd/UL-MAP.md`](.sdd/UL-MAP.md) 與 [`.sdd/PROJECT.md`](.sdd/PROJECT.md)。
每個切片的 `CONTRACT.md` 是驗收情境與程式碼的符合性稽核矩陣——它記錄的是
「測試有沒有斷言規格要求的結果」與「程式碼有沒有真的產出那個結果」，兩者都成立才算數。

## Tech Stack

| 層面 | 選型 |
| :--- | :--- |
| 框架 | **Nuxt 3**（3.21.x）+ Vue 3 |
| 語言 | **TypeScript**（`strict`） |
| 數值處理 | **decimal.js**（金額 / 價格 / 停損，禁用 `number`） |
| 樣式 | **SCSS**（`sass-embedded`）＋ CSS custom property token，中央控管於 `app/assets/styles/` |
| 元件設計 | **Atomic Design**（atoms / molecules / organisms / templates） |
| 程式碼編輯 | **CodeMirror 6**（`@codemirror/lang-go` 語法／縮排／片段、`@codemirror/theme-one-dark` 配色），掛載後才動態載入，不擋首屏 |
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

`k-candle` 切片是這條呼叫鏈的完整範例，可照著它長新功能：
`KCandleProxy` → `KCandleService` → `KCandleApplication` → `KCandleSearchPanel` → `pages/k-candles/index.vue`。

K 線圖表走同一條鏈，但中間多一個判斷點：`KCandleChartViewportDomain` 收下
「正在看哪一段 + 手上有什麼」，一口氣算出每根該多粗、要不要重新取、要取哪一段。
**不必重新取時 `KCandleChartApplication.loadKCandleChart` 回 `null`**——
這是圖表不會自己轉個不停的原因：餵完資料之後圖會再說一次「正在看的區間變了」，
若那時又回傳一批資料，畫面就會重畫、圖又再說一次，永遠停不下來。

**頁面只做接線**：從組裝根取得 Application 往下傳，互動狀態一律住在 organism。
這讓每條驗收情境都能用元件測試涵蓋，不必啟動 Nuxt runtime
（`@nuxt/test-utils` 的 runtime 在本專案的版本組合下無法初始化）。

**業務規則住在 domain**：查詢條件、K 線寫入、指標請求都是「建構即驗證」的 domain model——
不合法的東西在系統裡根本不存在，proxy 拿到的必定送得出去。
錯誤帶著欄位名，畫面因此不必比對訊息內容來決定訊息標在哪一欄。

**算式的文字只有一個產生地**：外框、四種指標值種類的範例內容、以及「內容如何組成一整段算式」
全部住在 `IndicatorScriptDomain`。後端哪天改了進入點的形式，要改的就只有那一個檔案，
也不可能有第二個地方組出不一樣的外框。

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

### Dev server 有兩個「別讓它自己發現」的設定

`nuxt.config.ts` 裡有兩處設定看起來可以刪，其實是在補 dev server 的兩個啟動時序缺口。
兩者都只在**冷啟動**（剛 clone、`bun install` 之後、或 `nuxt build` 清掉 `.nuxt` 之後的
第一次 `bun run dev`）才現形，所以很容易被誤判成偶發雜訊而刪掉。

#### `$development.experimental.appManifest: false`

只在 dev 關掉 Nuxt 的 app manifest。開著的話 `#app-manifest` 這個 alias 會指向
`.nuxt/manifest/meta/{buildId}.json`，而那個檔案要等 nitro 建完才寫出來；dev 冷啟動時 Vite
會先 pre-transform nuxt 的 manifest composable，比 nitro 快一步就會噴：

```
ERROR  Pre-transform error: Failed to resolve import "#app-manifest" ... Does the file exist?
```

這是啟動時序的 race（`nuxt build` 清掉 `.nuxt` 之後的第一次 `bun run dev` 最容易踩到），
畫面其實還是正常的，但每次冷啟動都刷一排紅字。關掉之後 alias 改指向 node_modules 裡恆存在的
空模組，錯誤就結構上不會發生。

**這個 race 只發生在 dev，所以用 Nuxt 的 `$development` 圈住，不要寫成全域的
`experimental.appManifest: false`。** manifest 在正式環境是有用的，全域關掉等於為了一個
dev-only 的錯誤去降級 production：

| 全域關掉會少了什麼 | 影響 |
| :--- | :--- |
| `check-outdated-build.client` 這個 plugin 不再註冊 | 不會再定期輪詢 `builds/latest.json`，所以「部署了新版本，開著的頁籤自動重載」偵測不到 |
| 靜態產出的 `_payload.json` 不會再被載入 | `bun run generate` 之後，client 端換頁改成重新取資料，而不是讀預渲染好的 payload |

第二點是實測的：同一份 `bun run generate` 產出，manifest 開著時換頁會抓
`/k-candles/_payload.json` 並預抓另一頁的，全域關掉則一個都不抓。圈成 `$development` 之後
`build` 與 `generate` 都維持開啟，上面兩件事都不受影響——實測換頁照樣抓 payload。

#### `vite.optimizeDeps.include` 點名 CodeMirror

`AppCodeEditor` 掛載後才動態 `import()` 那七個 `@codemirror/*`（編輯器碰得到 `document`，
伺服器端沒有），所以 Vite 從進入點靜態掃不到它們。少了這份名單，dev 冷啟動後第一次打開
「指標計算」才會臨時發現這些套件、當場重新優化依賴，正在飛的那批 import 就拿到：

```
504 (Outdated Optimize Dep) .../deps/@codemirror_theme-one-dark.js
TypeError: Failed to fetch dynamically imported module
```

三個編輯器的 `onMounted` 會一起炸掉，畫面只剩三個空容器，**得手動重新載入才會好**。
在這裡先報名，dev server 啟動時就一次預打包完，那個缺口就不存在了。

> 兩件事的共通點：**新增任何「只在 `onMounted` 裡動態 import」的第三方套件時，記得同時加進
> 這份 `optimizeDeps.include`**，否則同一個 504 會在那個新頁面重演。

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
| `NUXT_PUBLIC_BACKEND_BASE_URL` | `http://localhost:8080` | 後端 go-trading REST API base URL |

### 跨來源（CORS）

前端與後端是兩個 origin（開發時 `http://localhost:3000` 對 `http://localhost:8080`），
所以每一次呼叫都要後端點頭瀏覽器才讀得到回應。後端 go-trading 只對它的
`CORS_ALLOWED_ORIGINS`（預設 `http://localhost:3000`）名單內的來源回授權標頭。

因此這兩個值是一組的，要改就一起改：

| 這裡改了 | 後端要跟著改 |
| :--- | :--- |
| `nuxt.config.ts` 的 `devServer.port` | `CORS_ALLOWED_ORIGINS` |
| 部署到某個網域 | `CORS_ALLOWED_ORIGINS` 加上該網域 |

> 被 CORS 擋掉時，瀏覽器不會把後端的回應交給我們——`fetch` 拿到的東西跟「後端根本沒啟動」
> 一模一樣。因此畫面上的「連不上後端」同時涵蓋這兩種情況，錯誤文案兩個都提。
> 真正的原因看瀏覽器 console，那裡才會明說是 CORS。
