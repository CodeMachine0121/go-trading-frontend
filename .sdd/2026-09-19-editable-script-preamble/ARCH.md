# 算式開頭那幾行也交給使用者（畫面）— Architecture Design

**切片**：`2026-09-19-editable-script-preamble`
**依據**：[BRIEF.md](BRIEF.md)、[PRD.md](PRD.md)
**範圍**：`go-trading-frontend`（後端不動——它收到的一直都是一整份算式）

---

## 1. Design Goal & Guiding Principle

### 一句話

**把「接合／拆解」整個刪掉，`IndicatorScriptDomain` 從組裝工變成預填內容的作者。**

### 這一刀真正的設計決定：分界消失，不是搬家

現在的 `IndicatorScriptDomain` 同時做四件事：

1. 產生唯讀外框（`frameHeader`）
2. 產生空白 stub 與範例（`blankBody` / `exampleBody`）
3. 送出前把外框接上主體（`assemble`）
4. 載入時把主體從整段算式裡拆回來（`disassemble`，外加一個「認不認得出外框」的旗標）

第 3、4 兩件事只有一個存在理由：**畫面上的東西與送出去的東西不是同一份**。
這一刀讓它們成為同一份，於是這兩件事連同它們拖出來的東西一起消失：

- `assemble` / `disassemble` — 刪
- `IndicatorScriptBodyVo`（拆出來的內容 ＋ 認不認得出外框）— 刪
- `StrategyScriptDto.frameRecognised` 與那一句「認不出外框」的通知 — 刪
- `IndicatorScriptTemplateDto.frameHeader` / `frameHeaderLineCount` / `bodyStartLineNumber` — 刪
- `AppCodeEditor` 的 `startLineNumber`（唯一的呼叫端沒了）— 刪

**這不是順手的重構，是這一刀的主體。** 這個切片的價值有一半就在於刪掉的這些東西：
每一樣都只為了「兩塊拼成一份」而存在，分界沒了它們就是純粹的負擔。

留下來的是那個真正屬於領域的知識：**一份新的算式長什麼樣**——
開頭的宣告與匯入、進入點的簽章怎麼隨指標值種類變、以及改種類時那一行怎麼重打。

### 第二個決定：`scriptBody` 改名成 `script`

「主體」這個字是相對於外框才有意義的。外框沒了，畫面上那一份就是**指標算式**本身，
名字必須跟著誠實——否則下一個讀到 `scriptBody` 的人會去找那個已經不存在的外框。
UL-MAP 已經把「算式主體」那一列刪掉、併回「指標算式」，程式碼跟著走。

改名範圍含欄位錯誤的欄位鍵（`'scriptBody'` → `'script'`）——那個鍵就是欄位名，
一個改一個不改，錯誤訊息會標不到那一格。

### 第三個決定：送出去的算式**逐字**照搬

現在的 `assemble` 會替使用者做三件小事：接上外框、砍掉尾端空白、補一個換行。
這一刀之後**一件都不做**。

理由是驗收條件裡那一條：「載入後原封不動再存一次，存下來的內容與載入時逐字相同」。
只要畫面還對內容動任何手腳，這句話就得加上「除了空白以外」的但書——
而那個但書正是使用者看不見、卻會讓他懷疑自己是不是改到了什麼的東西。

唯一仍然成立的判斷是**整份空白就擋下**（去空白後為空），
因為那時沒有東西可以送去跑；這條判斷只讀內容，不改內容。

---

## 2. Change Scope

### 新增

無。這一刀不新增任何檔案——它的產物是**少掉的那些**。

### 修改

