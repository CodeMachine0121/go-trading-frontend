# 合約機器人自動下單（網頁）— Architecture Design

**Status:** Confirmed（autonomous run — decisions recorded below）
**Source PRD:** `.sdd/2026-10-04-contract-auto-order-execution/PRD.md`
**Tech context:** Nuxt · Vue · TypeScript · Clean/Onion（`app/{application,domain,infrastructure,components}`）· Vitest

---

## 1. Design Goal & Guiding Principle

- **In one sentence:** 把交易服務新給的兩格（機器人的 `autoOrderPosition`、每一輪的 `autoOrder`）正規化進 domain，
  由 Domain Model 寫成畫面直接畫得出的句子與語氣；開關旁的說明改由「機器人種類」決定。
- **Guiding principle — 措辭是規則，住在 domain：** 元件只拿 DTO 裡已經組好的 `LocalizedTextVo` 與語氣，
  不拼字、不判斷狀態。與既有 `StrategyBotRunSuggestionDomain`（建議部位一句話）同一個做法。

---

## 2. Change Scope

| Area | Action | What / Why |
| :--- | :--- | :--- |
| `vo/auto-order-position-vo.ts` | **Add** | 機器人持倉的原樣：方向（`long`／`short`／空）、數量（`Decimal`） |
| `domains/auto-order-position-domain.ts` | **Add** | 「多 0.002」／「空 0.002」／「空手」 |
| `entities/contract-auto-order-result.ts` | **Add** | 一輪下單結果的原樣（狀態、動作、平倉／開倉數量與均價、止損止盈、沒掛上、原因）；`toDomain()` |
| `domains/contract-auto-order-result-domain.ts` | **Add** | 狀態詞、一句話、語氣、沒掛上的提醒 |
| `dto/contract-auto-order-result-dto.ts` | **Add** | `text`、`tone`、`protectionWarning` |
| `entities/strategy-bot.ts` | **Modify** | 多 `autoOrderPosition: AutoOrderPositionVo \| null` |
| `domains/strategy-bot-domain.ts`、`dto/strategy-bot-dto.ts` | **Modify** | DTO 多 `autoOrderPositionLabel: LocalizedTextVo \| null`（現貨與舊版後端為 `null`） |
| `entities/strategy-bot-run-record.ts` | **Modify** | 多 `autoOrder: ContractAutoOrderResult \| null` |
| `domains/strategy-bot-run-record-domain.ts`、`dto/strategy-bot-run-record-dto.ts` | **Modify** | DTO 多 `autoOrder: ContractAutoOrderResultDto \| null` |
| `domains/market-data-kind-domain.ts`、`dto/strategy-bot-page-dto.ts` | **Modify** | 頁面 DTO 多 `autoOrderNotice`：合約／現貨各一句 |
| `infrastructure/proxy/strategy-bot-proxy.ts` | **Modify** | wire 多兩格，解析成 VO／entity（數字用 `Decimal`） |
| `molecules/StrategyBotAutoOrderSwitch.vue` | **Modify** | 收 `notice` 與 `positionLabel`；拿掉寫死的「尚未生效」 |
| `templates/StrategyBotWorkbenchPage.vue` | **Modify** | 傳 `page.autoOrderNotice` 與 `editing.autoOrderPositionLabel` |
| `molecules/StrategyBotRunHistory.vue` | **Modify** | 那一輪有 `autoOrder` 時畫一行，沒掛上時另畫警示 |
| `locales/*/strategy-bot.ts` | **Modify** | 「機器人持倉」標籤；刪掉 `notInEffect` |
| Application／Service／Proxy 介面 | **Not touched** | 讀取路徑不變，只是 DTO 多了欄位 |

---

## 3. New Classes / Modules

| Name | Kind | Responsibility | Satisfies |
| :--- | :--- | :--- | :--- |
| `AutoOrderPositionVo` | VO | 持倉原樣 | 例 3–5 |
| `AutoOrderPositionDomain` | Domain Model | 持倉寫成一個詞組 | 例 3–4 |
| `ContractAutoOrderResult` | Entity | 一輪下單結果原樣 | 例 6–13 |
| `ContractAutoOrderResultDomain` | Domain Model | 狀態詞、一句話、語氣、提醒 | 例 6–13 |
| `ContractAutoOrderResultDto` | DTO | 畫面直接畫 | 例 6–13 |

---

## 4. Extensibility & Handoff Notes

- **Most likely next requirement:** 現貨自動下單上線；清單頁也顯示機器人持倉。
- **Where it lands:** 現貨上線時只改 `MarketDataKindDomain` 給現貨的那一句，與 `ContractAutoOrderResultDomain` 的動作詞（現貨是買入／賣出）；清單頁直接用 `StrategyBotDto.autoOrderPositionLabel`。

---

## 5. Traceability

| PRD Scenario | Fulfilled by |
| :--- | :--- |
| 例 1–2 | `MarketDataKindDomain.toStrategyBotPageDto().autoOrderNotice` → `StrategyBotAutoOrderSwitch` |
| 例 3–5 | `AutoOrderPositionDomain` → `StrategyBotDto.autoOrderPositionLabel` → `StrategyBotAutoOrderSwitch` |
| 例 6–13 | `ContractAutoOrderResultDomain` → `StrategyBotRunRecordDto.autoOrder` → `StrategyBotRunHistory` |

---

## 6. Risks & Open Decisions

- 英文措辭：`Auto-order` 的狀態詞用 Pending／Filled／Closed, new side not opened／Not placed／Given up。
