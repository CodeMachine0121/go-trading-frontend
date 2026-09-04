import type { AssistantAskDomain } from '~/domain/models/domains/assistant-ask-domain'
import type { AssistantAnswer } from '~/domain/models/entities/assistant-answer'
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
   * 問一句。沒有指名對話時後端會開一段新的，並在回答裡說出它落在哪一段。
   *
   * 三種拒絕各自以自己的領域錯誤回報：今日額度用盡、助手沒回應、指名的對話不存在。
   */
  ask(assistantAskDomain: AssistantAskDomain): Promise<AssistantAnswer>

  /** 每一段對話，最近有動靜的在最前面。一段都沒有時是空陣列，不是錯誤。 */
  listConversations(): Promise<ConversationSummary[]>

  /** 指名那一段的每一則訊息，由早到晚。不存在時以 ConversationNotFoundError 拒絕。 */
  getConversation(id: number): Promise<Conversation>
}