| 檔案 | 改什麼 | 為什麼 |
| :--- | :--- | :--- |
| `app/domain/models/domains/indicator-script-domain.ts` | 刪 `frameHeader()` / `assemble()` / `disassemble()`；`blankBody()`→`blankScript()`、`exampleBody()`→`exampleScript()`（兩者都改為含開頭那幾行，後者收成私有）；`FRAME_HEADER` 改名 `SCRIPT_PREAMBLE`，定位從「唯讀外框」變成「預填的開頭」 | 分界消失；剩下的是「一份新算式長什麼樣」 |
| `app/domain/models/dto/indicator-script-template-dto.ts` | 只剩 `exampleScript` / `blankScript` 兩個欄位；刪 `frameHeader`、`frameHeaderLineCount`、`bodyStartLineNumber` | 編輯器不再需要知道外框與起算行號 |
| `app/domain/models/vo/indicator-script-body-vo.ts` | **刪檔** | 它存在只為了一起交出「拆出來的內容」與「認不認得出外框」 |
| `app/domain/models/domains/strategy-script-domain.ts` | 不再拆解，`content.script` 直接是 `strategyScript.script` | US-04：原文照搬 |
| `app/domain/models/dto/strategy-script-dto.ts` | 刪 `frameRecognised` | 沒有拆解就沒有認不認得出來 |
| `app/domain/models/dto/strategy-script-content-dto.ts` | `scriptBody` → `script` | 名字誠實 |
| `app/domain/models/domains/strategy-script-write-domain.ts` | 不再 `assemble`，存下去的就是畫面上那一份 | US-04 scenario 3：逐字相同 |
| `app/domain/models/domains/indicator-calculation-request-domain.ts` | 同上；空白判斷保留 | US-01 / US-06 |
| `app/domain/models/domains/backtest-request-domain.ts` | 同上 | 回測與預覽走同一條路 |
| `app/domain/models/dto/indicator-calculation-request-dto.ts`、`backtest-request-dto.ts` | 欄位改名 | 同上 |
| `app/domain/errors/indicator-calculation-field-error.ts`、`backtest-field-error.ts` | 欄位鍵 `'scriptBody'` → `'script'` | 錯誤要標得到那一格 |
| `app/domain/models/domains/strategy-script-draft-domain.ts` | 未改動的預填內容＝`blankScript()` | US-02 scenarios 3–5 |
| `app/components/molecules/IndicatorScriptEditor.vue` | 只剩一個編輯器，唯讀那一份與它的樣式刪掉；提示文字改寫 | US-01 |
| `app/components/atoms/AppCodeEditor.vue` | 刪 `startLineNumber` prop 與它的 watch | 行號一律從 1 起算，唯一的呼叫端沒了 |
| `app/components/organisms/IndicatorCalculationPanel.vue` | `scriptBody` → `script`；預填與範例改用新名字 | 改名與 US-03 |
| `app/components/organisms/StrategyScriptBacktestPane.vue` | prop 改名 | 改名 |
| `app/composables/use-strategy-script-library.ts` | 刪掉「認不出外框」那一則通知 | US-04 scenario 2 |
| `app/domain/service/indicator-calculation-service.ts`、`app/application/indicator-calculation-application.ts` | 只改說明文字與轉介的名字 | 同上 |
| `app/pages/indicator-calculations/index.vue`、`app/components/molecules/IndicatorScriptGuideDialog.vue` | 文案：不再說「只寫進入點裡面那幾行，外框由畫面備妥」 | UI 要求 |
| `app/assets/styles/abstracts/_mixins.scss` | `code-gutter` 那把尺的註解不再提兩塊對齊（樣式本身留著——編輯器仍在用） | 註解不可漂移 |

### 不動

- **後端**：`go-trading` 收到的一直是一整段算式，這一刀沒有改變那件事。
- **對外的 wire 形狀**：送出去的欄位仍叫 `script`、仍是一整段字串。
- **`IndicatorScriptDomain.retargetReturnType`**：改種類的行為一字不改（US-05）。
- **參數那一塊、回測其餘欄位、圖表套用策略腳本那條路**：都不碰算式的形狀。

---

## 3. 深度檢查（Deep Module）

`IndicatorScriptDomain` 的對外介面從六個公開方法縮成三個：

```
blankScript()                  一份新的空白算式長什麼樣
retargetReturnType(script)     改種類時那一行怎麼重打
toTemplateDto()                編輯器要的那兩份
```

`exampleScript()` 收成私有——它只有 `toTemplateDto()` 一個呼叫端。
（專案規則說「只被一個公開方法用到的私有方法直接 inline」；這裡刻意留成
具名私有方法，因為它與 `blankScript()` 是一對相互對照的東西，inline 進 DTO 的
建構呼叫會讓那一對看不出來。）

呼叫端不再需要依序做「拿外框 → 拿主體 → 接起來」，也不再需要知道
主體從第幾行開始——那些都是外框時代才有的序列。介面變窄，內部知識（開頭長什麼樣、
簽章怎麼隨種類變、進入點那一行怎麼認）全部留在裡面。

---

## 4. The Axis of Change

**下一個需求最可能是什麼？** 兩個：

