# Contract Traceability Matrix — assistant-pending-revisions

Contract: PRD.md (v1.0, Finalized)
Design map: ARCH.md
Implementation: `app/` on branch `feat/assistant-prompt-injection-hardening` (`git diff main...HEAD`)
Oracle: Acceptance Criteria (16 clauses: 10 AC, 4 BR, 2 NFR)

Ceiling: static conformance audit. Tests and code were each judged against the spec oracle by reading; no invented scenarios were executed.

Out of Scope (negative checklist): 差異比對、獨立清單頁、把結果帶回助手. None found in the diff.

## Clauses

The `Spec-expected` column holds the business-observable oracle derived from the PRD alone; the concrete artifact (via UL-MAP/ARCH) is what the audit columns check.

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-1 | 寫完的回答下方列出它的待確認修改：Given 一則已寫完的回答帶著一筆等你確認的策略腳本修改「二十根均線」 When 我打開這段對話 Then 那則回答下方出現「策略腳本「二十根均線」」與狀態「等你確認」 And 它有「確認」與「拒絕」兩個動作 | Under that answer: title 策略腳本「二十根均線」, status 等你確認, both confirm and reject actions offered | proxy `assistant-conversation-proxy.ts:152`; `conversation-domain.ts:54`; `assistant-pending-revision-domain.ts:23-30`; `AssistantConversationThread.vue:94-101`; `AssistantPendingRevisionCard.vue:30,37,49-71` | `AssistantPendingRevisionCard.spec.ts:13,21`; `assistant-pending-revision-domain.spec.ts:12`; `AssistantConversationThread.spec.ts:191`; `assistant-conversation-proxy.spec.ts:282` | asserts-oracle (placement pinned only by count + template order) | produces-oracle | ✅ conforms |
| AC-2 | 沒寫完的問答把它列在提問下方：Given 一則失敗的問答帶著一筆等你確認的修改 When 我打開這段對話 Then 那一筆出現在那則提問下方 | For a failed turn, the item appears under the ask | `AssistantConversationThread.vue:86-101` renders each message's own revisions after it; proxy parses revisions on any role (`assistant-conversation-proxy.ts:152`) | none: every revision test attaches it to an `answer`; no failed-ask case | no-test | produces-oracle | 🟡 partial |
| AC-3 | 處理過的只顯示狀態：Given 一筆已確認、一筆已拒絕的修改 When 我打開這段對話 Then 它們分別顯示「已確認」與「已拒絕」 And 兩筆都沒有確認或拒絕的動作 | 已確認 / 已拒絕 shown; neither has any action | `assistant-pending-revision-domain.ts:12-13,30`; `AssistantPendingRevisionCard.vue:50` | `assistant-pending-revision-domain.spec.ts:12` (confirmed/rejected rows → label, canResolve=false); `AssistantPendingRevisionCard.spec.ts:32` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-4 | 看得到改成的完整內容：Given 一筆等你確認的修改 When 我展開它 Then 我看到它改成的完整內容 | Expanding the item shows the full proposed content | `assistant-conversation-proxy.ts:188-194` (pretty-printed JSON); `AssistantPendingRevisionCard.vue:41-47` | `assistant-conversation-proxy.spec.ts:282` (full exact text); `AssistantPendingRevisionCard.spec.ts:13` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-5 | 交易策略的修改說得出是交易策略：Given 一筆等你確認的交易策略修改「動能追蹤」 When 我打開這段對話 Then 它顯示「交易策略「動能追蹤」」 | Title reads 交易策略「動能追蹤」 | `assistant-pending-revision-domain.ts:7,27` | `assistant-pending-revision-domain.spec.ts:12` (tradingStrategy row); `assistant-conversation-application.spec.ts:100` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-6 | 確認：Given 一筆等你確認的修改 When 我按確認 Then 系統送出確認，並重讀這段對話 And 那一筆顯示「已確認」 | Confirm is sent, the conversation is re-read, and the item then shows 已確認 | `use-assistant-conversation.ts:364-367,386-388`; `assistant-conversation-proxy.ts:161-177` | `use-assistant-conversation.spec.ts:668`; `assistant-conversation-proxy.spec.ts:320` | shallow: asserts the send and that `getConversation(7)` was called, but never that the re-read result replaces the thread so the item shows 已確認 — would still pass if the re-read result were discarded | produces-oracle | 🟠 mis-asserted |
| AC-7 | 拒絕：Given 一筆等你確認的修改 When 我按拒絕 Then 系統送出拒絕，並重讀這段對話 And 那一筆顯示「已拒絕」 | Reject is sent, the conversation is re-read, and the item then shows 已拒絕 | `use-assistant-conversation.ts:369-372,386-388`; `assistant-conversation-proxy.ts:165-177` | `use-assistant-conversation.spec.ts:668`; `assistant-conversation-proxy.spec.ts:320` | shallow (same as AC-6) | produces-oracle | 🟠 mis-asserted |
| AC-8 | 送出中不能再按：Given 我按下確認，結果還沒回來 When 我再按那一筆的確認或拒絕 Then 不會再送出任何一次 | No further confirm or reject is sent while the first is in flight | `use-assistant-conversation.ts:378-382`; `AssistantConversationThread.vue:98`; `AssistantPendingRevisionCard.vue:55,65` | `use-assistant-conversation.spec.ts:685`; `AssistantPendingRevisionCard.spec.ts:40`; `AssistantConversationThread.spec.ts:214` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-9 | 被擋下時就地說原因：Given 後端以「這幾台機器人正在用它跑：早盤突破，請先停止它們」擋下確認 When 我按確認 Then 那一筆底下出現「這幾台機器人正在用它跑：早盤突破，請先停止它們」 And 那一筆仍是等你確認，可以再按 | The backend's exact sentence appears under that item; it stays 等你確認 and can be pressed again | `backend-api-proxy.ts` rejection carries `data.message`; `assistant-conversation-proxy.ts:178-184`; `use-assistant-conversation.ts:390-395`; `AssistantConversationThread.vue:99`; `AssistantPendingRevisionCard.vue:73-80` | `assistant-conversation-proxy.spec.ts:341`; `use-assistant-conversation.spec.ts:704-727`; `AssistantPendingRevisionCard.spec.ts:50`; `AssistantConversationThread.spec.ts:191` | asserts-oracle | produces-oracle | ✅ conforms |
| AC-10 | 連不上後端：Given 後端連不上 When 我按確認 Then 那一筆底下出現連不上後端的說明 | An "cannot reach backend" explanation appears under that item | `use-assistant-conversation.ts:391,508-510` | `use-assistant-conversation.spec.ts:704` (BackendUnreachableError row) | asserts-oracle | produces-oracle | ✅ conforms |
| BR-1 | 狀態只來自後端：按下後一律重讀整段對話，不在畫面自己改狀態。 | After any press the whole conversation is re-read; the screen never changes the item's status itself | `use-assistant-conversation.ts:374-396` (returned DTO ignored, no local mutation) | `use-assistant-conversation.spec.ts:668` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-2 | 認不出來的狀態當成「已處理」顯示且不給動作。 | Unrecognized status shows 已處理 and offers no action | `assistant-pending-revision-status.ts:5-11`; `assistant-pending-revision-domain.ts:14,30`; `AssistantPendingRevisionCard.vue:50` | `assistant-conversation-proxy.spec.ts:282` (something-new → unknown); `assistant-pending-revision-domain.spec.ts:12` (unknown → 已處理, false); `AssistantPendingRevisionCard.spec.ts:32` | asserts-oracle | produces-oracle | ✅ conforms |
| BR-3 | 認不出來的種類顯示為「項目」。 | Unrecognized kind titled 項目「名稱」 | `assistant-pending-revision-domain.ts:23` | `assistant-pending-revision-domain.spec.ts:12` (strategyBot row) | asserts-oracle | produces-oracle | ✅ conforms |
| BR-4 | 一筆的錯誤說明在它再被處理或對話重讀成功後清掉。 | The item's error is cleared (a) when it is pressed again and (b) after any successful re-read of the conversation | (a) `use-assistant-conversation.ts:383-384`. (b) missing: `refreshCurrentConversation` (`:352`) and `selectConversation` (`:189`) replace messages but never touch `pendingRevisionErrors` | `use-assistant-conversation.spec.ts:715-727` covers (a) only | shallow (half the rule) | diverges: after a successful poll/re-open the old error stays under the item | 🔴 violation |
| NFR-1 | Security: 內容以純文字顯示，不當作 HTML。 | Content containing markup is shown literally, never interpreted | `AssistantPendingRevisionCard.vue:43-46` (mustache in `<pre>`, no `v-html`) | none: no test feeds markup-bearing content and checks it stays literal | no-test | produces-oracle | 🟡 partial |
| NFR-2 | Compatibility: 後端沒有帶這一項時與今天完全相同。 | Messages without the field render exactly as before: no cards, nothing extra | `assistant-conversation-proxy.ts:152` (`?? []`); `conversation-message.ts:30`; `conversation-message-dto.ts:34`; `AssistantConversationThread.vue:95` | `assistant-conversation-proxy.spec.ts:303`; `conversation-domain.spec.ts:122` (messages[0] empty); pre-existing Thread specs unchanged | asserts-oracle | produces-oracle | ✅ conforms |

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| `AssistantConversationThread.vue:98` + `use-assistant-conversation.ts:378` | While any one item is in flight, every item's buttons in the thread are disabled and presses on other items are dropped. PRD only speaks of "那一筆" | undocumented (broader than spec) |
| `use-assistant-conversation.ts:354-361,388` | If confirm/reject succeeds but the follow-up re-read fails, the failure is silently swallowed: no message, item still shows 等你確認 with active buttons | undocumented |
| `assistant-conversation-proxy.ts:178-181`, `assistant-pending-revision-not-found-error.ts` | 404 becomes a dedicated sentinel error; the composable does not distinguish it (backend message shown as-is) | undocumented (ARCH-only) |
| `use-assistant-conversation.ts:91` | Per-item errors are global shared state and are not cleared on switching or starting a conversation | undocumented (related to BR-4) |

