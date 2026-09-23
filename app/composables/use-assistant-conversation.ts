import { AssistantAskDto } from '~/domain/models/dto/assistant-ask-dto'
import { ConversationMessageDto } from '~/domain/models/dto/conversation-message-dto'
import type { ConversationSummaryDto } from '~/domain/models/dto/conversation-summary-dto'
import { AssistantAnswerInProgressError } from '~/domain/errors/assistant-answer-in-progress-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { ConversationNotFoundError } from '~/domain/errors/conversation-not-found-error'
import { DailyUsageAllowanceExhaustedError } from '~/domain/errors/daily-usage-allowance-exhausted-error'

/**
 * 空的對話上那幾句建議提問。
 *
 * 四句剛好涵蓋助手辦得到的四類事：列清單、看行情、讀策略腳本、算指標。
 * 少於四句會讓人以為它只會其中一件；而它會什麼在畫面上是看不出來的。
 *
 * 寫在這裡而不是元件裡，因為抽屜與整頁都要給同一組——寫兩份就會有一天只改了一邊。
 */
const SUGGESTED_PROMPTS: readonly string[] = [
  '系統認得哪些交易標的？',
  'BTCUSDT 最近一天每小時的走勢如何？',
  '我有哪些已存的策略腳本？',
  '用一條二十根的均線看看 BTCUSDT 現在的位置',
]

/**
 * 有一則回答在寫的時候，多久回頭問一次後端。
 *
 * 最快的回答約兩秒，最慢的（拼一份交易策略、回測、改、再回測）好幾分鐘。
 * 兩秒既不會讓快的那種看起來慢，累積起來也不算多。
 *
 * 它是輪詢而不是推播，因為這個專案沒有長連線——而為了一顆轉圈圈開一條，
 * 正是這個切片在移除的那種東西。
 */
const POLL_INTERVAL_MILLISECONDS = 2000

/**
 * 全站共用的「目前這段對話」。
 *
 * 助手在兩個地方出現——任何畫面都叫得出來的抽屜，與專心追問用的整頁——
 * 但那是**同一段對話的兩種密度**，不是兩個功能。所以它是跨畫面的畫面狀態：
 * 在抽屜問的，展開到整頁還在。
 *
 * **等待狀態不在這裡，這是刻意的。** 它以前是一個 `useState` 的旗標，整頁重新載入
 * 就沒了——而使用者最可能重整的時機，正是他等最久、最懷疑畫面壞掉的那一刻。
 * 現在它是一個問句：**這一段對話最後一則是不是還在寫**，而答案來自後端。
 * 重整、關分頁、切走再回來，看到的都是同一件事。
 */
