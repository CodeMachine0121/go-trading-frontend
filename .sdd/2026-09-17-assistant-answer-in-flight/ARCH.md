# 看得到助手還在寫 — Architecture Design

---

## 1. Design Goal & Guiding Principle

**把「還在寫嗎」從畫面狀態改成讀回來的事實。**

今天它是 `useState('assistant-pending')`：一個前端自己記著的布林值，整頁重新載入就沒了。
之後它是一個**問句**——那一段對話最後一則的狀態是不是 `running`——而答案來自後端。

這一條決定了其餘每一件事：

- 提問的回應不再是答案，所以 `AssistantAnswer` 那條路整個換掉。
- 一則訊息開始帶狀態，所以 `ConversationMessage` 與它的 DTO 各多幾個欄位。
- 「要不要繼續問後端」是讀回來的訊息說了算，所以輪詢的開關長在 composable 上，
  由它讀出來的東西決定，而不是由送出這個動作決定。

**輪詢住在 composable，不住在 domain。** 依 `data-access.md`：
「快取／重新整理策略寫在 Application 或 composable，不寫進 Domain——
Domain 不該知道資料是不是快取來的」。多久問一次是畫面的節奏，不是領域規則。

---

## 2. Change Scope

| 層 | 動作 |
| :--- | :--- |
| Entity | `ConversationMessage` 多五個欄位；新增 `AssistantAnswerStarted` |
| Domain Model | `ConversationDomain` 多兩個行為；`AssistantAnswerDomain` 換掉 |
| DTO | `ConversationMessageDto` 多三樣；`AssistantAnswerDto` → `AssistantAnswerStartedDto` |
| Errors | 新增 `AssistantAnswerInProgressError` |
| Interface / Proxy | `ask` 的回傳型別換掉；wire 型別跟著換；409 多一條翻譯 |
| Service / Application | `ask` 的回傳型別換掉 |
| Composable | 等待改成讀出來的；新增輪詢 |
| Components | 等待與失敗改由訊息驅動 |

---

## 3. New Classes / Modules

| 型別 | 檔案 | 職責 |
| :--- | :--- | :--- |
| `AssistantAnswerStarted` | `app/domain/models/entities/assistant-answer-started.ts` | 提問被收下時後端回的三樣：落在哪一段、哪一則、什麼狀態 |
| `AssistantAnswerStartedDto` | `app/domain/models/dto/assistant-answer-started-dto.ts` | 同上，離開 domain 的形狀 |
| `AssistantAnswerInProgressError` | `app/domain/errors/assistant-answer-in-progress-error.ts` | 409：前一則還在寫 |
| `assistantPollIntervalMilliseconds` | `app/composables/use-assistant-conversation.ts` 內的常數 | 多久回頭問一次，預設 2000 |

### 為什麼 `AssistantAnswerStarted` 沒有 Domain Model

拿掉它的三個欄位之後什麼都不剩——它沒有計算、沒有驗證、沒有狀態轉換。
依 `architecture.md`，Domain Model 是**行為的所在地**，不是每個 entity 的必要配件。
它用 entity 身上的 `toDto()` 出去，那是資料形狀轉換而不是業務邏輯。

「這一段對話還在等嗎」確實是行為——但它問的是**整段對話**，不是這一則，
所以它掛在 `ConversationDomain` 上。

---

## 4. Modified Components

### `ConversationMessage`（entity）

多五個欄位：`status`、`failureReason`，以及答案才有的
`queryCount`、`stoppedAtQueryLimit`、`usage`。

後三個以前只在剛收到那一刻拿得到，元件註解還特地寫了「這不是遺漏而是形狀」。
**那句話現在不成立了**：提問的回應已經不帶答案，後端改成跟著對話一起給，
所以每一則讀回來的回答都有附註。

### `ConversationDomain`

多兩個行為，兩個都是關於**整段對話**而不是某一則：

- 這一段是不是還在等一則回答（最後一則的狀態是 `running`）。
- 這一段最後那一則是不是失敗了，失敗原因是什麼。

進行中與失敗的那一則**只轉出提問一則**，不轉出空白的回答——
後端也只給提問，兩邊一致。

### `AssistantConversationProxy`

- `ask` 的 wire 換成 `{conversationId, turnId, status}`，回 `AssistantAnswerStarted`。
- `getConversation` 的訊息 wire 多五個欄位。
- 多一條翻譯：409 → `AssistantAnswerInProgressError`。
- **503 那條刪掉**：後端不再用它回覆提問，助手不可用現在是那一則的失敗原因。

### `useAssistantConversation`

- `pending` 由 `useState` 的旗標改成 **computed**：讀出來的最後一則是不是進行中。
- `rejectionMessage` 保留，但只服務**送不出去**那一類（額度、連線、409）；
  **一則寫到一半失敗**改由對話串上那一則自己說。
- 新增輪詢：只在還在等的時候跑，答完／失敗／離開／換對話一律停。

### 元件

- `AssistantConversationThread` 依每一則的狀態決定畫回答、畫等待、還是畫原因。
- `AssistantPendingNotice` 不改——它本來就只是一塊等待，由誰決定要不要畫是外面的事。

---

## 5. Component Relationships

```
AssistantDrawer / pages/chat
        │
        ▼
useAssistantConversation ──(輪詢節奏住這裡)──┐
        │                                    │
        ▼                                    │
AssistantConversationApplication             │
        │                                    │
        ▼                                    │
AssistantConversationService                 │
        │                                    │
        ▼                                    │
IAssistantConversationProxy ◀────────────────┘
        │
        ▼
AssistantConversationProxy（打後端，翻譯 409）
```

依賴方向不變。輪詢在最上層，因為它是**畫面的節奏**；
「還在等嗎」在 `ConversationDomain`，因為它是**關於一段對話的事實**。

---

## 6. Extensibility & Handoff Notes

- 要換成推播時，改的只有 composable 裡那一段輪詢；
  「還在等嗎」與「失敗原因是什麼」都已經在 domain 上，不必動。
- 要做取消時，後端要先有那件事；畫面端的落點是等待那一塊。
- 輪詢間隔是一個常數。單人使用、對話不長，先不做退避。

---

## 7. Traceability

| AC | 落在哪 |
| :--- | :--- |
| US-01 送出後看得到收下了 | proxy `ask` 回 `AssistantAnswerStarted`；composable 樂觀上提問 |
| US-02 重整後還看得到 | `ConversationDomain` 的「還在等嗎」+ 打開對話時起輪詢 |
| US-03 定時問、答完就停 | composable 的輪詢開關由讀出來的狀態決定 |
| US-04 失敗看得出來 | `ConversationMessageDto.failureReason` + 對話串渲染 |
| US-05 等待中不能再送 | `pending` computed → 送出鍵停用；409 → `AssistantAnswerInProgressError` |
| US-06 每一則的來歷 | `ConversationMessage` 的五個新欄位 |

---

## 8. Risks & Open Decisions

| 風險 | 緩解 |
| :--- | :--- |
| 後端掛掉時輪詢空轉 | 連不上就停並顯示既有的連線錯誤 |
| 長對話每兩秒整包讀回 | 單人使用、對話不長，先不優化；要優化時後端加一條「只回最後一則」 |
| 兩個分頁同時輪詢 | 各自問各自畫，兩邊看到的是同一件事，不必同步 |

### Open decisions（交給實作）

- 輪詢間隔兩秒。快的回答約兩秒、慢的好幾分鐘，兩秒不會讓快的看起來慢。
- 失敗那一塊要不要自動重試。**不要**——重試要花錢，該由使用者按。
