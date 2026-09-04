import { AssistantAskDto } from '~/domain/models/dto/assistant-ask-dto'
import type { ConversationMessageDto } from '~/domain/models/dto/conversation-message-dto'
import type { ConversationSummaryDto } from '~/domain/models/dto/conversation-summary-dto'
import { AssistantUnavailableError } from '~/domain/errors/assistant-unavailable-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { ConversationNotFoundError } from '~/domain/errors/conversation-not-found-error'
import { DailyUsageAllowanceExhaustedError } from '~/domain/errors/daily-usage-allowance-exhausted-error'

/**
 * 空的對話上那幾句建議提問。
 *
 * 四句剛好涵蓋助手辦得到的四類事：列清單、看行情、讀策略、算指標。
 * 少於四句會讓人以為它只會其中一件；而它會什麼在畫面上是看不出來的。
 *
 * 寫在這裡而不是元件裡，因為抽屜與整頁都要給同一組——寫兩份就會有一天只改了一邊。
 */
const SUGGESTED_PROMPTS: readonly string[] = [
  '系統認得哪些交易標的？',
  'BTCUSDT 最近一天每小時的走勢如何？',
  '我有哪些已存的策略？',
  '用一條二十根的均線看看 BTCUSDT 現在的位置',
]

/**
 * 全站共用的「目前這段對話」。
 *
 * 助手在兩個地方出現——任何畫面都叫得出來的抽屜，與專心追問用的整頁——
 * 但那是**同一段對話的兩種密度**，不是兩個功能。所以它是跨畫面的畫面狀態：
 * 在抽屜問的，展開到整頁還在；等待中切走再回來，那一次不會消失也不會重送。
 *
 * 等待狀態也在這裡，這是刻意的。它若掛在元件上，抽屜一關就沒了，
 * 回來時畫面會以為沒有人在等，然後讓使用者再送一次同樣的問題——花第二次錢。
 *
 * 沿用專案既有的做法（`useBackendHealth` 那顆燈也是這樣跨畫面共用一次檢查）。
 */
