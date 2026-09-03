# 開一份新的空白策略 — Architecture Design

PRD: `PRD.md`
Brief: `BRIEF.md`

---

## 1. Design Goal & Guiding Principle

這個切片小，但它踩在兩個很容易長歪的地方，所以設計的重點都在「別多出第二份定義」：

1. **「一份空白長什麼樣」只能有一個定義。**
   第一次進入畫面時，畫面就已經在建立一份空白（四個 `ref` 的初值）。
   如果「開新的」自己再寫一次那四個值，就會有兩份會漂移的空白——
   哪天預設的彙總刻度改了，只改到一邊，於是「新開的」與「剛進來的」不一樣。
   → 把那份空白**具名**成一個 `StrategyContentDto`，兩條路都用它。

2. **「清空之前先問過」只能有一條路。**
   「載入另一支」已經有這條把關（`selectStrategy` → `discard` 對話框 → `confirmDiscard`）。
   「開新的空白」是同一件事的另一個觸發點：兩者都會蓋掉編輯區。
   → 把把關抽成一條路徑，讓兩個動作都走它，而不是複製一份判斷與一個對話框狀態。

指導原則：**這個動作完全不跨越應用程式邊界。** 它是畫面狀態的重設，
所以它不該長出 Application 的新用例、不該有 proxy、也不該有任何 `await`。

## 2. Change Scope

| 檔案 | 動作 | 為什麼 |
| :--- | :--- | :--- |
| `app/domain/models/vo/aggregation-interval-vo.ts` | 不動 | — |
| `app/domain/service/strategy-service.ts` | 加 `defaultCandleCount()` | 「計算根數預設 20」目前是畫面裡的字面值。它是策略內容的一部分，預設值該與 `defaultAggregationInterval()` 住在一起 |
| `app/application/strategy-application.ts` | 加 `defaultCandleCount()` 轉呼叫 | 畫面只認識 Application |
| `app/composables/use-strategy-library.ts` | 加 `startBlankStrategy`；把「先問過」抽成 `guardOverwritingDraft` | 這個動作改的是策略在這個畫面上的狀態，狀態就住在這裡 |
| `app/components/atoms/AppIcon.vue` | 加 `new` 圖示 | 動作那一排是只有圖示的按鈕 |
| `app/components/organisms/IndicatorCalculationPanel.vue` | 具名 `blankContent`、四個 `ref` 改以它起頭、加按鈕、`applyContent` 內清掉上一次的結果 | 見下 |

**不動**：後端、proxy、entity、domain model、`StrategyContentDto` 的形狀、對話框元件。

## 3. New Classes / Modules

**沒有新的類別。** 這是刻意的：這個動作沒有新的領域概念——
「一份空白的策略內容」用的就是既有的 `StrategyContentDto`，
「有沒有未儲存的變更」用的就是既有的 `StrategyDraftDomain`。
新開一個 `BlankStrategyDomain` 之類的東西只會讓「空白」有第二個定義。

新增的是**兩個函式**與**一個預設值的家**：

| 名稱 | 住在 | 職責 |
| :--- | :--- | :--- |
| `StrategyService.defaultCandleCount()` | domain service | 「沒特別指定時要算幾根」。與 `defaultAggregationInterval()` 並列，畫面不自己指定預設值 |
| `useStrategyLibrary().startBlankStrategy()` | composable | 開一份空白：把關 → 套用空白內容 → 解除關聯 → 說一句 |
| `guardOverwritingDraft(action)`（composable 內的私有 helper） | composable | 「這件事會蓋掉編輯區，有沒存的東西就先問過」。被 `selectStrategy` 與 `startBlankStrategy` 兩個公開動作共用，因此符合抽 private helper 的門檻（≥2 個呼叫者） |

### 被扣住的那件事怎麼表達

原本 `pendingStrategyId: number | null` 同時扮演兩個角色：
「等一下要載入哪一支」與「等一下要刪哪一支」。多了「等一下要開一份空白」之後，
它就表達不了了——空白沒有識別碼。

做法：把「被確認擋下來的那件事」存成**一個待執行的動作**（`pendingDraftAction`），
而不是一個識別碼。

- 好處：`selectStrategy(7)` 與 `startBlankStrategy()` 扣住的都是「一個 function」，
  `confirmDiscard` 只要把它叫出來，不必知道那是哪一種。之後再多一個會蓋掉編輯區的動作也不必再改它。
- **刪除那條路維持用 `pendingStrategyId`**：它扣住的是「要刪哪一支」，
  與「要套用哪一份內容」是兩個不同的概念。原本共用一個 `ref` 是巧合（一次只開一個對話框），
  拆開之後那個巧合就不必再成立。

## 4. Modified Components

### `IndicatorCalculationPanel.vue`

```ts
// 一份空白的策略內容——「空白長什麼樣」在這個畫面上只有這一個定義。
// 第一次進入畫面與按下「新的空白策略」用的都是它。
const blankStrategyContent = new StrategyContentDto(
  '',
  indicatorCalculationApplication.defaultResultType(),
  strategyApplication.defaultAggregationInterval(),
  strategyApplication.defaultCandleCount(),
)
```

