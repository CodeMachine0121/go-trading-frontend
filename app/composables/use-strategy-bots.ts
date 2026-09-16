import type { StrategyApplication } from '~/application/strategy-application'
import type { StrategyBotApplication } from '~/application/strategy-bot-application'
import type { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import type { StrategyBotRunRecordDto } from '~/domain/models/dto/strategy-bot-run-record-dto'
import type { StrategyBotWriteDto } from '~/domain/models/dto/strategy-bot-write-dto'
import { TelegramNotConfiguredError } from '~/domain/errors/telegram-not-configured-error'
import type { IndicatorResultType } from '~/domain/models/vo/indicator-result-type'

/**
 * 機器人聽得懂的唯一一種指標值種類。
 *
 * 它是這一整條線的前提：一台機器人的條件比對的是買入／賣出／持有，
 * 而只有這一種策略吐得出那三個值。
 */
const SIGNAL_RESULT_TYPE: IndicatorResultType = 'signal'

/**
 * 做完一件事那句話停留多久。
 *
 * 四秒：夠一句十來個字讀完，又短到不會還掛在那裡誤導下一個動作的結果。
 */
const ANNOUNCEMENT_VISIBLE_MILLISECONDS = 4000

/**
 * 機器人清單這一整塊的狀態與動作。
 *
 * 它同時要問兩個 Application，而那不是偷懶：機器人清單答得出「我派了誰出去」，
 * 但答不出「我有哪幾支策略可以派」——挑策略的選單與它宣告了哪幾個旋鈕，
 * 只有策略那一條線知道。
 */
export function useStrategyBots(
  strategyBotApplication: StrategyBotApplication,
  strategyApplication: StrategyApplication,
) {
  const strategyBots = ref<StrategyBotDto[]>([])
  const strategyOptions = ref<{ value: number, label: string }[]>([])
  const parameterNamesByStrategyId = ref<Record<number, readonly string[]>>({})

  const loading = ref(false)
  const saving = ref(false)
  const busyId = ref<number | null>(null)
  const failureMessage = ref('')
  const formFailureMessage = ref('')
  /**
   * 啟動被「還沒設定 Telegram」擋下來過。
   *
   * 它自己一個旗標而不是混進 failureMessage，是因為它是唯一一種**要離開這個畫面
   * 才解得掉**的拒絕——認得出它，那句話才帶得出一條到帳號設定的路。
   */
  const deliveryNotConfigured = ref(false)

  /**
   * 哪一台的歷史正展開著，以及它的內容。
   *
   * 一次只展開一台：十台同時展開的清單，沒有一台看得清楚；而且歷史是**展開時才去撈**
   * ——一份清單裡十台各自先撈一次，等於為了一個多數時候沒人展開的區塊打十次後端。
   */
  const expandedBotId = ref<number | null>(null)
  const runRecords = ref<StrategyBotRunRecordDto[]>([])
  const runRecordsLoading = ref(false)
  const runRecordsFailureMessage = ref('')

  const formOpen = ref(false)
  const editing = ref<StrategyBotDto | null>(null)
  const deleting = ref<StrategyBotDto | null>(null)

  /**
   * 剛剛那件事成了，那一句話。空字串就是現在沒話要說。
   *
   * 它跟 failureMessage 分開，因為兩者留下來的理由不同：出了事那句要留著等人處理，
   * 成功這句留著只會蓋住下一個動作。
   */
  const announcement = ref('')

  /**
   * 收掉上一句的計時器。
   *
   * 由這裡拿著而不是讓那個元件自己數，是因為連著做兩件事時會有兩個計時器在數同一格
   * 位子——先到的那個會把後來的話收掉，於是第二句只閃一下就不見了。每說一句就把前一個
   * 計時器取消，那格位子永遠只有一個人在數。
   */
  let announcementTimer: ReturnType<typeof setTimeout> | null = null

  function announce(message: string) {
    announcement.value = message

    if (announcementTimer !== null) {
      clearTimeout(announcementTimer)
    }
    announcementTimer = setTimeout(() => {
      announcement.value = ''
    }, ANNOUNCEMENT_VISIBLE_MILLISECONDS)
  }

  // 畫面收掉之後那個計時器還在數，數完會去寫一個沒有人在看的 ref。
  onScopeDispose(() => {
    if (announcementTimer !== null) {
      clearTimeout(announcementTimer)
    }
  })

  async function load() {
    loading.value = true
    failureMessage.value = ''

    try {
      // 兩邊一起問：挑策略的選單沒有內容的話，這張表單第二段就填不完，
      // 所以它們是同一次載入的兩半，不是先後兩件事。
      const [bots, available] = await Promise.all([
        strategyBotApplication.listStrategyBots(),
        strategyApplication.listAvailableStrategies(),
      ])

      strategyBots.value = bots

      // 自己的與採用來的分開讀，因為它們的形狀本來就不同：採用來的**沒有算式**，
      // 所以它的旋鈕與指標值種類直接掛在上面，而自己的那幾支掛在算式內容裡。
      // 合成一個「有時候有算式」的型別，正是這個系統一直在避免的東西。
      //
      // 兩邊都只留**訊號種類**的那幾支。不是為了清單好看：機器人跑一個信號來源時
      // 一律以訊號種類執行它，所以一支吐數字的策略在第一輪就會算式失敗，
      // 而算式失敗是會**停擺**的那一類——使用者會得到一台按下播放、隔天發現
      // 早就停了的機器人，而原因發生在他看不到的地方。挑不到，就不會發生。
      const options = [
        ...available.mine
          .filter(strategy => strategy.content.resultType === SIGNAL_RESULT_TYPE)
          .map(strategy => ({
            value: strategy.id,
            label: strategy.name,
            parameterNames: strategy.content.parameters.map(parameter => parameter.name),
          })),
        ...available.adopted
          .filter(strategy => strategy.resultType === SIGNAL_RESULT_TYPE)
          .map(strategy => ({
            value: strategy.id,
            label: strategy.name,
            parameterNames: strategy.parameters.map(parameter => parameter.name),
          })),
      ]

      strategyOptions.value = options.map(
        option => ({ value: option.value, label: option.label }))
      parameterNamesByStrategyId.value = Object.fromEntries(
        options.map(option => [option.value, option.parameterNames]))
    }
    catch (error: unknown) {
      failureMessage.value = messageOf(error)
    }
    finally {
      loading.value = false
    }
  }

  /**
   * 展開或收起一台的歷史。
   *
   * 再按一次收起來，因為那顆鍵說的是「這一台的紀錄，看或不看」——
   * 一個只打得開、關不掉的區塊，會讓人以為那是頁面的一部分而不是他按出來的。
   */
  async function toggleRunHistory(strategyBotId: number) {
    if (expandedBotId.value === strategyBotId) {
      expandedBotId.value = null

      return
    }

    expandedBotId.value = strategyBotId
    runRecords.value = []
    runRecordsFailureMessage.value = ''
    runRecordsLoading.value = true

    try {
      const loaded = await strategyBotApplication.listRunRecords(strategyBotId)

      // 這一趟回來之前，使用者可能已經收起來或改展開了別台。把它丟掉，
      // 否則他會看到一份屬於別台機器人的歷史掛在這一台底下。
      if (expandedBotId.value === strategyBotId) {
        runRecords.value = loaded
      }
    }
    catch (error: unknown) {
      if (expandedBotId.value === strategyBotId) {
        runRecordsFailureMessage.value = messageOf(error)
      }
    }
    finally {
      if (expandedBotId.value === strategyBotId) {
        runRecordsLoading.value = false
      }
    }
  }

  function openCreateForm() {
    editing.value = null
    formFailureMessage.value = ''
    formOpen.value = true
  }

  /**
   * 打開一台來編輯，而且**重新去問它現在長什麼樣**。
   *
   * 不重問的話，清單上那一份可能已經過期——那一台可能在另一個分頁被刪掉了，
   * 或被改過了。使用者會對著一份不存在的資料重做一次編輯，按下儲存才被告知找不到。
   * 現在他在打開的那一刻就知道。
   */
  async function openEditForm(strategyBot: StrategyBotDto) {
    formFailureMessage.value = ''
    failureMessage.value = ''
    busyId.value = strategyBot.id

    try {
      editing.value = await strategyBotApplication.getStrategyBot(strategyBot.id)
      formOpen.value = true
    }
    catch (error: unknown) {
      // 先重讀、再說話。反過來的話那句話會被 load() 自己的清空吃掉——
      // 使用者按了編輯，什麼都沒發生，清單卻默默換了一份。
      const openFailure = messageOf(error)
      await load()
      failureMessage.value = openFailure
    }
    finally {
      busyId.value = null
    }
  }

  function closeForm() {
    formOpen.value = false
  }

  /**
   * 存起來。被後端拒絕時**表單留著**——要使用者重打一次，
   * 是拿他的時間賠一個伺服器端才知道的規則。
   */
  async function save(writeDto: StrategyBotWriteDto) {
    saving.value = true
    formFailureMessage.value = ''

    // 改的還是新的，要在存之前問——存完之後 load() 已經把清單換過一輪，
    // 那時再問「剛剛是在改哪一台」問的是新的一份資料。
    const wasEditing = writeDto.id !== undefined

    try {
      await strategyBotApplication.saveStrategyBot(writeDto)
      formOpen.value = false
      announce(wasEditing ? '更改成功' : '機器人建好了')
      await load()
    }
    catch (error: unknown) {
      formFailureMessage.value = messageOf(error)
    }
    finally {
      saving.value = false
    }
  }

  async function start(id: number) {
    deliveryNotConfigured.value = false
    await runOnBot(id, () => strategyBotApplication.startStrategyBot(id))
  }

  async function stop(id: number) {
    await runOnBot(id, () => strategyBotApplication.stopStrategyBot(id))
  }

  /**
   * 不等排程，現在就跑一輪，然後**把那一台的歷史展開**。
   *
   * 展開是這顆鍵的一半：按下去卻什麼都沒變，使用者無從知道它到底跑了沒有——
   * 而剛跑完的那一輪就在歷史的第一列。
   */
  async function runNow(id: number) {
    deliveryNotConfigured.value = false
    await runOnBot(id, () => strategyBotApplication.runRoundNow(id))

    if (failureMessage.value !== '') {
      return
    }

    // 已經展開的就重讀，沒展開的就展開——兩種情況下他看到的都是剛剛那一輪。
    if (expandedBotId.value === id) {
      expandedBotId.value = null
    }

    await toggleRunHistory(id)
  }

  function askToDelete(strategyBot: StrategyBotDto) {
    deleting.value = strategyBot
  }

  function cancelDelete() {
    deleting.value = null
  }

  /** 執行中的也刪得掉，不要求先按停止——他要的結果是這台不在了。 */
  async function confirmDelete() {
    const target = deleting.value
    deleting.value = null

    if (target === null) {
      return
    }

    await runOnBot(target.id, () => strategyBotApplication.deleteStrategyBot(target.id))
  }

  /**
   * 對一台機器人做一件事，然後重讀清單。
   *
   * 重讀而不是就地改那一列，是因為一次操作可能不只改到那一台——例如啟動失敗時
   * 後端什麼都沒動，而就地改的那一列已經先變了樣子。
   */
  async function runOnBot(id: number, action: () => Promise<unknown>) {
    busyId.value = id
    failureMessage.value = ''

    try {
      await action()
      await load()
    }
    catch (error: unknown) {
      if (error instanceof TelegramNotConfiguredError) {
        deliveryNotConfigured.value = true
      }
      else {
        failureMessage.value = messageOf(error)
      }
    }
    finally {
      busyId.value = null
    }
  }

  function messageOf(error: unknown): string {
    return error instanceof Error ? error.message : '發生了一個說不出原因的錯誤'
  }

  return {
    strategyBots,
    strategyOptions,
    parameterNamesByStrategyId,
    loading,
    saving,
    busyId,
    failureMessage,
    announcement,
    formFailureMessage,
    deliveryNotConfigured,
    expandedBotId,
    runRecords,
    runRecordsLoading,
    runRecordsFailureMessage,
    toggleRunHistory,
    runNow,
    formOpen,
    editing,
    deleting,
    load,
    openCreateForm,
    openEditForm,
    closeForm,
    save,
    start,
    stop,
    askToDelete,
    cancelDelete,
    confirmDelete,
  }
}
