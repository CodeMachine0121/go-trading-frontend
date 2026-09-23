import type { AssistantAskDomain } from '~/domain/models/domains/assistant-ask-domain'
import type { AssistantAnswerStarted } from '~/domain/models/entities/assistant-answer-started'
import type { Conversation } from '~/domain/models/entities/conversation'
import type { ConversationSummary } from '~/domain/models/entities/conversation-summary'

/**
 * 介面以「能力」命名，不以供應商命名。同一個外部資源一個 Proxy——
 * 問一句、列出對話、讀一段對話都收在這裡，不拆成 reader / writer。
 *
 * 問一句一律收**已判定可送**的 `AssistantAskDomain`，實作端因此不必重覆判定，
 * 也不可能有一條把空白提問送出去的路徑。
 * 實作在 app/infrastructure/proxy/assistant-conversation-proxy.ts。
 */
export interface IAssistantConversationProxy {
  /**
   * 問一句，拿回**去哪裡找答案**——不是答案本身。
   *
   * 後端收下就回，不等助手寫完：一次回答可能來回幾十趟、長達數分鐘。
   * 沒有指名對話時後端會開一段新的，並說出它落在哪一段。
   *
   * 三種拒絕各自以自己的領域錯誤回報：今日額度用盡、指名的對話不存在、
   * 那一段對話上前一則還在寫。**助手沒回應不在其中**——那要等它真的去問才知道，
   * 而那時這一次呼叫早就結束了；它會變成那一則的失敗原因，從對話裡讀得到。
   */
  ask(assistantAskDomain: AssistantAskDomain): Promise<AssistantAnswerStarted>

  /** 每一段對話，最近有動靜的在最前面。一段都沒有時是空陣列，不是錯誤。 */
  listConversations(): Promise<ConversationSummary[]>

  /** 指名那一段的每一則訊息，由早到晚。不存在時以 ConversationNotFoundError 拒絕。 */
  getConversation(id: number): Promise<Conversation>

  /** 回頭詢問：與 `getConversation` 同一段對話，但那是畫面自己定期做的，不是使用者在等的。 */
  refreshConversation(id: number): Promise<Conversation>
}
