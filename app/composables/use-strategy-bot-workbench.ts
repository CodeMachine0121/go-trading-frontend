import type { StrategyApplication } from '~/application/strategy-application'
import type { StrategyBotApplication } from '~/application/strategy-bot-application'
import type { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import type { StrategyBotWriteDto } from '~/domain/models/dto/strategy-bot-write-dto'
import type { IndicatorResultType } from '~/domain/models/vo/indicator-result-type'

/**
 * 機器人聽得懂的唯一一種指標值種類。
 *
 * 一台機器人的條件比對的是買入／賣出／持有，而只有這一種策略吐得出那三個值。
 * 挑得到一支吐數字的策略，那台機器人第一輪就會算式失敗——而算式失敗是會**停擺**的
 * 那一類，使用者會得到一台按下播放、隔天發現早就停了的機器人。
 */
const SIGNAL_RESULT_TYPE: IndicatorResultType = 'signal'

/**
 * 一張工作台這一頁自己的狀態：它在改哪一台、可以挑哪幾支策略、存得怎麼樣了。
 *
 * 它與清單那一頁的 `useStrategyBots` 分開，因為兩頁要的東西幾乎不重疊：
 * 清單要的是每一台的執行狀態與歷史，這裡要的是一台的內容與可用策略。
 * 合成一個的話，打開工作台會連帶去撈一份沒有人會看的清單。
 *
 * @param strategyBotId 有值就是改那一台，`null` 就是新拼一台。
 */
export function useStrategyBotWorkbench(
  strategyBotApplication: StrategyBotApplication,
  strategyApplication: StrategyApplication,
  strategyBotId: number | null,
) {
  // 存好了那一句要在**清單**上被看到，因為存完之後使用者已經被送回去了。
  const { announce } = useConsoleAnnouncement()

  const editing = ref<StrategyBotDto | null>(null)
  const strategyOptions = ref<{ value: number, label: string }[]>([])
  const parameterNamesByStrategyId = ref<Record<number, readonly string[]>>({})

  const loading = ref(true)
  const saving = ref(false)
  const saved = ref(false)
  const failureMessage = ref('')
  /** 讀不到那一台。與 `failureMessage` 分開，因為它的下一步是回清單，不是重試。 */
  const missing = ref(false)
  const dirty = ref(false)

  async function load() {
    loading.value = true
    failureMessage.value = ''

    try {
      const [bot, available] = await Promise.all([
        strategyBotId === null
          ? Promise.resolve(null)
          : strategyBotApplication.getStrategyBot(strategyBotId),
        strategyApplication.listAvailableStrategies(),
      ])

      editing.value = bot

      // 自己的與採用來的分開讀，因為它們的形狀本來就不同：採用來的**沒有算式**，
      // 所以它的旋鈕與指標值種類直接掛在上面，而自己的那幾支掛在算式內容裡。
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
   * 被後端拒絕時**這一頁留著**：要使用者把整棵樹重拼一次，
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
    return error instanceof Error ? error.message : '發生未知的錯誤'
  }

  return {
    editing,
    strategyOptions,
    parameterNamesByStrategyId,
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
