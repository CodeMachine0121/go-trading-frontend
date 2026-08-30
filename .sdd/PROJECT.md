# Project Overview

**Project:** go-trading-frontend
**Bounded Context:** K 線行情操作介面（K-Line Market Data Console）
**Last Updated:** 2026-08-30
**Status:** Active

---

## 1. Vision & Mission

- **Problem Statement:** 後端 `go-trading` 已經把 K 線與自訂指標計算做成 REST API，但目前只能透過
  Postman 或 curl 操作——看一段時間的行情要自己拼 query string，修一根 K 線要手打整包 JSON，
  試一條指標算式要把 Go 程式碼壓成一行帶跳脫字元的字串。本專案提供一個能直接操作這些能力的介面：
  查行情、維護資料、試算指標，都在畫面上完成。
- **Target Users:** 專案作者本人（James Hsueh）——同時是後端開發者與策略研究者。單人使用、
  本機或內網執行，**無登入機制、無多人協作需求**。
- **Success Metrics:**
  1. 後端每一條既有路由都能從畫面操作，不必再開 Postman。
  2. 使用者能在畫面上直接看出一次操作被拒絕的**原因**（哪一條業務規則沒過），而不是只看到一串錯誤字串。
  3. 送得出去的請求都是合法的：畫面在送出前先擋掉違反 K 線規則的輸入。
- **Out of Scope:** 下單與交易執行、即時推播（無 SSE／WebSocket）、多使用者與權限、
  行動裝置專屬版面、K 線圖表繪製（第一階段以數字表格為準）、任何前端自有的資料庫或持久化。

---

## 2. Core Tech Stack

| Layer | Technology | Version / Notes |
| :--- | :--- | :--- |
| Frontend | Nuxt 3 + Vue 3 | 3.21.x；`srcDir: app/`；SSR 預設開啟 |
| Backend | go-trading（Go + Gin） | 本專案唯一的資料來源，見 `../go-trading` |
| Database | 無 | **前端沒有資料庫**；資料真相永遠在後端 |
| Infrastructure | 本機執行 | 無 Docker、無 CI／CD、無部署目標 |
| Key Libraries | TypeScript（strict）、decimal.js、SCSS（sass-embedded）、Vitest、`@vue/test-utils` | 金額一律 `decimal.js`，禁用 `number` |
| External Services | 無 | 後端自己去打 Binance；前端只認識 go-trading |

---

## 3. Architecture Principles

- **Style:** Clean / Onion Architecture 的前端版——**依賴方向一律指向 Domain**。
- **Key Patterns:** Proxy（唯一對外資料入口，取代後端的 Repository）、Domain Model（充血、行為所在地）、
  DTO（domain 與畫面之間唯一的形狀）、手動 DI（組裝根 `app/plugins/dependencies.ts`）、
  原子化設計（Atomic Design）分層元件。
- **Folder / Layer Structure:** `app/pages` + `app/components`（Controller）→ `app/application`（use cases）
  → `app/domain`（entity / domain model / dto / vo / service / interface / errors）
  ← `app/infrastructure/proxy`（實作）。詳見 `.claude/rules/architecture.md`。
- **Data Flow:** `.vue` 元件 → Application → Domain Service → `I{能力}Proxy`（實作打後端 REST）
  → 回傳 wire 資料 → Proxy 正規化成 entity → 包成 Domain Model 執行行為 → 轉 DTO → 綁回畫面。
  **元件永遠只看得到 DTO。**

---

## 4. Development Conventions

- **Naming:** 見 `.claude/rules/naming.md`。角色後綴固定（`Application` / `Service` / `Proxy`），
  四種 model 後綴一眼可辨（entity 無後綴、`Domain`、`Dto`、`Vo`），介面 `I` 前綴且以**能力**命名。
  領域詞彙一律沿用 `.sdd/UL-MAP.md`，不自創同義詞。
- **Branching Strategy:** feature branch → PR → merge 回 `main`。一個功能切片一條 branch、一個 PR；
  branch 名 `feat/{slug}`、`docs/{slug}`、`chore/{slug}`。
- **Testing Requirements:** Vitest。Domain Model 測試密度最高；Application 測試注入**真實的**
  domain service 與 domain model，**只 mock proxy 介面**（測試力度放大）；元件測試只寫有互動邏輯的。
  測試放 `tests/`，鏡射 `app/`。禁手寫 Fake，替身一律 `vi.fn()`。
- **Code Review Rules:** 每個 PR 都必須 `bun run verify`（ESLint + stylelint + typecheck + Vitest）全綠；
  PR 描述說明「做了什麼、為什麼這樣切」。commit 走 Conventional Commits，一個 commit 一個完成的單位。

---

## 5. Non-Negotiables & Constraints

- **Performance SLAs:** 無正式 SLA。唯一硬限制來自後端：**單次查詢／計算根數上限 1000**，
  超過由後端拒絕，畫面需如實轉達並引導縮小區間。
- **Security Requirements:** 無鑑權機制（後端本身也沒有），僅供本機／內網使用。
  指標算式在**後端**沙箱執行（白名單只有四則運算、`math`、`sort`），前端不執行任何使用者提供的程式碼。
- **Operational Constraints:** 後端未啟動時整個介面無資料可用——每個畫面都必須有明確的
  「連不上後端」狀態，不得留白。所有時間一律以 **UTC** 呈現與送出，不做在地時區轉換。
- **Known Technical Debt:** 尚無 E2E 測試；尚無 K 線圖表（僅表格）；尚無 CI（驗證靠本機 husky hook）。

---

## 6. Glossary Reference

> Domain terms are maintained in `.sdd/UL-MAP.md`. This section links key terms
> relevant to project-level decisions.

| Term | Short Definition |
| :--- | :--- |
| K 線 | 市場在固定五分鐘內的價量摘要，以「交易標的 + 起始時間」唯一辨識 |
| 交易標的 | K 線所描述的市場，例如 BTCUSDT；查詢與計算都必須指定 |
| 起始時間 | K 線涵蓋的五分鐘從何時開始；必須落在五分鐘刻度上、不得指向未來、一律 UTC |
| 查詢區間 | 一次查詢的起訖時間；可精確到分鐘、不必對齊刻度；結束不得早於開始 |
| 指標算式 | 使用者自行提供、由後端沙箱執行的一段計算式 |
| 計算根數 | 一次計算餵給算式的 K 線根數；大於零且不超過單次查詢上限 |
| 指標結果 | 一次計算的產出（指標名稱 → 數值），不留存 |
| 後端連線狀態 | 後端服務目前是否可用；介面所有功能的前提 |
