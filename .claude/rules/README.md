# Rules

**前端（Nuxt 3 + TypeScript）的實作規範**（架構、命名、風格、資料存取、測試），不含任何產品／業務知識。

這份規則由後端版（Go / Clean Architecture）改寫而來，核心分層與依賴方向完全一致，只換掉最外兩層的載體：

| 後端 | 前端 |
| :--- | :--- |
| Gin handler = Controller | **`.vue` 元件 = Controller** |
| Application（Go） | Application（TypeScript class） |
| Domain Service（Go） | Domain Service（TypeScript class） |
| Repository（GORM / DB） | **Proxy（打後端 REST API）——前端沒有資料庫** |

產品知識（專案介紹、環境變數、API 路由、領域詞彙）請寫在專案自己的文件，不要放進本目錄，也不要放進 `CLAUDE.md`——`CLAUDE.md` 只負責指路：什麼情境該讀哪一份規則。

| 檔案 | 內容 |
| :--- | :--- |
| [architecture.md](architecture.md) | Clean / Onion 分層、依賴方向、呼叫鏈、`app/` 目錄結構、**`.vue` 元件即 Controller**、**Entity 乾淨 + 行為放 Domain Model**、**Domain Model 不是介面抽象**、**model 內禁 static（含 `fromXxx` 轉換）**、禁 private static |
| [naming.md](naming.md) | 命名規範：角色後綴、entity / `Domain` / `Dto` / `Vo` / `Request` 四種 model 後綴、**介面只抽象行為不抽象資料（TS 特別容易破功）**、介面以**能力抽象**命名（`I` 前綴）、外部資源一律 `Proxy` 結尾、檔名對齊主型別、禁 barrel `index.ts` |
| [code-style.md](code-style.md) | **禁 `any` / `as any` / `@ts-ignore`**、資料用 `class` 不用 `interface`、`const` 宣告即賦值、行為掛物件、**禁 helper class 與 `utils.ts` 雜物模組**、金額用 `decimal.js`、`<script setup lang="ts">` |
| [data-access.md](data-access.md) | **前端沒有資料庫**：`$fetch` / `useFetch` / `localStorage` 只准出現在 Proxy 內、一資源一 Proxy、wire 格式在 Proxy 收乾淨、前端狀態不是持久化 |
| [testing.md](testing.md) | **只測業務行為**、**只用 Vitest mock 介面（禁手寫 Fake）**、測試力度放大、`tests/` 鏡射 `app/` |

> 後端版另有 `persistence.md`（ORM / Code First）與 `background-jobs.md`（排程 job），**前端不適用，已移除**。前端的資料存取規範改看 [data-access.md](data-access.md)。
