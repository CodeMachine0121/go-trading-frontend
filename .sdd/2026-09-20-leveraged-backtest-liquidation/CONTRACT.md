# 回測表單的槓桿與成績單的強平 — Contract Conformance Matrix

**Oracle:** `PRD.md` §3 Acceptance Criteria（19 個情境）、§4 Core Business Rules（7 條）、§6 Non-Functional Requirements（4 條）
**Audited:** 2026-09-20
**Ceiling:** 這是一次**靜態一致性稽核**。每一條都先只從規格推出預期結果，再**各自獨立**判斷
「測試有沒有斷言這個結果」與「程式有沒有產出這個結果」。它不撰寫新探針、不執行自己發明的情境；
判決來自與 oracle 的比對，不是來自整套測試綠不綠。

---

## Clauses

### US-01 — 表單問得出槓桿

| ID | 情境 | Oracle | 實作 | 測試 | T | C | 狀態 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AC-01 | 填了槓桿就送得出去 | 請求帶著槓桿倍數 5 | `backtest-request-domain.ts`、`backtest-proxy.ts` `leverageBody` | `StrategyScriptBacktestPane.spec` 「兩格填了就送出去」＋ `backtest-proxy.spec` 「填了的槓桿以字串送出去」 | asserts-oracle | produces-oracle | ✅ |
| AC-02 | 整組留白時那兩格不出現在請求裡 | 請求裡沒有槓桿倍數、沒有維持保證金率 | `backtest-proxy.ts` `leverageBody`（`isSet` 為否即回空） | `backtest-proxy.spec` 「整組留白 … 根本不上線」 | asserts-oracle | produces-oracle | ✅ |
| AC-03 | 填一倍也當作不借錢 | 同上 | `leverage-multiplier-domain.ts` `isSet`（門檻是一） | 同上（第二個案例） | asserts-oracle | produces-oracle | ✅ |
| AC-04 | 只填維持保證金率也照樣送得出去 | 送得出去，且請求裡沒有槓桿倍數 | `backtest-leverage-domain.ts`（零即早退）＋ `leverageBody` | `backtest-leverage-domain.spec`「留白的倍數配一個填了的維持保證金率」＋ 上一列的 proxy 測試 | asserts-oracle | produces-oracle | ✅ |
| AC-05 | 重演一份交易策略也問得到槓桿 | 請求帶著槓桿倍數 5 | `trading-strategy-backtest-request-domain.ts`、共用分子元件 | `TradingStrategyBacktestPane.spec`「槓桿在這一邊也是填得動的輸入框」＋ `backtest-proxy.spec`「重演一份交易策略時槓桿照樣送得出去」 | asserts-oracle | produces-oracle | ✅ |
| AC-06 | 那一組旁邊說得出留白是什麼意思 | 旁邊寫著留白就不借錢，以及維持保證金率留白時用 0.5% | `BacktestConditionFields.vue` 的 `hint` | `StrategyScriptBacktestPane.spec`「那一組旁邊說得出這兩格的留白各是什麼意思」 | asserts-oracle | produces-oracle | ✅ |

### US-02 — 講不通的值當場擋下來

| ID | 情境 | Oracle | 實作 | 測試 | T | C | 狀態 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AC-07 | 槓桿倍數小於一 | 沒送出；那一組旁邊出現「槓桿倍數不得小於 1 倍」 | `leverage-multiplier-domain.ts` | `StrategyScriptBacktestPane.spec`「小於一倍就不送出」（逐字）＋ `TradingStrategyBacktestPane.spec` 同一句 | asserts-oracle | produces-oracle | ✅ |
| AC-08 | 不是一個數字的倍數說得出來 | 說出「槓桿倍數請填一個數字」 | `leverage-multiplier-domain.ts`（`isNaN`） | `leverage-multiplier-domain.spec`「根本不是一個數字時說得出來」 | asserts-oracle | produces-oracle | ✅ ¹ |
| AC-09 | 維持保證金率為負 | 沒送出；那一組旁邊說不得為負 | `maintenance-margin-rate-domain.ts` | `maintenance-margin-rate-domain.spec` ＋ `backtest-leverage-domain.spec`（含 `field: 'leverage'`） | asserts-oracle | produces-oracle | ✅ |
| AC-10 | 維持保證金率大到開倉當下就撐不住 | 沒送出；說出 5 倍下最多能填到多少 | `backtest-leverage-domain.ts`（上限＝100÷倍數） | `StrategyScriptBacktestPane.spec`「說出最多能填多少」（含「必須小於 20%」） | asserts-oracle | produces-oracle | ✅ |
| AC-11 | 剛好還開得成 | 送得出去 | 同上 | `backtest-leverage-domain.spec`「很緊但開得成」 | asserts-oracle | produces-oracle | ✅ |
| AC-12 | 沒有借錢時維持保證金率怎麼填都不擋 | 送得出去 | `backtest-leverage-domain.ts`（零即早退） | `backtest-leverage-domain.spec`「沒有借錢的那一次…怎麼填都不擋」 | asserts-oracle | produces-oracle | ✅ |

