# CLAUDE.md

本檔只做一件事：**告訴你在什麼情境下該去讀 `.claude/rules/` 裡的哪一份規範。**

規則本身與產品無關；大小寫、檔名格式、lint 工具一律 follow TypeScript / Vue 自身的慣例。
產品知識（專案介紹、環境變數、API 路由、領域詞彙）請寫在本檔以外的專案文件，不要塞進這裡。

## 動工前必讀

任何時候要寫或改程式碼，先讀這兩份：

- [.claude/rules/architecture.md](.claude/rules/architecture.md) — 東西該放哪一層、哪個資料夾
- [.claude/rules/naming.md](.claude/rules/naming.md) — 東西該叫什麼名字

寫 `.vue` 元件或任何樣式之前，再加讀這一份：

- [.claude/rules/component-design.md](.claude/rules/component-design.md) — 元件怎麼切、樣式寫在哪

## 分層速記

```
.vue 元件  ───▶  Application  ───▶  Domain  ◀───  Infrastructure
(Controller)     (use cases)       (核心)         (Proxy 實作)
```

前端沒有資料庫，**沒有 Repository**；對外資料一律走 **Proxy**。

## 情境對照表

| 我正在做的事 | 去讀 |
| :--- | :--- |
| 決定一段程式碼要放哪一層 / 哪個資料夾 | [architecture.md](.claude/rules/architecture.md) |
| 新增 entity、domain model、DTO、VO | [architecture.md](.claude/rules/architecture.md)、[naming.md](.claude/rules/naming.md) |
| 想把業務邏輯寫進 `.vue` 元件 | [architecture.md](.claude/rules/architecture.md)（元件只認識 Application 與 DTO） |
| 想把業務邏輯寫進 entity | [architecture.md](.claude/rules/architecture.md)（Entity 保持乾淨，行為放 Domain Model） |
| 想在元件裡 `useFetch` / `$fetch` 打後端 | [data-access.md](.claude/rules/data-access.md)（禁止；一律推成 Proxy） |
| 要串接後端 API / 第三方服務 | [naming.md](.claude/rules/naming.md)、[data-access.md](.claude/rules/data-access.md)（一律 `Proxy`；介面用能力抽象命名，不綁供應商） |
| 後端回傳的 JSON 要轉成什麼 | [data-access.md](.claude/rules/data-access.md)（Proxy 負責正規化成 entity / VO，wire 格式不進 domain） |
| 出現 `private static` 或只被一處使用的 `private` method | [architecture.md](.claude/rules/architecture.md)（三步搬家 / inline 門檻） |
| 想在 model 上開 `static`（工廠、`fromXxx` 轉換） | [architecture.md](.claude/rules/architecture.md)（model 內一律不得有 static；轉換寫在來源的 `toXxx()`） |
| 幫 Domain Model 或 VO 命名 | [naming.md](.claude/rules/naming.md)（`Domain` / `Vo` 後綴） |
| 想為 Domain Model 定介面或做繼承 | [architecture.md](.claude/rules/architecture.md)（Domain Model 是由 entity 轉換而來的普通 class，不是介面抽象） |
| 想用 `interface` / `type` 描述一份資料 | [naming.md](.claude/rules/naming.md)（介面只抽象行為；資料一律 class） |
| Application / Service 要收一組參數 | [naming.md](.claude/rules/naming.md)（封裝成 DTO，不抽介面、不用行內物件型別） |
| 想寫 `any`、`as any`、`@ts-ignore` | [code-style.md](.claude/rules/code-style.md)（禁止） |
| 想開 `XxxHelper` / `utils.ts` 雜物模組 | [code-style.md](.claude/rules/code-style.md)（原則禁止；不得已才放 `app/utilities/`） |
| 新增一個 `.vue` 元件 / 決定它是 atom 還是 molecule | [component-design.md](.claude/rules/component-design.md)（原子化設計四層資料夾） |
| 想新增 `PrimaryButton` / `DangerButton` 之類的變體元件 | [component-design.md](.claude/rules/component-design.md)（禁止；一個 UI 概念只留一個元件，長相由使用端決定） |
| 要寫任何 CSS / 調整顏色、間距 | [component-design.md](.claude/rules/component-design.md)（一律 `<style scoped lang="scss">`，值一律用 token 函式） |
| 需要一個目前沒有的顏色 / 間距 / 字級 | [component-design.md](.claude/rules/component-design.md)（先補進 `app/assets/styles/abstracts/_tokens.scss`） |
| 幫任何類別 / 介面 / 檔案命名 | [naming.md](.claude/rules/naming.md) |
| 定義介面（interface） | [naming.md](.claude/rules/naming.md)（`I` 前綴、一介面一檔、以能力命名） |
| 處理金額 / 價格 / 停損 | [code-style.md](.claude/rules/code-style.md)（`decimal.js`，禁用 `number`） |
| 寫測試、需要 mock 東西 | [testing.md](.claude/rules/testing.md)（只測業務行為；只用 Vitest mock 介面，禁手寫 Fake） |
| 決定測試檔放哪 | [testing.md](.claude/rules/testing.md)（`tests/` 鏡射 `app/`，`{檔名}.spec.ts`） |
| 選型別、宣告變數、包錯誤、寫 Vue 元件 | [code-style.md](.claude/rules/code-style.md) |

完整索引見 [.claude/rules/README.md](.claude/rules/README.md)。

## 不可妥協的幾條

即使沒讀完全部規則，這幾條一律成立：

1. **依賴方向永遠指向 Domain**，Domain 不認識 HTTP / Vue / Nuxt / 任何 SDK。
2. **`.vue` 元件是 Controller**：只綁事件與資料，不寫業務規則，只認識 Application 與 DTO。
3. **`$fetch` / `useFetch` / `localStorage` 只准出現在 Proxy 實作檔內。**
4. **Entity 是乾淨的 Data Model**，業務行為放 Domain Model。
5. **行為住在它操作的資料旁邊**——沒有 `private static`、沒有 static helper class、沒有 `utils.ts`。
6. **model 內沒有任何 `static`**。轉換一律寫在來源身上：`a.toB()`，不是 `B.fromA(a)`。
7. **Domain Model 不是介面抽象**，是由 entity 轉換而來的普通 class；`Domain` / `Vo` 後綴一眼可辨。
8. **`interface` 只抽象行為，不抽象資料**。所有 data model 一律 `class`；Application / Service 收的參數用 DTO。
9. **介面以「能力」命名，不以「供應商」命名。**
10. **禁止 `any`、`as any`、`@ts-ignore`。**
11. **測試只驗業務行為**，mock 只用 Vitest 對介面產生，禁手寫 Fake。
12. **一個 UI 概念只有一個元件**——按鈕只有 `AppButton`，不同長相是 variant，不是新元件。
13. **樣式一律 `<style scoped lang="scss">`，值一律走 token 函式**；字面值只准出現在 `app/assets/styles/`。
