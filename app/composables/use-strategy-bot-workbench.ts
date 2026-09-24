import type { StrategyBotApplication } from '~/application/strategy-bot-application'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import type { TradingStrategyApplication } from '~/application/trading-strategy-application'
import type { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import type { StrategyBotWriteDto } from '~/domain/models/dto/strategy-bot-write-dto'
import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'

/**
 * 拼一台機器人那一頁自己的狀態：它在改哪一台、可以挑哪幾份交易策略、存得怎麼樣了。
 *
 * 它與清單那一頁的 `useStrategyBots` 分開，因為兩頁要的東西幾乎不重疊：
 * 清單要的是每一台的執行狀態與歷史，這裡要的是一台的內容與可挑的交易策略。
 *
 * @param strategyBotId 有值就是改那一台，`null` 就是新拼一台。
 * @param marketDataKind 這一頁拼的是哪一種機器人。
 */
export function useStrategyBotWorkbench(
  strategyBotApplication: StrategyBotApplication,
  tradingStrategyApplication: TradingStrategyApplication,
  strategyBotId: number | null,
  marketDataKind: MarketDataKind,
) {
  /** 這一種機器人的畫面：標題、清單在哪、標的從哪挑、收不收槓桿。 */
  const page = strategyBotApplication.pageFor(marketDataKind)

  // 存好了那一句要在**清單**上被看到，因為存完之後使用者已經被送回去了。
  const { announce } = useConsoleAnnouncement()

  const editing = ref<StrategyBotDto | null>(null)
  const tradingStrategyOptions = ref<{ value: number, label: string }[]>([])

  const loading = ref(true)
  const saving = ref(false)
  const saved = ref(false)
  const failureMessage = ref('')
  /** 讀不到那一台。與 `failureMessage` 分開，因為它的下一步是回清單，不是重試。 */
  const missing = ref(false)
  const dirty = ref(false)
  /**
   * 讀到的那一台是**另一種**機器人時，它自己的編輯頁在哪；其餘時候 `null`。
   *
   * 不在錯的那一頁上改它：這一頁的交易策略選單與標的清單都是這一種的，
   * 拿來改另一種機器人只會挑到一個存下時被拒絕的東西。
   */
  const redirectPath = ref<string | null>(null)

  async function load() {
    loading.value = true
    failureMessage.value = ''

    try {
      const [bot, tradingStrategies] = await Promise.all([
        strategyBotId === null
          ? Promise.resolve(null)
          : strategyBotApplication.getStrategyBot(strategyBotId),
        tradingStrategyApplication.listTradingStrategiesFollowableBy(marketDataKind),
      ])

      if (bot !== null && bot.marketDataKind !== marketDataKind) {
        redirectPath.value = bot.editPath

        return
      }

      editing.value = bot
      // 一次讀完，不為了顯示一個名字而每一列各問一次。
      // 只列這一種機器人跟得了的那幾份——挑到另一種只會在存下時被拒絕。
      tradingStrategyOptions.value = tradingStrategies
        .map(tradingStrategy => ({ value: tradingStrategy.id, label: tradingStrategy.name }))
    }
    catch (error: unknown) {
      // 要改的那一台不見了與「後端壞了」是兩件事：前者的下一步是回清單，
      // 後者是再試一次。分不出來的話，使用者只會對著一句錯誤重按。
      if (strategyBotId !== null) {
        missing.value = true
      }
      failureMessage.value = messageOf(error)
    }
    finally {
      loading.value = false
    }
  }

  /**
   * 存起來。存好了就把 `dirty` 放掉——離開這一頁不該再被攔一次。
   *
   * 被後端拒絕時**這一頁留著**：要使用者把四格重填一次，
   * 是拿他的時間賠一個伺服器端才知道的規則。
   */
  async function save(writeDto: StrategyBotWriteDto) {
    saving.value = true
    failureMessage.value = ''

    try {
      await strategyBotApplication.saveStrategyBot(writeDto)
      dirty.value = false
      // 改一台與拼一台新的說的不是同一句：按下儲存之後畫面上唯一改變的就是這一句，
      // 它是使用者判斷「剛剛那下到底做了什麼」的全部依據。
      announce(writeDto.id === undefined ? '機器人建好了' : '更改成功')
      saved.value = true
    }
    catch (error: unknown) {
      failureMessage.value = messageOf(error)
    }
    finally {
      saving.value = false
    }
  }

  function markDirty(changed: boolean) {
    dirty.value = changed
  }

  function messageOf(error: unknown): string {
    if (error instanceof BackendUnreachableError) {
      return error.explanation
    }

    return error instanceof Error ? error.message : '發生未知的錯誤'
  }

  return {
    page,
    redirectPath,
    editing,
    tradingStrategyOptions,
    loading,
    saving,
    saved,
    failureMessage,
    missing,
    dirty,
    load,
    save,
    markDirty,
  }
}
