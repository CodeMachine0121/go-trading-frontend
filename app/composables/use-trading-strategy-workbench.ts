import type { StrategyScriptApplication } from '~/application/strategy-script-application'
import type { TradingStrategyApplication } from '~/application/trading-strategy-application'
import type { TradingStrategyDto } from '~/domain/models/dto/trading-strategy-dto'
import type { TradingStrategyWriteDto } from '~/domain/models/dto/trading-strategy-write-dto'
import type { IndicatorResultType } from '~/domain/models/vo/indicator-result-type'

/**
 * 一份交易策略聽得懂的唯一一種指標值種類。
 *
 * 條件比對的是買入／賣出／持有，而只有這一種策略腳本吐得出那三個值。
 * 挑得到一支吐數字的策略腳本，跟著它跑的機器人第一輪就會算式失敗——
 * 而算式失敗是會**停擺**的那一類，使用者會得到一台按下播放、隔天發現早就停了的機器人。
 */
const SIGNAL_RESULT_TYPE: IndicatorResultType = 'signal'

/**
 * 一張工作台這一頁自己的狀態：它在改哪一份、可以挑哪幾支策略腳本、存得怎麼樣了。
 *
 * 它與清單那一頁的 `useTradingStrategies` 分開，因為兩頁要的東西幾乎不重疊：
 * 清單要的是每一份的概觀，這裡要的是一份的內容與可用策略腳本。
 * 合成一個的話，打開工作台會連帶去撈一份沒有人會看的清單。
 *
 * @param tradingStrategyId 有值就是改那一份，`null` 就是新拼一份。
 */
export function useTradingStrategyWorkbench(
  tradingStrategyApplication: TradingStrategyApplication,
  strategyScriptApplication: StrategyScriptApplication,
  tradingStrategyId: number | null,
) {
  // 存好了那一句要在**清單**上被看到，因為存完之後使用者已經被送回去了。
  const { announce } = useConsoleAnnouncement()

  const editing = ref<TradingStrategyDto | null>(null)
  const strategyScriptOptions = ref<{ value: number, label: string }[]>([])
  const parameterNamesByStrategyScriptId = ref<Record<number, readonly string[]>>({})

  const loading = ref(true)
  const saving = ref(false)
  const saved = ref(false)
  const failureMessage = ref('')
  /** 讀不到那一份。與 `failureMessage` 分開，因為它的下一步是回清單，不是重試。 */
  const missing = ref(false)
  const dirty = ref(false)

  async function load() {
    loading.value = true
    failureMessage.value = ''

    try {
      const [tradingStrategy, available] = await Promise.all([
        tradingStrategyId === null
          ? Promise.resolve(null)
          : tradingStrategyApplication.getTradingStrategy(tradingStrategyId),
        strategyScriptApplication.listAvailableStrategyScripts(),
      ])

      editing.value = tradingStrategy

      // 自己的與採用來的分開讀，因為它們的形狀本來就不同：採用來的**沒有算式**，
      // 所以它的旋鈕與指標值種類直接掛在上面，而自己的那幾支掛在算式內容裡。
      const options = [
        ...available.mine
          .filter(strategyScript => strategyScript.content.resultType === SIGNAL_RESULT_TYPE)
          .map(strategyScript => ({
            value: strategyScript.id,
            label: strategyScript.name,
            parameterNames: strategyScript.content.parameters.map(parameter => parameter.name),
          })),
        ...available.adopted
          .filter(strategyScript => strategyScript.resultType === SIGNAL_RESULT_TYPE)
          .map(strategyScript => ({
            value: strategyScript.id,
            label: strategyScript.name,
            parameterNames: strategyScript.parameters.map(parameter => parameter.name),
          })),
      ]

      strategyScriptOptions.value = options.map(
        option => ({ value: option.value, label: option.label }))
      parameterNamesByStrategyScriptId.value = Object.fromEntries(
        options.map(option => [option.value, option.parameterNames]))
    }
    catch (error: unknown) {
      // 要改的那一份不見了與「後端壞了」是兩件事：前者的下一步是回清單，
      // 後者是再試一次。分不出來的話，使用者只會對著一句錯誤重按。
      if (tradingStrategyId !== null) {
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
  async function save(writeDto: TradingStrategyWriteDto) {
    saving.value = true
    failureMessage.value = ''

    try {
      await tradingStrategyApplication.saveTradingStrategy(writeDto)
      dirty.value = false
      // 改一份與拼一份新的說的不是同一句：按下儲存之後畫面上唯一改變的就是這一句，
      // 它是使用者判斷「剛剛那下到底做了什麼」的全部依據。
      announce(writeDto.id === undefined ? '交易策略拼好了' : '更改成功')
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
    strategyScriptOptions,
    parameterNamesByStrategyScriptId,
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