1. **開頭要多匯入一樣東西**（執行沙箱開放了新的套件）。
2. **進入點換個長相**（例如多收一個參數）。

兩者都只會打到 `indicator-script-domain.ts` 的兩個地方：`SCRIPT_PREAMBLE` 常數與
`calculateSignature()`。這一刀讓那個位置**變得更安全**：

在外框時代，改動 `FRAME_HEADER` 會同時改變三件事——新算式長什麼樣、
**每一段既有算式送出去時被接上的東西**、以及**既有算式還拆不拆得開**。
改一個常數會讓一支昨天還載得進來的策略腳本今天認不出開頭。

這一刀之後，`SCRIPT_PREAMBLE` 只影響**下一份新開的空白算式**。
既有策略腳本存著自己的開頭，完全不受影響。**seam 從「每一段算式都經過的接合點」
退成「只有新稿子會碰到的預填點」**——這正是讓下一個需求變成單純新增的那一步。

---

## 5. Traceability

| PRD 場景 | 由誰滿足 |
| :--- | :--- |
| US-01 沒有任何唯讀區塊 / 行號從第一行算起 | `IndicatorScriptEditor.vue`、`AppCodeEditor.vue` |
| US-01 送出／存下的就是眼前那一份 | `IndicatorCalculationRequestDomain`、`BacktestRequestDomain`、`StrategyScriptWriteDomain` |
| US-02 空白算式含開頭與空進入點（兩種種類） | `IndicatorScriptDomain.blankScript()` |
| US-02 未改動的預填／完全空白不算未儲存 | `StrategyScriptDraftDomain` |
| US-02 改過開頭就算使用者寫的東西 | `StrategyScriptDraftDomain` |
| US-03 範例含開頭與整個進入點、填入即可送出 | `IndicatorScriptDomain.exampleScript()`、`IndicatorScriptTemplateDto` |
| US-04 載入原文照搬、不提示 | `StrategyScriptDomain`、`use-strategy-script-library.ts` |
| US-04 載入後再存一次逐字相同 | `StrategyScriptWriteDomain`（不再接合、不再修剪） |
| US-05 改種類只動進入點那一行 | `IndicatorScriptDomain.retargetReturnType()`（不改） |
| US-06 開頭刪掉照樣送出 | `IndicatorCalculationRequestDomain`（只擋空白） |
| US-06 整份空白當場擋下 | `IndicatorCalculationRequestDomain` ＋ `IndicatorCalculationFieldError('script', …)` |

---

## 6. 實作後的一次收斂（improve 階段）

分界消失之後，兩個介面被留在原地才看得出來是淺的：

1. **「一份空白的策略腳本長什麼樣」原本要問三次。** 畫面得先問預設的指標值種類，
   再拿那個種類去要空白算式，最後自己把兩者配成一份內容——而「哪一種配哪一份」
   正是它答不出來、卻會在其中一邊改動時悄悄答錯的事。
   收斂成 `IndicatorCalculationApplication.describeBlankStrategyScript()` 一次答齊；
   `defaultResultType()` 隨之從對外介面消失（它已經沒有別的呼叫端，
   而同一個 service 的公開用例方法之間不互相呼叫）。

2. **`IndicatorScriptTemplateDto` 就此只剩一個欄位。** 它原本裝三樣（外框、範例、空白），
   外框在這一刀刪掉、空白改由上面那個方法交出，剩下的只有範例一個字串。
   一個欄位的 DTO 不比那個字串本身說得更多，所以整個型別刪掉，
   `describeIndicatorScript` 改名成 `describeExampleScript(resultType): string`——
   問題變成一句話，答案也是。

**沒有做的一件事**：`IndicatorCalculationRequestDomain` 與 `BacktestRequestDomain`
各有一份「去空白後為空就說『請填寫算式內容』」。看起來像該抽掉的重複，但抽出來的東西
只會是一個 `trim()` 與一個句子——介面和實作一樣厚。這種模組不會讓呼叫端更簡單，
只會多一個要找的地方，所以留著。

---

## 7. Risks

- **改名的廣度**：`scriptBody` 出現在 DTO、domain、元件與欄位錯誤鍵四處。漏一處，
  錯誤訊息會標不到那一格（畫面不會壞，只會安靜地不顯示）。測試涵蓋欄位鍵，靠它擋。
- **既有策略腳本第一次露出自己的開頭**：預期行為，不是缺陷（PRD §7 已記）。
