import type { AssistantAnswerNoteDto } from '~/domain/models/dto/assistant-answer-note-dto'
import type { AssistantPendingRevisionDto } from '~/domain/models/dto/assistant-pending-revision-dto'
import type { AnswerBlockVo } from '~/domain/models/vo/answer-block-vo'
import type { AssistantTurnStatus } from '~/domain/models/entities/assistant-turn-status'
import type { ConversationMessageRole } from '~/domain/models/entities/conversation-message'

/**
 * DTO：一則訊息離開 domain 的唯一形狀。
 *
 * 內容一律是**已經拆好的塊**，提問與回答都是——一句話走同一條路出來，
 * 元件因此只有一種渲染方式，不必分「這一則要不要拆」。
 *
 * 它還帶著**那一次問答走到哪裡**。一段對話讀回來可能含著一則還在寫的、一則壞掉的，
 * 而元件要靠這一個欄位決定在這一則底下畫等待、畫原因，還是什麼都不畫。
 *
 * `note` 只有回答那一則有。
 */
export class ConversationMessageDto {
  constructor(
    public readonly role: ConversationMessageRole,
    /**
     * 這一則原本的樣子。
     *
     * 拆好的塊是給眼睛看的，這一份是**給剪貼簿用的**：使用者複製一段回答之後
     * 要貼去別的地方用，而他要的是助手真正寫的那些字，不是我們替他重組出來的版本。
     */
    public readonly content: string,
    public readonly blocks: readonly AnswerBlockVo[],
    public readonly createdAt: Date,
    public readonly status: AssistantTurnStatus,
    public readonly note: AssistantAnswerNoteDto | null = null,
    /** 那一次壞掉的原因，後端給的那一句。只有失敗的那一則有內容。 */
    public readonly failureReason: string = '',
    public readonly pendingRevisions: readonly AssistantPendingRevisionDto[] = [],
  ) {}
}
