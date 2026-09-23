import type { IAssistantConversationProxy } from '~/domain/interface/i-assistant-conversation-proxy'
import type { AssistantAskDomain } from '~/domain/models/domains/assistant-ask-domain'
import { AssistantAnswerStarted } from '~/domain/models/entities/assistant-answer-started'
import { assistantTurnStatusOf } from '~/domain/models/entities/assistant-turn-status'
import { Conversation } from '~/domain/models/entities/conversation'
import { ConversationMessage } from '~/domain/models/entities/conversation-message'
import type { ConversationMessageRole } from '~/domain/models/entities/conversation-message'
import { ConversationSummary } from '~/domain/models/entities/conversation-summary'
import { AssistantAnswerInProgressError } from '~/domain/errors/assistant-answer-in-progress-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { ConversationNotFoundError } from '~/domain/errors/conversation-not-found-error'
import { DailyUsageAllowanceExhaustedError } from '~/domain/errors/daily-usage-allowance-exhausted-error'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'

const CHAT_ENDPOINT = '/chat'
const CONVERSATIONS_ENDPOINT = '/chat/conversations'

/**
 * 後端用這三個狀態碼分別表示「沒有那一段對話」、「今日額度用盡」與
 * 「那一段上前一則還在寫」。只有這裡需要知道它們——領域與畫面一律只認錯誤型別。
 *
 * **助手沒回應不再是一個狀態碼。** 後端收下提問就回，那時它還沒去問助手；
 * 助手不可用會變成那一則的失敗原因，從對話裡讀得到。
 */
const NOT_FOUND_STATUS = 404
const ALLOWANCE_EXHAUSTED_STATUS = 429
const ANSWER_IN_PROGRESS_STATUS = 409

/** 後端回傳的原始 wire 形狀，只存在於本檔內。 */
type AssistantAnswerStartedWire = {
  conversationId: number
  turnId: number
  status: string
}

type ConversationSummaryWire = {
  id: number
  lastActiveAt: string
  messageCount: number
}

type ConversationMessageWire = {
  role: string
  content: string
  createdAt: string
  status: string
  failureReason?: string
  queryCount?: number
  stoppedAtQueryLimit?: boolean
  usage?: number
}

type ConversationWire = {
  id: number
  lastActiveAt: string
  messages: ConversationMessageWire[]
}

/**
 * Proxy：打助手的三條路徑，把時刻正規化成瞬間，並把三種拒絕從一般的拒絕裡分出來。
 *
 * 分出來的理由是**使用者要做的事不同**：等到明天、開一段新對話、等一下前一則。
 * 三者若都以同一種錯誤上去，畫面就只能講一句含混的話，而含混的話會讓人
 * 對著一個要等到明天的拒絕重試一整個小時。
 *
 * 「後端拒絕 vs 後端自己壞了 vs 連不上」那一層沿用 BackendApiProxy 的翻譯，
 * 這裡只在它之上再細分。
 *
 * **助手不可用已經不從這裡出來。** 後端收下提問就回，那時它還沒去問助手；
 * 助手不可用會變成那一則的失敗原因，從讀回來的對話裡看得到。
 */
export class AssistantConversationProxy extends BackendApiProxy implements IAssistantConversationProxy {
  async ask(assistantAskDomain: AssistantAskDomain): Promise<AssistantAnswerStarted> {
    try {
      const startedWire = await this.requestBackend<AssistantAnswerStartedWire>(CHAT_ENDPOINT, {
        method: 'POST',
        body: assistantAskDomain.conversationId === null
          ? { question: assistantAskDomain.question }
          : {
              conversationId: assistantAskDomain.conversationId,
              question: assistantAskDomain.question,
            },
      })

      return new AssistantAnswerStarted(
        startedWire.conversationId,
        startedWire.turnId,
        assistantTurnStatusOf(startedWire.status),
      )
    }
    catch (error: unknown) {
      throw this.assistantFailureOf(error)
    }
  }

  async listConversations(): Promise<ConversationSummary[]> {
    const summaryWires = await this.requestBackend<ConversationSummaryWire[]>(CONVERSATIONS_ENDPOINT)

    return summaryWires.map(summaryWire => new ConversationSummary(
      summaryWire.id,
      new Date(summaryWire.lastActiveAt),
      summaryWire.messageCount,
    ))
  }

  /** 讀一段對話——使用者挑了它，正在等它出現。 */
  async getConversation(id: number): Promise<Conversation> {
    return this.readConversation(id, false)
  }

  /**
   * 回頭詢問：助手作答中，畫面每隔一段時間重讀一次同一段對話。
   *
   * 與 `getConversation` 是同一條路、同一份翻譯，只差在它是**背景的**——
   * 使用者沒有按任何東西，而那一則的「正在查…」本來就說得出它在等。
   */
  async refreshConversation(id: number): Promise<Conversation> {
    return this.readConversation(id, true)
  }

  private async readConversation(id: number, background: boolean): Promise<Conversation> {
    try {
      const conversationWire = await this.requestBackend<ConversationWire>(
        `${CONVERSATIONS_ENDPOINT}/${id}`, { background })

      return new Conversation(
        conversationWire.id,
        new Date(conversationWire.lastActiveAt),
        conversationWire.messages.map(messageWire => new ConversationMessage(
          this.roleOf(messageWire.role),
          messageWire.content,
          new Date(messageWire.createdAt),
          assistantTurnStatusOf(messageWire.status),
          messageWire.failureReason ?? '',
          messageWire.queryCount ?? 0,
          messageWire.stoppedAtQueryLimit ?? false,
          messageWire.usage ?? 0,
        )),
      )
    }
    catch (error: unknown) {
      throw this.assistantFailureOf(error)
    }
  }

  /**
   * 一則訊息是誰說的。認不出來的一律當助手說的——**寧可把來歷不明的一則畫成回答，
   * 也不要畫成使用者說過的話**：後者是憑空替使用者發言，比畫錯位置嚴重得多。
   */
  private roleOf(role: string): ConversationMessageRole {
    return role === 'ask' ? 'ask' : 'answer'
  }

  /**
   * 把一次失敗翻成領域說得出來的話。
   *
   * 寫在一處是因為問一句與讀一段對話都會撞到「沒有那一段」，兩邊欠使用者同一句話。
   * 認不出來的一律原樣丟出去，交給 BackendApiProxy 已經分好的那三類。
   */
  private assistantFailureOf(error: unknown): unknown {
    if (!(error instanceof BackendRequestRejectedError)) {
      return error
    }

    if (error.status === NOT_FOUND_STATUS) {
      return new ConversationNotFoundError(error.message, { cause: error })
    }

    if (error.status === ALLOWANCE_EXHAUSTED_STATUS) {
      return new DailyUsageAllowanceExhaustedError(error.message, { cause: error })
    }

    if (error.status === ANSWER_IN_PROGRESS_STATUS) {
      return new AssistantAnswerInProgressError(error.message, { cause: error })
    }

    return error
  }
}
