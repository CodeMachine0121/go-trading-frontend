import { AssistantAnswerNoteDto } from '~/domain/models/dto/assistant-answer-note-dto'
import { ConversationMessageDto } from '~/domain/models/dto/conversation-message-dto'
import type { AnswerBlockVo } from '~/domain/models/vo/answer-block-vo'

/**
 * DTO：一次問答的產出離開 domain 的唯一形狀。
 *
 * 它帶著**落在哪一段對話**，不論呼叫端有沒有指名——一句話開出一段新對話之後，
 * 呼叫端得知道接下來要往哪一段追問，而它不該自己去清單裡猜。
 */
export class AssistantAnswerDto {
  constructor(
    public readonly conversationId: number,
    public readonly blocks: readonly AnswerBlockVo[],
    public readonly queryCount: number,
    public readonly stoppedAtQueryLimit: boolean,
    public readonly usage: number,
  ) {}

  /**
   * 這次的產出變成對話串上的一則。
   *
   * 轉換寫在來源身上：一次問答變成一則訊息，讀的是這次問答的東西。
   * 時刻由呼叫端給，因為後端不回這則回答是幾點寫的——而「剛剛」是畫面才知道的事。
   */
  toMessageDto(answeredAt: Date): ConversationMessageDto {
    return new ConversationMessageDto(
      'answer',
      this.blocks,
      answeredAt,
      new AssistantAnswerNoteDto(this.queryCount, this.usage, this.stoppedAtQueryLimit),
    )
  }
}
