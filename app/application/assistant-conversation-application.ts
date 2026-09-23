import type { AssistantConversationService } from '~/domain/service/assistant-conversation-service'
import type { AssistantAnswerStartedDto } from '~/domain/models/dto/assistant-answer-started-dto'
import type { AssistantAskDto } from '~/domain/models/dto/assistant-ask-dto'
import type { ConversationDto } from '~/domain/models/dto/conversation-dto'
import type { ConversationSummaryDto } from '~/domain/models/dto/conversation-summary-dto'

/** Application：助手對話的用例編排，全程只碰 DTO。 */
export class AssistantConversationApplication {
  constructor(private readonly assistantConversationService: AssistantConversationService) {}

  /**
   * 送出一句，拿回去哪裡找答案。不可送的提問回 `null`，代表這一句連呼叫都沒有發生。
   */
  async ask(askDto: AssistantAskDto): Promise<AssistantAnswerStartedDto | null> {
    return this.assistantConversationService.ask(askDto)
  }

  async listConversations(): Promise<ConversationSummaryDto[]> {
    return this.assistantConversationService.listConversations()
  }

  async getConversation(id: number): Promise<ConversationDto> {
    return this.assistantConversationService.getConversation(id)
  }

  /** 回頭詢問：作答中每隔一段時間重讀同一段對話。 */
  async refreshConversation(id: number): Promise<ConversationDto> {
    return this.assistantConversationService.refreshConversation(id)
  }
}
