import { MessageContentDomain } from '~/domain/models/domains/message-content-domain'
import { AssistantAnswerNoteDto } from '~/domain/models/dto/assistant-answer-note-dto'
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
 * 它也回答關於**整段**的問題：還在等一則回答嗎。那是畫面每隔幾秒要問一次的問句，
 * 而答案在這裡而不是在畫面上——畫面自己記著的旗標整頁重新載入就沒了。
 */
export class ConversationDomain {
  constructor(private readonly conversation: Conversation) {}

  /**
   * 這一段還在等一則回答嗎。
   *
   * 問的是**最後一則**而不是有沒有任何一則在跑：一段對話最多只有一則在寫
   * （後端擋著），而它必定是最後那一則。
   *
   * **壞掉的不算在等。** 沒有東西還在寫，把它算成在等會讓那一段永遠轉圈圈，
   * 而且再也送不出下一句。
   */
  get isAwaitingAnswer(): boolean {
    return this.lastMessage?.status === 'running'
  }

  toDto(): ConversationDto {
    return new ConversationDto(
      this.conversation.id,
      this.conversation.lastActiveAt,
      this.conversation.messages.map(message => this.messageDtoOf(message)),
    )
  }

  private get lastMessage(): ConversationMessage | undefined {
    return this.conversation.messages[this.conversation.messages.length - 1]
  }

  private messageDtoOf(message: ConversationMessage): ConversationMessageDto {
    return new ConversationMessageDto(
      message.role,
      message.content,
      new MessageContentDomain(message.content).toBlocks(),
      message.createdAt,
      message.status,
      this.noteOf(message),
      message.failureReason,
    )
  }

  /**
   * 一則回答下方那一行低調的說明，其餘每一則都是 `null`。
   *
   * 提問沒有附註，因為那組數字講的是**回答這一題花了什麼**，不是問這一題花了什麼。
   */
  private noteOf(message: ConversationMessage): AssistantAnswerNoteDto | null {
    return message.role === 'answer'
      ? new AssistantAnswerNoteDto(message.queryCount, message.usage, message.stoppedAtQueryLimit)
      : null
  }
}
