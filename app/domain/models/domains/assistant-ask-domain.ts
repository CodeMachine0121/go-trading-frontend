import type { AssistantAskDto } from '~/domain/models/dto/assistant-ask-dto'

/**
 * Domain Model：一句提問，以及它能不能送出去。
 *
 * 「去掉前後空白後為空就不可送」是規則而不是版面問題，所以它在這裡，
 * 不在送出鍵上。送出鍵只是把答案接到 `disabled`。
 *
 * 它同時是唯一一條通往「問一句」的路：proxy 收的是這個 model，
 * 因此不存在一條繞過判定、把空白送到後端的送出路徑——那是純粹浪費的一次呼叫。
 */
export class AssistantAskDomain {
  /** 去掉前後空白之後的提問。留下的就是這一份，不是使用者打的原樣。 */
  readonly question: string

  readonly conversationId: number | null

  constructor(askDto: AssistantAskDto) {
    this.question = askDto.question.trim()
    this.conversationId = askDto.conversationId
  }

  /** 這一句送不送得出去。 */
  get canSend(): boolean {
    return this.question !== ''
  }
}
