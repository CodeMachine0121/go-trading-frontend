import type { StrategyBotApplication } from '~/application/strategy-bot-application'
import type { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import type { StrategyBotRunRecordDto } from '~/domain/models/dto/strategy-bot-run-record-dto'
import { TelegramNotConfiguredError } from '~/domain/errors/telegram-not-configured-error'
import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'

/**
 * 機器人清單這一整塊的狀態與動作。
 *
 * 它**只問機器人那一條線**。挑策略腳本、宣告來源、拼條件現在住在工作台那一頁，
 * 所以這裡不再去撈可用策略腳本——一份沒有人會看的清單，是在為一個已經搬走的畫面付錢。
 */
export function useStrategyBots(
  strategyBotApplication: StrategyBotApplication,
  /** 這一頁列的是哪一種機器人：現貨的畫面看不到合約機器人，反之亦然。 */
  marketDataKind: MarketDataKind,
) {
  const strategyBots = ref<StrategyBotDto[]>([])

  const loading = ref(false)
  const busyId = ref<number | null>(null)
  const failureMessage = ref('')
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

  const deleting = ref<StrategyBotDto | null>(null)

  // 「存好了」那一句話跨得過換頁，所以它住在共用的那一個——存好一台機器人的是工作台，
  // 而那時使用者已經被送回這一頁了。
  const { announcement } = useConsoleAnnouncement()

  async function load() {
    loading.value = true
    failureMessage.value = ''

    try {
      strategyBots.value = await strategyBotApplication.listStrategyBots(marketDataKind)
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
    loading,
    busyId,
    failureMessage,
    announcement,
    deliveryNotConfigured,
    expandedBotId,
    runRecords,
    runRecordsLoading,
    runRecordsFailureMessage,
    toggleRunHistory,
    runNow,
    deleting,
    load,
    start,
    stop,
    askToDelete,
    cancelDelete,
    confirmDelete,
  }
}