export function useAssistantConversation(
  /**
   * 要問的是哪一個 application。預設就是組裝根注入的那一個，因此畫面端照樣
   * 一個參數都不必給——它存在的唯一理由是讓這裡的編排測得到：
   * 樂觀先上提問、再試一次不重複、被拒絕時那一句回到輸入框、
   * 那一段不在了就退回新對話，這幾條都是規則，不是接線。
   */
  assistantConversationApplication = useNuxtApp().$assistantConversationApplication,
) {
  const conversationId = useState<number | null>('assistant-conversation-id', () => null)
  const messages = useState<ConversationMessageDto[]>('assistant-messages', () => [])
  const draft = useState('assistant-draft', () => '')
  const pending = useState('assistant-pending', () => false)
  const rejectionMessage = useState<string | null>('assistant-rejection', () => null)
  const conversations = useState<ConversationSummaryDto[]>('assistant-conversations', () => [])
  const conversationsErrorMessage = useState<string | null>('assistant-conversations-error', () => null)

  /** 上一次送出的那一句。再試一次重送它，因此使用者不必重打。 */
  const lastQuestion = useState('assistant-last-question', () => '')

  /** 對話串上有沒有東西。空的時候畫面要給建議提問，而不是留一片白。 */
  const isEmpty = computed(() => messages.value.length === 0)

  /**
   * 送出一句。
   *
   * 提問**先上對話串**再打後端：等待可能長達兩分鐘，那兩分鐘裡使用者得看得到自己問了什麼。
   * 被拒絕時那一句回到輸入框（可以改一改再送），而對話串上的提問留著——
   * 警示塊就長在它下面，也就是回答該出現的位置。
   */
  async function ask(question: string): Promise<void> {
    // 這裡擋一次，是因為提問**會先上對話串**：不擋的話一句空白會在畫面上留下一個
    // 空的泡泡。真正的把關在 domain（不可送的一句連呼叫都不會發生），
    // 這一道與送出鍵的可按與否一樣，是畫面自己的第一道。
    const trimmedQuestion = question.trim()
    if (trimmedQuestion === '') {
      return
    }

    const askDto = new AssistantAskDto(conversationId.value, trimmedQuestion)
    lastQuestion.value = trimmedQuestion
    messages.value = [...messages.value, askDto.toMessageDto(new Date())]
    draft.value = ''

    await sendLastQuestion()
  }

  /**
   * 重送上一次那一句。**不再往對話串上放一則提問**——那一則已經在上面了，
   * 再放一則會讓使用者以為自己問了兩次。
   */
  async function retry(): Promise<void> {
    if (lastQuestion.value === '') {
      return
    }

    await sendLastQuestion()
  }

  /** 開一段新的。**舊那段留在清單上**——這裡只是把畫面清回起點。 */
  function startNewConversation(): void {
    conversationId.value = null
    messages.value = []
    rejectionMessage.value = null
    lastQuestion.value = ''
    draft.value = ''
  }

  /**
   * 挑一段對話讀回來。讀回來的每一則**都沒有附註**——那組數字後端不會再回。
   *
   * 那一段已經不存在時（例如在別處被清掉），明說找不到並退回一段新對話：
   * 停在一個讀不到內容的對話上，使用者只會反覆按它。
   */
  async function selectConversation(id: number): Promise<void> {
    rejectionMessage.value = null

    try {
      const conversation = await assistantConversationApplication.getConversation(id)
      conversationId.value = conversation.id
      messages.value = [...conversation.messages]
      lastQuestion.value = ''
    }
    catch (error: unknown) {
      if (error instanceof ConversationNotFoundError) {
        startNewConversation()
        rejectionMessage.value = '找不到這段對話，可能已經不在了。已經替你開一段新的。'
        return
      }

      rejectionMessage.value = readableMessageOf(error)
    }
  }

  /**
   * 重讀對話清單。
   *
   * **取不到與一段都沒有是兩件事**，所以錯誤與空清單是兩個狀態：
   * 用一個空清單同時表示兩者，會讓後端掛掉時看起來像「你還沒問過任何問題」。
   */
  async function loadConversations(): Promise<void> {
    conversationsErrorMessage.value = null

    try {
      conversations.value = await assistantConversationApplication.listConversations()
    }
    catch (error: unknown) {
      conversations.value = []
      conversationsErrorMessage.value = readableMessageOf(error)
    }
  }

  /**
   * 真正打後端的那一段，送出與再試一次共用。
   * 分開寫會讓「成功要做什麼、失敗要做什麼」有兩份，然後其中一份會忘記更新。
   */
  async function sendLastQuestion(): Promise<void> {
    pending.value = true
    rejectionMessage.value = null

    try {
      const answerDto = await assistantConversationApplication.ask(
        new AssistantAskDto(conversationId.value, lastQuestion.value))

      // 判定不可送時 application 回 null，一次呼叫都沒有發生。走到這裡就是有答案。
      if (answerDto === null) {
        return
      }

      conversationId.value = answerDto.conversationId
      messages.value = [...messages.value, answerDto.toMessageDto(new Date())]
      await loadConversations()
    }
    catch (error: unknown) {
      rejectionMessage.value = readableMessageOf(error)
      draft.value = lastQuestion.value
    }
    finally {
      pending.value = false
    }
  }

  /**
   * 一次失敗要對使用者說的那句話。
   *
   * 四種分開，因為**使用者要做的事不同**：等到重置、稍後再試、去啟動後端、或這是個意外。
   * 這句話寫在這裡而不是元件上——抽屜與整頁都要說同一句，寫兩次就會有兩種說法。
   * 後端已經說明原因的那幾種一律如實轉達，沿用操作台既有的做法。
   */
  function readableMessageOf(error: unknown): string {
    if (error instanceof DailyUsageAllowanceExhaustedError) {
      return error.message
    }

    if (error instanceof AssistantUnavailableError) {
      return error.message
    }

    if (error instanceof BackendUnreachableError) {
      return '連不上後端 go-trading API，請確認它已啟動，且本站來源在它的 CORS_ALLOWED_ORIGINS 名單內。'
    }

    return error instanceof Error ? error.message : '與助手對話時發生未預期的錯誤。'
  }

  return {
    suggestedPrompts: SUGGESTED_PROMPTS,
    conversationId,
    messages,
    draft,
    pending,
    rejectionMessage,
    conversations,
    conversationsErrorMessage,
    isEmpty,
    ask,
    retry,
    startNewConversation,
    selectConversation,
    loadConversations,
  }
}
