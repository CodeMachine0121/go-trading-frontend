import { AssistantAnswerDomain } from '~/domain/models/domains/assistant-answer-domain'

/**
 * Entity：一次問答的產出，後端回來的原樣。乾淨的資料模型——
 * 只有欄位與往 Domain Model 的轉換。
 *
 * `answer` 是**一整段原文**。把它拆成小標與條列是領域行為，住在 AssistantAnswerDomain。
 *
 * 後面三個數字描述的是**這一次往返**而不是這則回答的內容：查了幾次、有沒有因為
 * 用完查詢次數而提早收尾、動用多少份量。它們只在這一刻拿得到——
 * 之後從對話裡讀回這則回答時，後端不會再帶它們。
 */
export class AssistantAnswer {
  constructor(
    public readonly conversationId: number,
    public readonly answer: string,
    public readonly queryCount: number,
    public readonly stoppedAtQueryLimit: boolean,
    public readonly usage: number,
  ) {}

  toDomain(): AssistantAnswerDomain {
    return new AssistantAnswerDomain(this)
  }
}
