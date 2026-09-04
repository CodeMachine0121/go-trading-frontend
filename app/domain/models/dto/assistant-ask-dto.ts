import { MessageContentDomain } from '~/domain/models/domains/message-content-domain'
import { ConversationMessageDto } from '~/domain/models/dto/conversation-message-dto'

/**
 * DTO：問一句交給 domain 的形狀。
 *
 * 對話識別碼是 `null` 就是「還沒有一段對話」，也就是這一句會開出新的一段。
 * 一個形狀同時涵蓋開新的與接著問，因此關於提問的規則只寫一次。
 */
export class AssistantAskDto {
  constructor(
    public readonly conversationId: number | null,
    public readonly question: string,
  ) {}

  /**
   * 這一句變成對話串上的一則。
   *
   * 轉換寫在來源身上。它存在的理由是**提問要在送出的那一刻就出現在對話串上**，
   * 而不是等回答回來才一起出現——等待可能長達兩分鐘，那兩分鐘裡使用者得看得到
   * 自己問了什麼。時刻由呼叫端給：「剛剛」是畫面才知道的事。
   */
  toMessageDto(askedAt: Date): ConversationMessageDto {
    return new ConversationMessageDto(
      'ask',
      new MessageContentDomain(this.question).toBlocks(),
      askedAt,
    )
  }
}
