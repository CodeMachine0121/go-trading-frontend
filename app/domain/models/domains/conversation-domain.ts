import { MessageContentDomain } from '~/domain/models/domains/message-content-domain'
import { ConversationDto } from '~/domain/models/dto/conversation-dto'
import { ConversationMessageDto } from '~/domain/models/dto/conversation-message-dto'
import type { Conversation } from '~/domain/models/entities/conversation'
import type { ConversationMessage } from '~/domain/models/entities/conversation-message'

/**
 * Domain Model：一段對話。
 *
 * 讀回來的每一則都拆成塊——**提問也拆**。一句話走同一條路出來，
 * 元件因此只有一種渲染方式；否則會出現「這一則要不要拆」這個沒有好答案的分支。
 *
 * 讀回來的訊息**一律沒有附註**。那組數字只在剛收到那一刻拿得到，
 * 這裡沒有東西可以帶——不是漏了，是形狀就是這樣。
 */
export class ConversationDomain {
  constructor(private readonly conversation: Conversation) {}

  toDto(): ConversationDto {
    return new ConversationDto(
      this.conversation.id,
      this.conversation.lastActiveAt,
      this.conversation.messages.map(message => this.messageDtoOf(message)),
    )
  }

  private messageDtoOf(message: ConversationMessage): ConversationMessageDto {
    return new ConversationMessageDto(
      message.role,
      new MessageContentDomain(message.content).toBlocks(),
      message.createdAt,
    )
  }
}
