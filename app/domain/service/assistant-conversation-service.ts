import type { IAssistantConversationProxy } from '~/domain/interface/i-assistant-conversation-proxy'
import { AssistantAskDomain } from '~/domain/models/domains/assistant-ask-domain'
import type { AssistantAnswerDto } from '~/domain/models/dto/assistant-answer-dto'
import type { AssistantAskDto } from '~/domain/models/dto/assistant-ask-dto'
import type { ConversationDto } from '~/domain/models/dto/conversation-dto'
import type { ConversationSummaryDto } from '~/domain/models/dto/conversation-summary-dto'

/**
 * Domain Service：助手對話的編排。
 * 公開用例方法之間互不呼叫。
 */
export class AssistantConversationService {
  constructor(private readonly assistantConversationProxy: IAssistantConversationProxy) {}

  /**
   * 問一句，回這一次的產出。
   *
   * 判定寫在打後端之前：**不可送的提問不會產生一次呼叫**。空白提問送出去只是
   * 花錢換一句「必須寫點什麼」，而那句話這裡就說得出來。
   */
  async ask(askDto: AssistantAskDto): Promise<AssistantAnswerDto | null> {
    const assistantAskDomain = new AssistantAskDomain(askDto)
    if (!assistantAskDomain.canSend) {
      return null
    }

    const assistantAnswer = await this.assistantConversationProxy.ask(assistantAskDomain)

    return assistantAnswer.toDomain().toDto()
  }

  /** 每一段對話，最近有動靜的在最前面。一段都沒有是空清單，不是錯誤。 */
  async listConversations(): Promise<ConversationSummaryDto[]> {
    const conversationSummaries = await this.assistantConversationProxy.listConversations()

    return conversationSummaries.map(summary => summary.toDomain().toDto())
  }

  /** 指名那一段的每一則訊息，由早到晚。 */
  async getConversation(id: number): Promise<ConversationDto> {
    const conversation = await this.assistantConversationProxy.getConversation(id)

    return conversation.toDomain().toDto()
  }
}