四個 `ref` 的初值改成讀它。`useStrategyLibrary` 多收它當第四個參數
（前三個已經是「怎麼讀畫面上這一份」「怎麼把一份寫回畫面」，這一個是「空白那一份」，同一組概念）。

`applyContent` 回呼裡多一行清掉 `result`。**這同時修掉一個既有的問題**：
今天載入另一支策略時，上一支算出來的結果會留在畫面上，配著新的算式看是錯的。
兩個情境是同一個原因，所以修在同一個地方。

### 確認對話框的文案要中性

那個對話框原本寫死「載入另一支策略會蓋掉它」／「放棄並載入」。多了「開一份空白」這個觸發點之後，
同一段文字會對其中一種情況說錯話——按「新的空白策略」的人沒有要載入任何東西。

改成兩邊都成立的說法：「接下來這個動作會蓋掉它」／「放棄並繼續」。
不做成兩套文案——那需要把「扣住的是哪一種動作」暴露給畫面，
為了一句話多一個狀態並不值得，而使用者剛按下按鈕，本來就知道自己要做什麼。

### 動作那一排的順序

`新的空白` → `儲存` → `另存為新策略` → `重新命名` → `策略清單`。
「新的」排第一，因為每一個檔案選單都是這個順序，肌肉記憶在那裡。

## 5. Component Relationships

```
IndicatorCalculationPanel
   │  blankStrategyContent（具名的那一份空白）
   │  applyContent / readCurrentContent
   ▼
useStrategyLibrary
   │  startBlankStrategy ─┐
   │  selectStrategy ─────┴─▶ guardOverwritingDraft(action)
   │                              │  有未儲存的變更？→ StrategyApplication.hasUnsavedChanges
   │                              ├─ 有 → 扣住 action，開 discard 對話框
   │                              └─ 沒有 → 當場執行 action
   ▼
StrategyApplication → StrategyService → StrategyDraftDomain（既有）
```

`startBlankStrategy` 這條路**沒有** proxy、沒有 `await`：它到不了應用程式邊界。

## 6. Extensibility & Handoff Notes

- 之後若要加鍵盤快捷鍵（`Ctrl`/`Cmd`+`N` 攔不下來，得另挑一組），
  綁的就是 `startBlankStrategy`，不必動任何判斷。
- 之後若要多一個「會蓋掉編輯區」的動作（例如「帶入範例內容」也想先問過），
  把它包進 `guardOverwritingDraft` 即可，確認對話框與扣住的機制都不必再改。
- `defaultCandleCount()` 之後若要跟著彙總刻度變（粗的刻度要算比較少根），
  改的是 domain service 那一個方法，畫面不必動。

## 7. Traceability

| AC (PRD) | 落在哪 |
| :--- | :--- |
| 清空算式並把設定帶回預設 | `blankStrategyContent` + `applyContent` |
| 解除與那一支的關聯 | `startBlankStrategy` 內 `activeStrategy = null`、`loadedContent = null`；儲存改問名字沿用既有 `saveStrategy` |
| 交易標的不受影響 | `applyContent` 不碰 `symbol`（`StrategyContentDto` 本來就不含交易標的） |
| 上一次的計算結果不留在畫面上 | `applyContent` 回呼內清掉 `result` |
| 一律說出已經開了新的一份 | `startBlankStrategy` 內設 `noticeMessage` |
| 有未儲存的變更時先問 / 確認後才清空 / 取消不動 | `guardOverwritingDraft` + 既有 `discard` 對話框 + `confirmDiscard` |
| 一份沒動過的空白不必問 | `loadedContent = null` + `StrategyDraftDomain`「沒載入過時只看算式是否空白」的既有規則 |
| 一次請求都不發 / 連不上也照樣開得起來 | `startBlankStrategy` 全程同步、不呼叫 `strategyApplication` 的任何 async 方法 |

## 8. Risks & Open Decisions

| 項目 | 決定 |
| :--- | :--- |
| 「未使用任何策略」那個選項要不要也變成這個動作？ | **不要。** 它是 `activeStrategyId` 為 null 時的顯示用預設項，必須留著當佔位。而「解除關聯」與「連內容一起清空」是兩件事——選它卻把算式清掉會嚇到人 |
| 把刪除也一起改用 `pendingDraftAction`？ | **不改。** 它扣住的是另一個概念（要刪哪一支），統一只是看起來整齊，實際上會把兩件事綁在一起 |
| 清空之後 `loadedContent` 設成 null 還是設成那份空白？ | **null。** 「沒有載入過任何策略」就是實話，而既有的 draft domain 對 null 的規則（只看算式是否空白）剛好正是我們要的行為：沒打字不問、打了字才問 |
| 確認對話框要不要分兩套文案？ | **不要。** 改成中性的說法（見上）。分兩套要把「扣住的是哪一種」暴露出去，為一句話多一個狀態不值得 |
| 鍵盤快捷鍵 | 這個切片不做（`Ctrl`/`Cmd`+`N` 是瀏覽器保留鍵，攔不下來）。見 BRIEF 的 Out of Scope |
