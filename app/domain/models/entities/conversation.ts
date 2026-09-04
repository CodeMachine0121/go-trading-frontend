import { ConversationDomain } from '~/domain/models/domains/conversation-domain'
import type { ConversationMessage } from '~/domain/models/entities/conversation-message'

/**
 * Entity：一段對話的原樣。乾淨的資料模型——只有欄位與往 Domain Model 的轉換。
 */
export class Conversation {
  constructor(
    public readonly id: number,
    public readonly lastActiveAt: Date,
    /** 這一段的每一則訊息，由早到晚。 */
    public readonly messages: readonly ConversationMessage[],
  ) {}

  toDomain(): ConversationDomain {
    return new ConversationDomain(this)
  }
}
