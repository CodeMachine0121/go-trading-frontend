import { LocalizedError } from '~/domain/errors/localized-error'
import type { TradingStrategyApplication } from '~/application/trading-strategy-application'
import type { TradingStrategyDto } from '~/domain/models/dto/trading-strategy-dto'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

/**
 * 交易策略清單這一整塊的狀態與動作。
 *
 * 它不問任何一台機器人。誰在用一份規則，是刪它的時候後端才說得準的事——
 * 為了在清單上先顯示那個數字，得為每一份各問一次機器人清單，
 * 而那個數字救不了任何一次操作。
 */
export function useTradingStrategies(tradingStrategyApplication: TradingStrategyApplication) {
  const tradingStrategies = ref<TradingStrategyDto[]>([])

  const loading = ref(false)
  const busyId = ref<number | null>(null)
  const failureMessage = ref<LocalizedTextVo | null>(null)

  const deleting = ref<TradingStrategyDto | null>(null)

  // 「存好了」那一句話跨得過換頁，所以它住在共用的那一個——存好一份的是工作台，
  // 而那時使用者已經被送回這一頁了。
  const { announcement } = useConsoleAnnouncement()

  async function load() {
    loading.value = true
    failureMessage.value = null

    try {
      tradingStrategies.value = await tradingStrategyApplication.listTradingStrategies()
    }
    catch (error: unknown) {
      failureMessage.value = messageOf(error)
    }
    finally {
      loading.value = false
    }
  }

  /** 按下刪除只是問一聲。它是花時間拼出來的，靜靜消失太貴。 */
  function askToDelete(tradingStrategy: TradingStrategyDto) {
    deleting.value = tradingStrategy
  }

  function cancelDelete() {
    deleting.value = null
  }

  /**
   * 真的刪。
   *
   * 後端可能仍然擋下來——還有機器人在用它——而那句話原樣顯示：
   * 它說得出有幾台，而那正是使用者接下來要處理的東西。
   */
  async function confirmDelete() {
    const target = deleting.value
    if (target === null) {
      return
    }

    busyId.value = target.id
    failureMessage.value = null

    try {
      await tradingStrategyApplication.deleteTradingStrategy(target.id)
      deleting.value = null
      await load()
    }
    catch (error: unknown) {
      // 對話框關掉：那句拒絕說的不是「你按錯了」，而是「先去處理那幾台機器人」，
      // 而那件事不在這個對話框裡做得完。
      deleting.value = null
      failureMessage.value = messageOf(error)
    }
    finally {
      busyId.value = null
    }
  }

  function messageOf(error: unknown): LocalizedTextVo {
    if (error instanceof LocalizedError) {
      return error.localizedMessage
    }

    // 認不得的錯誤帶的是別人說的原文，照抄、不翻。
    return error instanceof Error
      ? new UntranslatedTextVo(error.message)
      : new LocalizedTextVo('發生未知的錯誤', 'An unknown error occurred')
  }

  return {
    tradingStrategies,
    loading,
    busyId,
    failureMessage,
    deleting,
    announcement,
    load,
    askToDelete,
    cancelDelete,
    confirmDelete,
  }
}
