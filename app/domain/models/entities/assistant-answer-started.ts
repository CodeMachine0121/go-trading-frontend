import { AssistantAnswerStartedDto } from '~/domain/models/dto/assistant-answer-started-dto'
import type { AssistantTurnStatus } from '~/domain/models/entities/assistant-turn-status'

/**
 * Entity：一句提問被收下時後端回的東西。乾淨的資料模型——只有欄位與往 DTO 的轉換。
 *
 * **它不是答案。** 助手可能來回幾十趟，要好幾分鐘；把送出的人留在線上等那麼久，
 * 正是這整套設計要移除的東西。這裡回來的是**去哪裡找答案**：落在哪一段對話、
 * 哪一則問答，以及它現在的狀態（收下的那一刻一律是進行中）。
 *
 * 它沒有 Domain Model，因為拿掉這三個欄位之後什麼都不剩——沒有計算、沒有驗證、
 * 沒有狀態轉換。「這一段還在等嗎」問的是整段對話，住在 ConversationDomain 上。
 */
export class AssistantAnswerStarted {
  constructor(
    public readonly conversationId: number,
    public readonly turnId: number,
    public readonly status: AssistantTurnStatus,
  ) {}

  toDto(): AssistantAnswerStartedDto {
    return new AssistantAnswerStartedDto(this.conversationId, this.turnId, this.status)
  }
}
