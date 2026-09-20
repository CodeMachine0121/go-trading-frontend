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
  // 存好了那一句現在要在**這一頁**上被看到，因為存完之後使用者留在原地。
  // 它仍然走跨頁的那一條，因為拼好一份新的會換一次網址（見 createdId）。
  const { announcement, announce } = useConsoleAnnouncement()

  const editing = ref<TradingStrategyDto | null>(null)
  const strategyScriptOptions = ref<{ value: number, label: string }[]>([])
  const parameterNamesByStrategyScriptId = ref<Record<number, readonly string[]>>({})
  /**
   * 挑不得、但**確實存在**的那幾支策略腳本，以及它們挑不得的原因。
   *
   * 沒有它的話，一塊指著這種腳本的零件，設定裡那個下拉選單會是**一片空白**——
   * 選單的值不在它的選項裡，瀏覽器就什麼都不顯示。而空白看起來像「還沒選」，
   * 於是使用者不知道自己正看著一塊已經壞掉的零件，也不知道它壞在哪裡。
   */
  const unusableStrategyScripts = ref<Record<number, string>>({})
  /**
   * 零件架挑不到任何策略腳本時，是哪一種挑不到。
   *
   * 「一支都沒有」與「有，但沒有一支吐訊號」的下一步完全不同：前者是去建一支，
   * 後者是去把既有那幾支的指標值種類改掉。兩種說同一句話，等於把人推去建第五支
   * 同樣用不了的腳本。`null` 是挑得到，架子不必說任何話。
   */
  const shortage = ref<'noStrategyScripts' | 'noSignalStrategyScripts' | null>(null)

  const loading = ref(true)
  const saving = ref(false)
  /**
   * 這一份被成功存過幾次。
   *
   * 是次數而不是「存過了沒有」，因為看著它的那一側要知道的是**又存了一次**：
   * 回測那一張成績單說的是存那一刻的規則，再存一次它就過時了。
   * 一個布林值只說得出第一次。
   */
  const savedGeneration = ref(0)
  /**
   * 剛剛建好的那一份的識別碼；這一次不是新建就是 `null`。
   *
   * 這一頁看著它把網址換成那一份的。**那不是修飾**：留在「新拼一份」那條網址上、
   * 而表單裡的識別碼還是空的話，再按一次儲存就會建出第二份一模一樣的。
   */
  const createdId = ref<number | null>(null)
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

      // 挑不得的那幾支也記下來，連同原因。它們不進選單——挑得到就等於讓人拼出一份
      // 後端會拒絕的交易策略——但一塊**已經**指著它們的零件要說得出自己指著誰。
      const unusable = [
        ...available.mine
          .filter(strategyScript => strategyScript.content.resultType !== SIGNAL_RESULT_TYPE)
          .map(strategyScript => [strategyScript.id, strategyScript.name] as const),
        ...available.adopted
          .filter(strategyScript => strategyScript.resultType !== SIGNAL_RESULT_TYPE)
          .map(strategyScript => [strategyScript.id, strategyScript.name] as const),
      ]

      unusableStrategyScripts.value = Object.fromEntries(
        unusable.map(([id, name]) => [id, `${name}（這支不吐訊號，當不了訊號來源）`]))

      shortage.value = options.length > 0
        ? null
        : (unusable.length === 0 ? 'noStrategyScripts' : 'noSignalStrategyScripts')
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
   * 存起來，**存好了不離開這一頁**。
   *
   * 存好之後最常做的下一件事是回測它，而那個分頁就在這一頁上。
   * 把他送回清單，等於在「剛拼好」與「問它行不行」之間隔一次來回。
   *
   * 存好了就把 `dirty` 放掉——離開這一頁不該再被攔一次。
   *
   * 被後端拒絕時**這一頁留著**：要使用者把整棵樹重拼一次，
   * 是拿他的時間賠一個伺服器端才知道的規則。
   */
  async function save(writeDto: TradingStrategyWriteDto) {
    saving.value = true
    failureMessage.value = ''

    try {
      const savedTradingStrategy
        = await tradingStrategyApplication.saveTradingStrategy(writeDto)
      dirty.value = false
      // 改一份與拼一份新的說的不是同一句：按下儲存之後畫面上唯一改變的就是這一句，
      // 它是使用者判斷「剛剛那下到底做了什麼」的全部依據。
      announce(writeDto.id === undefined ? '交易策略拼好了' : '更改成功')
      editing.value = savedTradingStrategy
      if (writeDto.id === undefined) {
        createdId.value = savedTradingStrategy.id
      }
      savedGeneration.value += 1
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
    unusableStrategyScripts,
    shortage,
    announcement,
    loading,
    saving,
    savedGeneration,
    createdId,
    failureMessage,
    missing,
    dirty,
    load,
    save,
    markDirty,
  }
}
