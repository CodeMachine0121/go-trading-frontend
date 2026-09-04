import { ConversationSummaryDomain } from '~/domain/models/domains/conversation-summary-domain'

/**
 * Entity：對話清單上一列的原樣。
 *
 * 它只帶「認得出是哪一段」需要的東西，不帶訊息內容——清單是用來挑的，
 * 把每一段的每一則都拉進來只會讓開清單這件事變慢，而使用者一次只讀一段。
 */
export class ConversationSummary {
  constructor(
    public readonly id: number,
    public readonly lastActiveAt: Date,
    public readonly messageCount: number,
  ) {}

  toDomain(): ConversationSummaryDomain {
    return new ConversationSummaryDomain(this)
  }
}