## Summary

- Conforms: 11/16 clauses ✅ (69%)
- Violations: BR-4
- Mis-asserted: AC-6, AC-7
- Partial: AC-2, NFR-1
- Gaps: none
- Unclear: none
- Orphans: 4


---

## Resolution (after this audit)

| Clause | Finding | Resolution |
| :--- | :--- | :--- |
| BR-4 | 重讀成功後沒清掉錯誤說明 | 重讀、回頭詢問、換一段、開新對話都清掉；三個情境各有測試並經變異驗證 |
| AC-6 / AC-7 | 只驗有重讀，沒驗重讀結果換上畫面 | 斷言最後一則的那一筆狀態變成「已確認」／「已拒絕」 |
| AC-2 | 沒測失敗問答掛在提問下 | 新增：失敗的提問帶著一筆時卡片出現 |
| NFR-1 | 沒測 HTML 內容保持文字 | 新增：內容含 `<img>` 時不產生元素、文字照原樣 |
| Orphan 1 | 處理中鎖住每一筆 | 寫進 PRD：一次只處理一筆 |
| Orphan 2 | 送出成功但重讀失敗 | 寫進 PRD：下一次讀回補上 |
| Orphan 3 | 404 自成一種錯誤但畫面不分流 | 保留：畫面如實顯示後端那一句已足夠；錯誤型別留給之後要分流的呼叫端 |
| Orphan 4 | 換對話不清錯誤 | 併入 BR-4 修正 |
