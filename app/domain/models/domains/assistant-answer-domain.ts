import { MessageContentDomain } from '~/domain/models/domains/message-content-domain'
import { AssistantAnswerDto } from '~/domain/models/dto/assistant-answer-dto'
import type { AssistantAnswer } from '~/domain/models/entities/assistant-answer'

/**
 * Domain Model：一次問答的產出。
 *
 * 它負責的是「這一次往返回報了什麼」；「一則回答長什麼樣」是 MessageContentDomain 的事。
 * 兩件事會分開改變——助手多用一種結構是那邊，後端多回一個數字是這邊——所以是兩個 model。
 */
export class AssistantAnswerDomain {
  constructor(private readonly assistantAnswer: AssistantAnswer) {}

  toDto(): AssistantAnswerDto {
    return new AssistantAnswerDto(
      this.assistantAnswer.conversationId,
      new MessageContentDomain(this.assistantAnswer.answer).toBlocks(),
      this.assistantAnswer.queryCount,
      this.assistantAnswer.stoppedAtQueryLimit,
      this.assistantAnswer.usage,
    )
  }
}
