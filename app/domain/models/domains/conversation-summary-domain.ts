import { ConversationSummaryDto } from '~/domain/models/dto/conversation-summary-dto'
import type { ConversationSummary } from '~/domain/models/entities/conversation-summary'

/** Domain Model：對話清單上的一列。 */
export class ConversationSummaryDomain {
  constructor(private readonly conversationSummary: ConversationSummary) {}

  toDto(): ConversationSummaryDto {
    return new ConversationSummaryDto(
      this.conversationSummary.id,
      this.conversationSummary.lastActiveAt,
      this.conversationSummary.messageCount,
    )
  }
}
