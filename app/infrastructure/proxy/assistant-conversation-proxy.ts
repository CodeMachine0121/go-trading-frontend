import type { IAssistantConversationProxy } from '~/domain/interface/i-assistant-conversation-proxy'
import type { AssistantAskDomain } from '~/domain/models/domains/assistant-ask-domain'
import { AssistantAnswer } from '~/domain/models/entities/assistant-answer'
import { Conversation } from '~/domain/models/entities/conversation'
import { ConversationMessage } from '~/domain/models/entities/conversation-message'
import type { ConversationMessageRole } from '~/domain/models/entities/conversation-message'
import { ConversationSummary } from '~/domain/models/entities/conversation-summary'
import { AssistantUnavailableError } from '~/domain/errors/assistant-unavailable-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { ConversationNotFoundError } from '~/domain/errors/conversation-not-found-error'
import { DailyUsageAllowanceExhaustedError } from '~/domain/errors/daily-usage-allowance-exhausted-error'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'

const CHAT_ENDPOINT = '/chat'
const CONVERSATIONS_ENDPOINT = '/chat/conversations'

/**
 * 後端用這三個狀態碼分別表示「沒有那一段對話」、「今日額度用盡」與「助手沒回應」。
 * 只有這裡需要知道它們——領域與畫面一律只認錯誤型別。
 */
const NOT_FOUND_STATUS = 404
const ALLOWANCE_EXHAUSTED_STATUS = 429
const ASSISTANT_UNAVAILABLE_STATUS = 503

/** 後端回傳的原始 wire 形狀，只存在於本檔內。 */
type AssistantAnswerWire = {
  conversationId: number
  answer: string
  queryCount: number
  stoppedAtQueryLimit: boolean
  usage: number
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
}

type ConversationWire = {
  id: number
  lastActiveAt: string
  messages: ConversationMessageWire[]
}

/**
 * Proxy：打助手的三條路徑，把時刻正規化成瞬間，並把三種拒絕從一般的拒絕裡分出來。
 *
 * 分出來的理由是**使用者要做的事不同**：等到明天、稍後再試、開一段新對話。
 * 三者若都以同一種錯誤上去，畫面就只能講一句含混的話，而含混的話會讓人
 * 對著一個要等到明天的拒絕重試一整個小時。
 *
 * 「後端拒絕 vs 後端自己壞了 vs 連不上」那一層沿用 BackendApiProxy 的翻譯，
 * 這裡只在它之上再細分。助手沒回應時後端回的是伺服器級的狀態碼，
 * 因此那一種要從 BackendServerError 認出來，不是從一般的拒絕。
 */
export class AssistantConversationProxy extends BackendApiProxy implements IAssistantConversationProxy {
  async ask(assistantAskDomain: AssistantAskDomain): Promise<AssistantAnswer> {
    try {
      const answerWire = await this.requestBackend<AssistantAnswerWire>(CHAT_ENDPOINT, {
        method: 'POST',
        body: assistantAskDomain.conversationId === null
          ? { question: assistantAskDomain.question }
          : {
              conversationId: assistantAskDomain.conversationId,
              question: assistantAskDomain.question,
            },
      })

      return new AssistantAnswer(
        answerWire.conversationId,
        answerWire.answer,
        answerWire.queryCount,
        answerWire.stoppedAtQueryLimit,
        answerWire.usage,
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

  async getConversation(id: number): Promise<Conversation> {
    try {
      const conversationWire = await this.requestBackend<ConversationWire>(
        `${CONVERSATIONS_ENDPOINT}/${id}`)

      return new Conversation(
        conversationWire.id,
        new Date(conversationWire.lastActiveAt),
        conversationWire.messages.map(messageWire => new ConversationMessage(
          this.roleOf(messageWire.role),
          messageWire.content,
          new Date(messageWire.createdAt),
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
    // 助手沒回應時後端回的是伺服器級的狀態碼，所以那一種要從這裡認出來。
    // 其餘五百開頭的一律留給後端自己的故障——後端讀不到資料庫不是助手不在，
    // 說成助手不在會讓人一直等一位其實好好的助手。
    if (error instanceof BackendServerError) {
      return error.status === ASSISTANT_UNAVAILABLE_STATUS
        ? new AssistantUnavailableError(error.message, { cause: error })
        : error
    }

    if (!(error instanceof BackendRequestRejectedError)) {
      return error
    }

    if (error.status === NOT_FOUND_STATUS) {
      return new ConversationNotFoundError(error.message, { cause: error })
    }

    if (error.status === ALLOWANCE_EXHAUSTED_STATUS) {
      return new DailyUsageAllowanceExhaustedError(error.message, { cause: error })
    }

    return error
  }
}