¹ 這一條在畫面上到不了（數字輸入框 ＋ 精確小數解析會先拋），所以它是一條關於**那個判斷**的情境，
而不是關於表單的。PRD 已於本次稽核改寫成這個形狀並寫明理由——與兩個成本率那一組的同一條守門一字不差。

### US-03 — 現貨開不了槓桿

| ID | 情境 | Oracle | 實作 | 測試 | T | C | 狀態 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AC-13 | 同一張表單上就看得到交易模式，所以當場擋 | 沒送出；那一組旁邊說現貨開不了槓桿 | `backtest-leverage-domain.ts`（收到交易模式那條路） | `StrategyScriptBacktestPane.spec`「現貨配槓桿說不通，當場擋下來」 | asserts-oracle | produces-oracle | ✅ |
| AC-14 | 現貨不填槓桿照常 | 送得出去 | 同上（`isSet` 為否即不檢查） | `StrategyScriptBacktestPane.spec`「現貨不填槓桿照常送出」 | asserts-oracle | produces-oracle | ✅ |
| AC-15 | 看不到交易模式的那張表單交給後端回答 | 後端指著槓桿拒絕時，那一組旁邊出現後端那句話 | `backtest-proxy.ts` 欄位翻譯 `leverage` ＋ `BacktestConditionsDomain` 傳 `null` | `backtest-proxy.spec`「後端指名槓桿時，說明落在那一組旁邊」＋ `backtest-leverage-domain.spec`「問不到交易模式的那條路不檢查現貨」 | asserts-oracle | produces-oracle | ✅ |

### US-04 — 成績單看得出爆倉

| ID | 情境 | Oracle | 實作 | 測試 | T | C | 狀態 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AC-16 | 有強平就顯示 | 出現強平出場 2 | `BacktestSummaryCard.vue` ＋ `backtest-domain.ts` | `BacktestSummaryCard.spec`「被強制平倉打掉的筆數與那兩格並排」 | asserts-oracle | produces-oracle | ✅ |
| AC-17 | 沒有強平就不佔位置 | 成績單上沒有那一格 | `BacktestSummaryCard.vue` 的 `v-if > 0` | `BacktestSummaryCard.spec`「一次都沒被強制平倉就不佔位置」 | asserts-oracle | produces-oracle | ✅ |
| AC-18 | 交易明細指得出是哪一筆 | 那一列寫著「強平」 | `backtest-domain.ts` `TRADE_EXIT_REASON_LABELS` | `backtest-domain.spec`「被強制平倉的那一筆，出場原因寫成『強平』」 | asserts-oracle | produces-oracle | ✅ |
| AC-19 | 舊版後端不說這件事也不會壞 | 沒有那一格；其餘每一格照舊 | `backtest-proxy.ts`（`?? 0`） | `backtest-proxy.spec`「沒說出場原因時當成訊號出場，兩個筆數當成零」（本次加上第三個筆數的斷言） | asserts-oracle | produces-oracle | ✅ |

### Core Business Rules