export function useAssistantConversation(
  /**
   * 要問的是哪一個 application。預設就是組裝根注入的那一個，因此畫面端照樣
   * 一個參數都不必給——它存在的唯一理由是讓這裡的編排測得到：
   * 樂觀先上提問、答完自己補上、被拒絕時那一句回到輸入框、
   * 那一段不在了就退回新對話，這幾條都是規則，不是接線。
   */
  assistantConversationApplication = useNuxtApp().$assistantConversationApplication,
  /**
   * 記住正在看哪一段的地方。整頁重新載入之後要回到同一段，
   * 而 `useState` 撐不過那一下。
   */
  currentConversationPreferenceProxy = useNuxtApp().$currentConversationPreferenceProxy,
) {
  const conversationId = useState<number | null>('assistant-conversation-id', () => null)
  const messages = useState<ConversationMessageDto[]>('assistant-messages', () => [])
  const draft = useState('assistant-draft', () => '')
  const conversations = useState<ConversationSummaryDto[]>('assistant-conversations', () => [])
  const conversationsErrorMessage = useState<string | null>('assistant-conversations-error', () => null)

  /**
   * 送不出去那一類的說法：今日額度用盡、連不上後端、前一則還在寫。
   *
   * **送出去了但沒寫完是另一回事**——那一則自己會帶著後端給的原因回來，
   * 見下面的 `rejectionMessage`。
   */
  const sendRejectionMessage = useState<string | null>('assistant-send-rejection', () => null)

  /** 上一次送出的那一句。再試一次重送它，因此使用者不必重打。 */
  const lastQuestion = useState('assistant-last-question', () => '')

  /**
   * 每一次去讀一段對話都領一個號碼；讀回來時號碼已經不是最新的，就把結果丟掉。
   *
   * 取消得掉的只有「排好的下一次」，取消不掉「已經送出去的那一次」。少了這一道，
   * 使用者換到另一段之後，前一段慢一步回來的結果會把他正在看的那一段換掉——
   * 而畫面上那一段的識別碼還是他挑的那一個，兩者從此對不起來。
   */
  const latestReadTicket = useState('assistant-read-ticket', () => 0)

  function takeReadTicket(): number {
    latestReadTicket.value += 1

    return latestReadTicket.value
  }

  /** 對話串上有沒有東西。空的時候畫面要給建議提問，而不是留一片白。 */
  const isEmpty = computed(() => messages.value.length === 0)

  /**
   * 助手還在寫嗎。
   *
   * **問的是最後一則的狀態，不是一個我們自己記著的旗標。** 一段對話最多只有一則
   * 在寫（後端擋著），而它必定是最後那一則。這一行就是「重新整理之後等待還在」
   * 的全部原因：重整之後這串訊息是從後端讀回來的，狀態也是。
   */
  const pending = computed(() => lastMessage.value?.status === 'running')

  /**
   * 這一塊要說的那句話：送不出去的那一句，或是送出去了但沒寫完的那一句。
   *
   * 兩者長得一樣、擺在同一個位置（回答該出現的地方），差別只在**話從哪裡來**——
   * 前者是這台瀏覽器判斷出來的，後者是後端寫在那一則上的。合成一個值是因為
   * 同一個位置一次只說一句；分成兩個會出現兩塊疊在一起的警示。
   *
   * 送不出去的優先，因為它講的是使用者**剛剛**那個動作。
   */
  const rejectionMessage = computed(
    () => sendRejectionMessage.value ?? failedAnswerReason.value)

  /**
   * 送出一句。
   *
   * 提問**先上對話串**再打後端：一次回答可能好幾分鐘，那幾分鐘裡使用者得看得到
   * 自己問了什麼。後端收下之後把那一段整個讀回來——樂觀放上去的那一則會被
   * 後端那一份取代，狀態從此由後端說了算。
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
    stopPolling()
    conversationId.value = null
    messages.value = []
    sendRejectionMessage.value = null
    lastQuestion.value = ''
    draft.value = ''
    currentConversationPreferenceProxy.forgetCurrentConversationId()
  }

  /**
   * 挑一段對話讀回來。
   *
   * 那一段已經不存在時（例如在別處被清掉），明說找不到並退回一段新對話：
   * 停在一個讀不到內容的對話上，使用者只會反覆按它。
   */
  async function selectConversation(id: number): Promise<void> {
    stopPolling()
    sendRejectionMessage.value = null

    const readTicket = takeReadTicket()

    try {
      const conversation = await assistantConversationApplication.getConversation(id)
      if (readTicket !== latestReadTicket.value) {
        return
      }

      conversationId.value = conversation.id
      messages.value = [...conversation.messages]
      currentConversationPreferenceProxy.writeCurrentConversationId(conversation.id)

      // 再試一次要送的是**這一段最後那一句壞掉的提問**，而它現在就寫在畫面上。
      // 整頁重新載入之後記在畫面狀態裡的那一句早就沒了，而這正是使用者最可能
      // 按再試一次的時刻——他好幾分鐘後才回來，看到那一句壞了。
      //
      // 沒壞的那幾段清成空的：一段答完的對話沒有什麼好重送的，而留著上一段的
      // 那一句會讓再試一次把它送到這一段來。
      lastQuestion.value = questionToRetryOf(conversation.messages)
    }
    catch (error: unknown) {
      if (error instanceof ConversationNotFoundError) {
        startNewConversation()
        sendRejectionMessage.value = '找不到這段對話，可能已經不在了。已經替你開一段新的。'
        return
      }

      sendRejectionMessage.value = readableMessageOf(error)
    }

    // 接上回頭詢問——**成功與失敗都要**。`pending` 的值可能整段沒有變過
    // （前一段也在寫），所以那個 watcher 不會被叫醒，而進來的時候已經把排好的
    // 那一次取消掉了。換過去失敗時畫面仍停在本來那一段，而它還在寫：
    // 不接回去的話，那個答案永遠不會出現。
    schedulePoll()
  }

  /**
   * 回到上次看的那一段。
   *
   * 這是「重新整理之後還看得到」真正發生的地方：`useState` 撐不過整頁重新載入，
   * 所以哪一段要靠瀏覽器記著。讀回來之後，如果最後一則還在寫，
   * 下面那個 watcher 會自己開始回頭詢問。
   *
   * 已經有一段在畫面上時什麼都不做——使用者剛按過開新對話或剛挑過一段，
   * 把他拉回舊的那一段等於把他的選擇收回去。
   */
  async function resumeCurrentConversation(): Promise<void> {
    if (conversationId.value !== null) {
      return
    }

    const rememberedConversationId = currentConversationPreferenceProxy.readCurrentConversationId()
    if (rememberedConversationId === null) {
      return
    }

    await selectConversation(rememberedConversationId)
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
    sendRejectionMessage.value = null

    try {
      const startedDto = await assistantConversationApplication.ask(
        new AssistantAskDto(conversationId.value, lastQuestion.value))

      // 判定不可送時 application 回 null，一次呼叫都沒有發生。
      if (startedDto === null) {
        return
      }

      conversationId.value = startedDto.conversationId
      currentConversationPreferenceProxy.writeCurrentConversationId(startedDto.conversationId)

      // 後端只說了「收下了」。那一段真正長什麼樣——包含這一則的狀態——
      // 要讀回來才知道。
      await refreshCurrentConversation()

      // 接上回頭詢問。**不能只靠那個 watcher**：樂觀放上去的那一則提問一上對話串
      // 就已經讓「還在寫嗎」變成是了，而那一刻還沒有對話識別碼可以問。
      // 等識別碼拿到手，`pending` 的值早就不再變化，watcher 也就不會再醒來。
      schedulePoll()

      await loadConversations()
    }
    catch (error: unknown) {
      sendRejectionMessage.value = readableMessageOf(error)
      draft.value = lastQuestion.value
      takeBackTheOptimisticAsk()
    }
  }

  /**
   * 收回那一則樂觀放上去的提問所做的假設。
   *
   * 放上去的時候它說「後端收下了，正在寫」。後端沒收下的時候那句話是假的，
   * 而且是**最貴的一種假的**：等待是由它決定的，所以畫面會永遠轉圈圈；
   * 警示塊只在不等的時候出現，所以那句原因看不到；再試一次長在警示塊上，
   * 所以按不到；送出鍵在等待中停用，所以也送不出下一句。使用者只剩重整一條路。
   *
   * 那一則**留在畫面上**——它就是警示塊要長在下面的那一句。變的只有它不再宣稱
   * 有人在寫。原因不寫進它身上：那是這台瀏覽器的判斷，不是後端寫在那一列上的話。
   */
  function takeBackTheOptimisticAsk(): void {
    const lastIndex = messages.value.length - 1
    const optimisticAsk = messages.value[lastIndex]
    if (optimisticAsk === undefined || optimisticAsk.status !== 'running') {
      return
    }

    messages.value = [
      ...messages.value.slice(0, lastIndex),
      new ConversationMessageDto(
        optimisticAsk.role,
        optimisticAsk.content,
        optimisticAsk.blocks,
        optimisticAsk.createdAt,
        'failed',
      ),
    ]
  }

  /**
   * 把目前這段對話從後端整個讀回來。
   *
   * 整段讀而不是只讀最後一則，因為後端沒有「只給我最後一則」這條路，
   * 而這個專案是單人使用、對話不長。要優化時該加的是後端那條路，不是這裡的快取。
   *
   * `polling` 分開的是**誰在等**：剛送出一句之後讀回來的那一次是使用者在等的，
   * 回頭詢問則是畫面自己每隔一段時間做的——後者不該讓頂端那條進度條亮起來。
   */
  async function refreshCurrentConversation(polling = false): Promise<void> {
    const currentConversationId = conversationId.value
    if (currentConversationId === null) {
      return
    }

    const readTicket = takeReadTicket()

    try {
      const conversation = polling
        ? await assistantConversationApplication.refreshConversation(currentConversationId)
        : await assistantConversationApplication.getConversation(currentConversationId)

      // 這一次讀出去之後使用者可能已經換到別段了。
      if (readTicket !== latestReadTicket.value) {
        return
      }

      messages.value = [...conversation.messages]
    }
    catch {
      // **讀不回來不吵他。** 答案還在後端那邊寫著，這一次沒讀到不代表它不見了；
      // 下一次醒來再試一次，後端回來時畫面自己就補上了。
      //
      // 跳一塊紅色警示比什麼都不說更糟：它上面那顆再試一次會**再送一次同一句**，
      // 也就是再花一次錢，去修一件根本沒壞的事。而等待本身已經誠實地說了
      // 「還不知道」。
    }
  }

  /**
   * 這一段裡「再試一次」該重送的那一句：最後那一則壞掉時，它自己的內容。
   * 其餘一律是空的——沒有壞掉就沒有什麼好重送的。
   */
  function questionToRetryOf(conversationMessages: readonly ConversationMessageDto[]): string {
    const lastConversationMessage = conversationMessages[conversationMessages.length - 1]

    return lastConversationMessage?.status === 'failed' && lastConversationMessage.role === 'ask'
      ? lastConversationMessage.content
      : ''
  }

  /** 對話串上最後那一則。等待與失敗說明都只看它。 */
  const lastMessage = computed<ConversationMessageDto | undefined>(
    () => messages.value[messages.value.length - 1])

  /** 最後一則是壞掉的那一種時，後端給的那句原因；否則是 `null`。 */
  const failedAnswerReason = computed<string | null>(() => {
    const message = lastMessage.value

    return message?.status === 'failed' && message.failureReason !== ''
      ? message.failureReason
      : null
  })

  /**
   * 有一則在寫的時候每隔幾秒回頭問一次，寫完或壞掉就停。
   *
   * **它是一條共用的迴圈，不是每個呼叫端各起一條。** 抽屜與整頁可能同時活著，
   * 而它們談的是同一段對話——各起一條的話同一秒會打兩次後端問同一件事。
   * 所以那個計時器與對話本身一樣住在共用狀態裡。
   *
   * **它自己會停。** 每一次醒來都重新問一次「還在寫嗎」，不是的話就不再排下一次。
   * 這比「在某個地方清掉它」可靠：清的那個地方總有一天會漏掉一條路徑，
   * 而一條自己不會停的迴圈會一直打後端，沒有人會發現。
   *
   * **沒有東西在跑就完全不排。** 一段全部答完的對話不該每隔兩秒打一次後端。
   */
  const pollHandle = useState<ReturnType<typeof setTimeout> | null>(
    'assistant-poll-handle', () => null)

  /**
   * 排下一次回頭詢問，除非沒有必要或已經排過。
   *
   * **兩道判斷都在這裡，不在呼叫端。** 呼叫它的地方有好幾個（狀態變了、剛挑了
   * 一段對話），而每個呼叫端各自判斷一次，總有一天其中一個會判斷錯——
   * 錯的方向不是多打一次後端，就是一段還在寫的對話從此沒有人去問它。
   */
  function schedulePoll(): void {
    // 沒有對話可以讀的時候也不排。有兩種時候會這樣：一句剛送出去、樂觀的那一則
    // 已經上了對話串但後端還沒回覆識別碼（這一種等識別碼到手時由送出那條路接上），
    // 以及送出失敗留下的那一種——後者少了這一道，就會是一條每兩秒醒來、
    // 發現無事可做、再排下一次的迴圈，活到這個分頁關掉為止。
    //
    // 伺服器端一律不排。今天它排不到——伺服器算出來的那一份對話串是空的，
    // 所以「還在寫嗎」恆為否——但那是巧合而不是保證：哪一天改成由伺服器先把
    // 對話讀好，這裡就會在 Node 上開一個計時器，把一個序列化不了的東西塞進
    // 送去瀏覽器的那包狀態裡，順便讓伺服器自己去輪詢後端。
    if (!import.meta.client
      || pollHandle.value !== null
      || !pending.value
      || conversationId.value === null) {
      return
    }

    pollHandle.value = setTimeout(() => {
      pollHandle.value = null

      if (!pending.value) {
        return
      }

      void refreshCurrentConversation(true).then(schedulePoll)
    }, POLL_INTERVAL_MILLISECONDS)
  }

  /**
   * 把已經排好的那一次取消掉。
   *
   * 用在**離開這一段對話**的時候：那一次醒來要問的是一段使用者已經不在看的對話。
   * 迴圈本來就會自己停（下一次醒來發現沒有東西在寫），但留著它意味著接下來兩秒內
   * 排不進新的一次——而那正好是使用者挑了另一段還在寫的對話的那兩秒。
   */
  function stopPolling(): void {
    if (pollHandle.value === null) {
      return
    }

    clearTimeout(pollHandle.value)
    pollHandle.value = null
  }

  watch(pending, schedulePoll, { immediate: true })

  /**
   * 一次失敗要對使用者說的那句話。
   *
   * 分開說，因為**使用者要做的事不同**：等到明天、等一下前一則、去啟動後端、
   * 或這是個意外。這句話寫在這裡而不是元件上——抽屜與整頁都要說同一句，
   * 寫兩次就會有兩種說法。後端已經說明原因的那幾種一律如實轉達。
   */
  function readableMessageOf(error: unknown): string {
    if (error instanceof DailyUsageAllowanceExhaustedError) {
      return error.message
    }

    if (error instanceof AssistantAnswerInProgressError) {
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
    resumeCurrentConversation,
    loadConversations,
  }
}
