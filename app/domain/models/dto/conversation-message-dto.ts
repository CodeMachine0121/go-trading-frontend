import type { AssistantAnswerNoteDto } from '~/domain/models/dto/assistant-answer-note-dto'
import type { AnswerBlockVo } from '~/domain/models/vo/answer-block-vo'
import type { ConversationMessageRole } from '~/domain/models/entities/conversation-message'

/**
 * DTO：一則訊息離開 domain 的唯一形狀。
 *
 * 內容一律是**已經拆好的塊**，提問與回答都是——一句話走同一條路出來，
 * 元件因此只有一種渲染方式，不必分「這一則要不要拆」。
 *
 * `note` 只有剛收到的那一則回答才有。讀回來的每一則都是 `null`。
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
    public readonly note: AssistantAnswerNoteDto | null = null,
  ) {}
}