| ID | 規則 | Oracle | 實作 | T | C | 狀態 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| BR-1 | 整組留白＝不借錢，兩格**不出現在請求裡**（不是送 0） | 請求裡沒有那兩格 | `backtest-proxy.ts` `leverageBody` | asserts-oracle | produces-oracle | ✅ |
| BR-2 | 這一組兩格的留白規則不一樣 | 倍數留白＝關掉整組；維持保證金率留白＝用 0.5%（由後端給） | `leverage-multiplier-domain.ts` `isSet`（門檻一）／`maintenance-margin-rate-domain.ts` `isSet`（門檻零） | asserts-oracle | produces-oracle | ✅ |
| BR-3 | 上限是算出來的，拒絕時說出那個數字 | 拒絕句含「必須小於 (100÷倍數)%」 | `backtest-leverage-domain.ts` | asserts-oracle | produces-oracle | ✅ |
| BR-4 | 拒絕指向一組 | 一則訊息蓋住兩格，欄位名 `leverage` | `backtest-leverage-domain.ts`、`backtest-field-error.ts` | asserts-oracle | produces-oracle | ✅ |
| BR-5 | 「槓桿倍數不得小於 1 倍」只有一份 | 同一個 0.5 在兩張表單上得到同一句話 | `leverage-multiplier-domain.ts`（機器人那個模型改成委派它） | asserts-oracle | produces-oracle | ✅ ² |
| BR-6 | 現貨的檢查只做得到它看得見的地方 | 一張當場擋、一張交給後端 | `BacktestConditionsDomain` 的 `TradingMode \| null` | asserts-oracle | produces-oracle | ✅ |
| BR-7 | 逐字相容 | 整組留白時請求與這一刀之前相同 | `leverageBody` 回空物件 | asserts-oracle | produces-oracle | ✅ ³ |

² 兩邊各有一條斷言那句話（`position-plan-domain.spec`、兩張表單的 pane spec），
所以任何一邊改了措辭都會紅。**「只有一份」本身**（同一個檔案）沒有測試釘住——
那是結構，不是行為；而行為（同一句話）是釘住的。另外本次加了一條
`position-plan-domain.spec`「零倍也送不出去」，守的正是「零＝留白」那條規則
**不可以**被搬進共用模型——搬了機器人就會放過一個真的打了 0 的人。

³ 由既有的 204 個測試檔全數未修改且全綠背書（只有位置參數增補），加上 AC-02／AC-03 兩條明寫的對照。

### Non-Functional Requirements

| ID | 要求 | 判定 | 狀態 |
| :--- | :--- | :--- | :--- |
| NFR-1 | 整組留白時請求逐字不變 | 同 BR-7 | ✅ |
| NFR-2 | 兩格都是精確小數，不經過浮點數 | 兩格全程 `Decimal`，上線前 `.toString()`；無 `Number()` 轉換 | ✅ |
| NFR-3 | 不出現 `any` | `bun run lint` 綠（該規則由 eslint 強制） | ✅ |
| NFR-4 | 沿用既有併排排版，不新增第二份 | 新的一組用既有的 `__paired-inputs`；只多一行與兩個手足相同的 `grid-column`。`lint:style`、`lint:tokens` 綠 | ✅ ⁴ |

⁴ 以檢視 ＋ 兩個 lint 判定，沒有行為測試——這是一條設計約束，不是一段行為。

---

## Orphans

| 行為 / 型別 | 說明 | 判定 |
| :--- | :--- | :--- |
| `BacktestConditionsDomain` | `/improve-codebase` 階段加入，**不帶任何新業務行為**：把兩個請求模型裡一字不差的六組驗證收成一句。已補進 `UL-MAP.md` 與 `ARCH.md`。 | 非孤兒（結構性） |
| `LeverageMultiplierDomain` 被機器人的部位規劃共用 | 那句拒絕從機器人那裡搬出來，訊息逐字不變，並新增一條測試守住「零仍然被拒」。 | 非孤兒（BR-5） |

**Out of Scope 反向檢查**（皆未實作，無越界）：資金費率、把強制平倉價畫出來、
資金曲線標出被打掉的那一棒、機器人表單的行為改動。

---

## Summary

| | 數量 |
| :--- | ---: |
| ✅ conforms | 30 |
| 🔴 violations | 0 |
| 🟠 mis-asserted | 0 |
| 🟡 partial | 0 |
| ❌ gaps | 0 |
| ❔ unclear | 0 |
| ⚠️ orphans | 0 |

**Conformance: 30 / 30 ＝ 100%**

### 本次稽核發現並已修正的一件事

原 PRD 的 US-02 有一條「槓桿倍數填 abc → 那一組旁邊出現『槓桿倍數請填一個數字』」。
**那條路在畫面上到不了**：那兩格是數字輸入框，打不進 abc；而真的打進去了，
把它讀成精確小數的那一步會**先拋出來**，根本輪不到這個判斷。

那道守衛本身是對的、也該留著——它守的是**下一個呼叫者**，與兩個成本率那一組的
同一條守門一字不差（那一組的測試裡早就寫著這句話）。錯的是情境把它說成一件
關於這張表單的事。已改寫成一條關於那個判斷的情境，並在 PRD 裡寫明為什麼。
