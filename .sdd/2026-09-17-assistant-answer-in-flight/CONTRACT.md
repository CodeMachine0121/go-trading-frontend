# Contract Traceability Matrix — assistant-answer-in-flight

Contract: `.sdd/2026-09-17-assistant-answer-in-flight/PRD.md`
Design map: `.sdd/2026-09-17-assistant-answer-in-flight/ARCH.md`
Implementation: `app/composables/use-assistant-conversation.ts`,
`app/domain/models/domains/conversation-domain.ts`,
`app/domain/models/entities/conversation-message.ts`,
`app/domain/models/entities/assistant-turn-status.ts`,
`app/domain/models/entities/assistant-answer-started.ts`,
`app/domain/models/dto/conversation-message-dto.ts`,
`app/domain/models/dto/assistant-answer-started-dto.ts`,
`app/domain/errors/assistant-answer-in-progress-error.ts`,
`app/infrastructure/proxy/assistant-conversation-proxy.ts`,
`app/infrastructure/proxy/current-conversation-preference-proxy.ts`,
`app/components/molecules/AssistantComposer.vue`, `app/app.vue`
Oracle: Acceptance Criteria (20 clauses) + Core Business Rules (6 clauses)

Test files below are abbreviated:
`cmp` = `tests/composables/use-assistant-conversation.spec.ts`,
`dom` = `tests/domain/models/domains/conversation-domain.spec.ts`,
`pxy` = `tests/infrastructure/proxy/assistant-conversation-proxy.spec.ts`,
`comp` = `tests/components/molecules/AssistantComposer.spec.ts`,
`drw` = `tests/components/organisms/AssistantDrawer.spec.ts`.

## Clauses

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-1 | 送出之後立刻看到等待 | 提問在對話串上，底下是等待 | `use-assistant-conversation.ts` `ask` 樂觀上提問 | `cmp:86`, `cmp:160` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-2 | 等待是後端說的 | 畫面沒有用自己的旗標決定 | `pending` computed 讀最後一則的 `status` | `cmp:160`, `cmp:171`, `dom:107` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-3 | 重整之後等待還在 | 提問還在，等待也還在 | `resumeCurrentConversation` + 偏好 proxy | `cmp:244` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-4 | 關掉分頁再回來看得到答案 | 看得到完整的答案 | 同上 + 回頭詢問 | `cmp:257` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-5 | 全部答完的對話不顯示等待 | 沒有等待 | `pending` computed | `cmp:171` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-6 | 答完就自己出現 | 答案出現，詢問停下來 | `schedulePoll` 自我終止 | `cmp:202` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-7 | 沒有東西在跑就不問 | 不會定時去打後端 | `watch(pending)` 只在 true 時排 | `cmp:231` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-8 | 切到別的畫面不會丟掉那次回答 | 回來看得到答案 | 迴圈住在共用狀態、不綁元件生命週期 | — | no-test | produces-oracle | 🟠 mis-asserted |
| AC-9 | 換一段對話就停止問舊的那一段 | 詢問停下來 | `startNewConversation`／`selectConversation` 呼叫 `stopPolling`；挑到的新那一段還在寫時由 `schedulePoll` 接上 | `cmp:242`, `cmp:256` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-10 | 抽屜與整頁同時也只問一次 | 後端只被問一次 | `pollHandle` 住在 `useState`，`schedulePoll` 已排就不再排 | `cmp:191`（多個呼叫端共用同一份狀態，斷言剛好兩次） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-11 | 失敗顯示後端給的原因 | 提問底下出現那句原因 | `failedAnswerReason` → `rejectionMessage` | `cmp:293` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12 | 重整之後原因還在 | 那句原因還在 | 原因來自讀回來的那一則，不是本地狀態 | `cmp:293`（同一條路徑：讀回來就有） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-13 | 被重新啟動中斷 | 看得到那句話 | 如實轉達後端給的 `failureReason` | `cmp:293` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-14 | 可以再試一次 | 同一句話再送一次 | `retry` | `cmp:312` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-15 | 等待中送出鍵停用、輸入框不鎖 | 送出停用，輸入框打得了字 | `AssistantComposer.vue` | `comp:145`, `drw:100` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-16 | 後端拒絕時如實轉達 | 那句拒絕原樣顯示出來 | 409 → `AssistantAnswerInProgressError` → `readableMessageOf` | `pxy:96`, `cmp:327` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-17 | 三種狀態各自的樣子 | 答完兩則、進行中只有提問 | `ConversationDomain.toDto` 依後端給的展開 | `dom:56`, `dom:141` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-18 | 提早收尾看得出來 | 看得到已達查詢次數上限 | `noteOf` + `AssistantAnswerNoteDto` | `dom:45`, `pxy:186` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-19 | 收回來的是「去哪裡找答案」 | 三個欄位，不含答案 | `AssistantAnswerStarted` + proxy wire | `pxy:41`, `cmp:95` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-20 | 認不出來的狀態當成失敗 | 不是進行中、不是已回答 | `assistantTurnStatusOf` | `pxy:56` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-1 | 等待一律由讀回來的訊息決定 | 同 AC-2 | `pending` computed | `cmp:160`, `cmp:179` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-2 | 全站一條迴圈，自己會停 | 同 AC-6／AC-7／AC-10 | `pollHandle` in `useState` + 自我終止 | `cmp:191`, `cmp:202`, `cmp:231` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-3 | 失敗留在對話串上並可重試 | 同 AC-11／AC-14 | `failedAnswerReason` | `cmp:303`, `cmp:312` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-4 | 等待中送出鍵停用、輸入框不鎖 | 同 AC-15 | `AssistantComposer.vue` | `comp:145` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-5 | 後端的拒絕如實轉達 | 同 AC-16 | `readableMessageOf` | `cmp:327` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-6 | 進行中與失敗的只有提問 | 沒有空白的回答泡泡 | 後端只給提問；`ConversationDomain` 不補 | `dom:141`, `cmp:303` | asserts-oracle | produces-oracle | ✅ conforms |

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| `use-assistant-conversation.ts` `refreshCurrentConversation` 的 catch | 讀不回來時說出原因並停在原地，下一次醒來再試 | PRD Edge Cases「定時詢問時後端連不上」的落點，非孤兒 |
| `current-conversation-preference-proxy.ts` 的三個 try/catch | 瀏覽器把儲存關掉時等同「還沒有一段對話」 | 與既有的抽屜寬度偏好同一條規則，非孤兒 |
| `assistant-composer` 移除的 refocus watcher | 它存在只為了把「鎖住輸入框」偷走的焦點還回來 | 隨 AC-15 一起消失，非孤兒 |

## Summary

- Conforms: 25/26 clauses ✅ (96%)
- Violations: 無
- Mis-asserted: AC-8（切換畫面不會丟掉那次回答）——它成立的方式是**沒有程式碼**：
  迴圈的握把住在 `useState` 而不是元件範圍，也沒有任何 `onScopeDispose` 去清它。
  要直接釘它得掛載再卸載一個元件並證明迴圈還活著，而這個 composable 的測試
  不經由元件呼叫。間接的證據是 `cmp:202`／`cmp:257`：那兩條在沒有任何元件的情況下
  仍然收得到後續的輪詢結果。
- Partial: 無
- Gaps: 無
- Unclear: 無
- Orphans: 0

本次稽核修補的缺口與它揪出來的一個錯：AC-9 原本只斷言開新對話把畫面清回起點，
補上兩條——一條釘「已排的那一次被取消」，一條釘「換到另一段還在寫的對話時馬上接著問它」。
**後面那一條當場失敗**：`selectConversation` 取消了舊的那一次，而 `pending` 的值
沒有變（兩段都在寫），watcher 因此不會被叫醒——一段還在寫的對話從此沒有人去問它。
已修：`schedulePoll` 自己判斷「有沒有必要、有沒有排過」，挑完一段對話後直接呼叫它。

> 稽核性質：靜態一致性稽核。它比對測試斷言與程式路徑對上規格的預期結果，
> 不執行自行發明的情境，也不以整份測試套件的綠燈作為判準。
