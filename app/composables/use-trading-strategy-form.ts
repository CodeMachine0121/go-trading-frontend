import { ConditionBoardDomain } from '~/domain/models/domains/condition-board-domain'
import { SignalDomain } from '~/domain/models/domains/signal-domain'
import { TradingStrategyConditionDomain } from '~/domain/models/domains/trading-strategy-condition-domain'
import { TradingStrategyWriteDomain } from '~/domain/models/domains/trading-strategy-write-domain'
import type { TradingStrategyDto } from '~/domain/models/dto/trading-strategy-dto'
import {
  StrategyBotParameterValueDto,
  TradingStrategySignalSourceDto,
} from '~/domain/models/dto/trading-strategy-signal-source-dto'
import { TradingStrategyWriteDto } from '~/domain/models/dto/trading-strategy-write-dto'
import { AGGREGATION_INTERVALS } from '~/domain/models/vo/aggregation-interval-vo'
import type { ConditionOperatorVo } from '~/domain/models/vo/condition-operator-vo'
import type { ConditionSideVo } from '~/domain/models/vo/condition-side-vo'
import { SIGNAL_VALUES } from '~/domain/models/vo/signal-vo'
import { STRATEGY_BOT_LIMITS } from '~/domain/models/vo/strategy-bot-limits-vo'
import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'
import type { ContractTradingMode } from '~/domain/models/vo/contract-trading-mode-vo'
import { MarketDataKindDomain } from '~/domain/models/domains/market-data-kind-domain'

/** 新拼一份時的行情種類與（合約的）交易模式：與交易服務對留白的讀法一字不差。 */
const DEFAULT_MARKET_DATA_KIND: MarketDataKind = 'kCandle'
const DEFAULT_CONTRACT_TRADING_MODE: ContractTradingMode = 'longShort'

/** 換了行情種類而原本有信號來源時要說的那一句。 */
const MARKET_DATA_KIND_CHANGED_NOTICE
  = '換了行情種類：原本的信號來源吃的是另一種行情，已經拿掉，請從這一種的策略腳本重新挑。'

/** 一條條件挑得到的三個值。信號只有三個，所以它是選的；怎麼稱呼它們由 SignalDomain 說。 */
const SIGNAL_OPTIONS = SIGNAL_VALUES.map(signal => ({
  value: signal,
  label: new SignalDomain(signal).label(),
}))

/** 新增一個信號來源時它的預設刻度。五分鐘：夠密、又不會密到每一輪都讀到同一根。 */
const DEFAULT_AGGREGATION_INTERVAL = '5m'

/**
 * 表單的狀態與每一個改得動它的動作。
 *
 * 它住在 composable 而不是元件裡，是因為「加一句比對」與「加一個信號來源」是同一件事的
 * 兩半：條件挑得到什麼，由信號來源決定。兩半分在兩個元件裡的話，
 * 那條連線就得靠 props 一層層傳，而傳錯的那一天不會有人發現。
 *
 * 規則本身一句都不在這裡——形狀規則問 TradingStrategyConditionDomain，
 * 送不送得出去問 TradingStrategyWriteDomain。這裡只負責把它們接上畫面。
 */
export function useTradingStrategyForm(
  editing: () => TradingStrategyDto | null,
  strategyScriptOptions: () => readonly { value: number, label: string }[],
  /** 存在、但當不了訊號來源的那幾支，以及原因——一個指著它們的來源要說得出自己指著誰。 */
  unusableStrategyScripts: () => Readonly<Record<number, string>> = () => ({}),
  /** 每一支策略腳本宣告了哪幾個參數。 */
  parameterNamesByStrategyScriptId: () => Readonly<Record<number, readonly string[]>> = () => ({}),
) {
  const name = ref('')
  /**
   * 這一份吃哪一種行情，以及合約那一種的交易模式。
   *
   * 行情種類只在**還沒存過**時換得動：交易服務不讓一份已存的交易策略換行情種類，
   * 因為它的每一個信號來源都是照那一種挑的。
   */
  const marketDataKind = ref<MarketDataKind>(DEFAULT_MARKET_DATA_KIND)
  const tradingMode = ref<ContractTradingMode>(DEFAULT_CONTRACT_TRADING_MODE)
  const marketDataKindNotice = ref('')
  const marketDataKindLocked = computed(() => editing() !== null)
  const replaysOnContractAccount = computed(
    () => new MarketDataKindDomain(marketDataKind.value).toWorkbenchDto().replaysOnContractAccount)
  const signalSources = ref<TradingStrategySignalSourceDto[]>([])
  /**
   * 條件目前真正指著的那幾個代號——也就是每個來源**最後一個沒有撞名的**代號。
   *
   * 它與 `signalSources` 的 label 多數時候一樣，只在使用者打到一半撞名的那幾個瞬間
   * 分岔。沒有它的話，對調兩個代號會讓兩邊的條件永久合併成同一句。
   */
  const committedLabels = ref<string[]>([])

  const intervalOptions = AGGREGATION_INTERVALS.map(interval => ({
    value: interval.value,
    label: interval.label,
  }))

  /** 條件挑得到的那幾個代號。**第三段的選單由第二段填出來**，這一行就是那件事。 */
  const sourceLabels = computed(
    () => signalSources.value.map(signalSource => signalSource.label).filter(label => label !== ''))

  /**
   * 每一個訊號來源用的那一支策略腳本叫什麼（與 `signalSources` 同一個順序）。
   *
   * 挑得到的就是它的名字；存在但挑不得的，說它為什麼挑不得；認不得那個識別碼時
   * （腳本被刪了、或那份採用被收回）也照樣說一句——一片空白看起來像「還沒選」。
   */
  const signalSourceStrategyScriptLabels = computed(() => signalSources.value.map(
    signalSource => strategyScriptOptions().find(
      option => option.value === signalSource.strategyScriptId)?.label
      ?? unusableStrategyScripts()[signalSource.strategyScriptId]
      ?? `這支策略腳本（編號 ${signalSource.strategyScriptId}）已經不在了`))

  /** 每一個訊號來源調過的參數讀成一行：調過的才列，沒調的就是用那支策略腳本自己的預設值。 */
  const signalSourceParameterSummaries = computed(() => signalSources.value.map(
    signalSource => signalSource.parameterValues
      .map(parameter => `${parameter.name}=${parameter.value}`)
      .join(' · ')))

  /**
   * 每一個訊號來源的每一個參數欄該填著什麼，依那支策略腳本宣告的順序。
   *
   * 沒填過的是空白，而不是一個假的 0——0 是一個值，空白是還沒決定。
   */
  const signalSourceParameterInputs = computed(() => signalSources.value.map(
    signalSource => Object.fromEntries(
      (parameterNamesByStrategyScriptId()[signalSource.strategyScriptId] ?? []).map(parameterName => [
        parameterName,
        signalSource.parameterValues
          .find(parameter => parameter.name === parameterName)?.value.toString() ?? '',
      ]))))

  const canAddSignalSource = computed(
    () => signalSources.value.length < STRATEGY_BOT_LIMITS.signalSourceCount)

  /**
   * 哪幾個來源被條件用著，以及被誰用著。
   *
   * 它**不再擋住刪除**。原本會擋，理由是「刪了條件就會指向一個不存在的代號」——
   * 而那件事現在**看得見**：那幾句會自己標成「找不到這個來源」，而且送不出去。
   *
   * 擋住的代價比想像中大：使用者只有一個來源、而兩棵樹都在用它的時候，
   * 他得先把兩棵樹拆光才刪得掉那一個來源，才換得掉一支策略腳本。
   * 那是要他為了改一個地方先毀掉另外兩個地方。
   *
   * 所以這裡只剩**說一聲**：刪之前告訴他有誰在用，刪之後那幾句自己會喊。
   */
  const signalSourceUsageWarnings = computed(() => {
    const usedLabels = new Set([
      ...boards.buy.value.placedLabels,
      ...boards.sell.value.placedLabels,
    ])

    const warnings: Record<number, string> = {}
    signalSources.value.forEach((signalSource, index) => {
      if (usedLabels.has(signalSource.label)) {
        warnings[index] = `條件裡還在用「${signalSource.label}」，刪掉它會一併拿掉那幾句條件`
      }
    })

    return warnings
  })

  const rejection = computed(() => new TradingStrategyWriteDomain(buildWriteDto()).rejection)

  function buildWriteDto(): TradingStrategyWriteDto {
    return new TradingStrategyWriteDto(
      editing()?.id,
      name.value,
      signalSources.value,
      conditionSides[0].condition.value,
      conditionSides[1].condition.value,
      marketDataKind.value,
      replaysOnContractAccount.value ? tradingMode.value : null,
    )
  }

  /** 送不出去時回 null——擋下來的那一句已經在 rejection 裡說了。 */
  function toWriteDto(): TradingStrategyWriteDto | null {
    const writeDto = buildWriteDto()

    return new TradingStrategyWriteDomain(writeDto).isSendable ? writeDto : null
  }

  /** 每次打開對話框都重來一次：改到一半關掉再打開，看到的應該是庫裡那一台。 */
  function reset() {
    const loaded = editing()

    name.value = loaded?.name ?? ''
    marketDataKind.value = loaded?.marketDataKind ?? DEFAULT_MARKET_DATA_KIND
    tradingMode.value = loaded?.tradingMode ?? DEFAULT_CONTRACT_TRADING_MODE
    marketDataKindNotice.value = ''
    // 打開既有的那一份就是它存著的那一個；新的一份用預設值——
    // 與後端對一份沒填的交易策略的讀法一字不差。
    signalSources.value = [...(loaded?.signalSources ?? [])]
    committedLabels.value = signalSources.value.map(signalSource => signalSource.label)
    // 存進來的那棵樹在這裡、而且只在這裡，被讀成「條件卡上有哪幾條條件」。
    boards.buy.value = new TradingStrategyConditionDomain(loaded?.buyCondition ?? null).toBoardDto()
    boards.sell.value = new TradingStrategyConditionDomain(
      loaded?.sellCondition ?? null).toBoardDto()
  }

  function addSignalSource() {
    if (!canAddSignalSource.value) {
      return
    }

    const strategyScriptId = strategyScriptOptions()[0]?.value ?? 0
    const label = nextLabel(strategyScriptId)

    signalSources.value = [
      ...signalSources.value,
      new TradingStrategySignalSourceDto(
        label,
        strategyScriptId,
        // 跟著已經有的那幾個訊號來源，而不是一律用預設值。
        // 一份交易策略只看一種粗細，所以新的一個與舊的一個不同，
        // 從來不是使用者想要的——那只會讓他一加訊號來源就撞到那句提醒。
        signalSources.value[0]?.aggregationInterval ?? DEFAULT_AGGREGATION_INTERVAL,
        [],
      ),
    ]
    committedLabels.value = [...committedLabels.value, label]
  }

  /**
   * 下一個沒人用的代號，預設就是**那支策略腳本的名字**。
   *
   * 原本給的是 A、B、C，而那讓條件讀起來是「A 等於買入」——一句看不出自己在說什麼的話。
   * 使用者得自己記住 A 是哪一支，而他同時在讀的是一棵三層深的樹。
   * 用策略腳本的名字，同一句就變成「MACD 交叉 等於買入」，不必記任何東西。
   *
   * 撞名時後面接一個數字而不是換一個字母：同一支策略腳本用兩次（不同參數）正是代號
   * 存在的理由，而「MACD 交叉 2」仍然說得出它是哪一支。
   */
  function nextLabel(strategyScriptId: number): string {
    const taken = new Set(signalSources.value.map(signalSource => signalSource.label))
    const strategyScriptName = strategyScriptOptions().find(
      option => option.value === strategyScriptId)?.label.trim() ?? ''

    // 一支策略腳本都還沒得挑時只能退回舊做法——那時畫面上已經在說「先去建一支策略腳本」了。
    if (strategyScriptName === '') {
      for (let offset = 0; offset < 26; offset += 1) {
        const candidate = String.fromCharCode('A'.charCodeAt(0) + offset)
        if (!taken.has(candidate)) {
          return candidate
        }
      }

      return `來源${signalSources.value.length + 1}`
    }

    if (!taken.has(strategyScriptName)) {
      return strategyScriptName
    }

    for (let suffix = 2; ; suffix += 1) {
      const candidate = `${strategyScriptName} ${suffix}`
      if (!taken.has(candidate)) {
        return candidate
      }
    }
  }

  /**
   * 換這一份吃的行情。原本有信號來源的話**全部拿掉**並留一句話：
   * 它們吃的是另一種行情，留著只會在存的時候被拒絕——而那時使用者已經拼好整棵樹了。
   */
  function changeMarketDataKind(nextMarketDataKind: MarketDataKind) {
    if (marketDataKindLocked.value || nextMarketDataKind === marketDataKind.value) {
      return
    }

    marketDataKind.value = nextMarketDataKind
    if (signalSources.value.length > 0) {
      signalSources.value = []
      committedLabels.value = []
      marketDataKindNotice.value = MARKET_DATA_KIND_CHANGED_NOTICE
    }
  }

  function changeTradingMode(nextTradingMode: ContractTradingMode) {
    tradingMode.value = nextTradingMode
  }

  function removeSignalSource(index: number) {
    signalSources.value = signalSources.value.filter((_, position) => position !== index)
    committedLabels.value = committedLabels.value.filter((_, position) => position !== index)
  }

  /**
   * 改代號時，條件裡指到舊代號的那幾句一起改。
   *
   * 不跟著改的話，使用者把 A 改成「均線」之後，條件會指向一個不存在的代號——
   * 而畫面上那一句看起來完全正常。
   *
   * **撞名的那一刻不改條件**，這是這段唯一不明顯、但非改不可的地方：
   * 條件只記得代號那一串字，所以改名是一次全樹的字串取代。使用者在兩個來源之間
   * 對調代號時必然會經過一個「兩個都叫 A」的瞬間（欄位是逐字觸發的），
   * 那一刻如果照改，兩個來源的條件就**永久合併成同一句**——他把第二個改走之後，
   * 原本屬於另一支策略腳本的那一句已經悄悄變成重複的一句，而畫面上一個字都沒提。
   *
   * 所以條件記著的是 committedLabels：**最後一個沒有撞名的代號**。撞名期間欄位照改
   * （使用者才看得到那句重複的提醒），條件按兵不動；等他把名字弄乾淨了，
   * 再從條件真正還指著的那一個改過去。
   */
  function changeSignalSourceLabel(index: number, label: string) {
    replaceSignalSource(index, signalSource => new TradingStrategySignalSourceDto(
      label, signalSource.strategyScriptId, signalSource.aggregationInterval, signalSource.parameterValues))

    const committedLabel = committedLabels.value[index]
    const takenByOthers = signalSources.value
      .filter((_unused, position) => position !== index)
      .map(signalSource => signalSource.label.trim())

    if (committedLabel === undefined || label.trim() === committedLabel
      || takenByOthers.includes(label.trim())) {
      return
    }

    // 條件跟著改名。代號是條件指著來源的唯一方式，改了名卻不跟著改的話，
    // 那幾條會指著一個已經不存在的名字。
    boards.buy.value = new ConditionBoardDomain(boards.buy.value).renamed(committedLabel, label).value
    boards.sell.value = new ConditionBoardDomain(boards.sell.value).renamed(committedLabel, label).value
    committedLabels.value = committedLabels.value.map(
      (existing, position) => (position === index ? label : existing))
  }

  /** 換策略腳本時把舊策略腳本的旋鈕值清掉——它們屬於另一支算式，留著只會被後端拒絕。 */
  function changeSignalSourceStrategyScript(index: number, strategyScriptId: number) {
    replaceSignalSource(index, signalSource => new TradingStrategySignalSourceDto(
      signalSource.label, strategyScriptId, signalSource.aggregationInterval, []))
  }

  function changeSignalSourceInterval(index: number, aggregationInterval: string) {
    replaceSignalSource(index, signalSource => new TradingStrategySignalSourceDto(
      signalSource.label, signalSource.strategyScriptId, aggregationInterval, signalSource.parameterValues))
  }

  function changeSignalSourceParameterValue(index: number, parameterName: string, value: number) {
    replaceSignalSource(index, signalSource => new TradingStrategySignalSourceDto(
      signalSource.label,
      signalSource.strategyScriptId,
      signalSource.aggregationInterval,
      [
        ...signalSource.parameterValues.filter(existing => existing.name !== parameterName),
        new StrategyBotParameterValueDto(parameterName, value),
      ],
    ))
  }

  function replaceSignalSource(
    index: number,
    transform: (signalSource: TradingStrategySignalSourceDto) => TradingStrategySignalSourceDto,
  ) {
    signalSources.value = signalSources.value.map(
      (signalSource, position) => (position === index ? transform(signalSource) : signalSource))
  }

  /**
   * 兩邊的判斷，以條件卡的形狀跟著使用者的每一次點擊走。
   *
   * 它由存進來的那棵樹讀出來一次，之後就是這一頁的狀態；要送出去時再寫回一棵樹。
   * **兩邊各存一份的話，第二份遲早會說出第一份沒有的話**——所以樹那一份只在
   * 讀進來與送出去這兩個時刻存在。
   */
  const boards = {
    buy: ref(new TradingStrategyConditionDomain(null).toBoardDto()),
    sell: ref(new TradingStrategyConditionDomain(null).toBoardDto()),
  }

  /**
   * 兩邊的判斷長得一模一樣，所以它們共用這一段而不是各寫一份。
   * 寫兩份的話，第二份就是那個忘記同步的地方。
   */
  function conditionSide(
    key: ConditionSideVo,
    heading: string,
    tone: 'success' | 'danger',
    connectorWord: string,
  ) {
    const board = boards[key]

    /**
     * 每次讀之前先跟這一刻的來源對齊。
     *
     * 條件指得到哪幾個來源，是由**訊號來源**決定的：刪一支就少一條，改代號就跟著改。
     * 對齊寫在讀的路上而不是各個改動的路上，是因為來源有五種改法，
     * 而每一種都要記得同步一次的話，第五種就是那個被忘記的。
     */
    const aligned = computed(
      () => new ConditionBoardDomain(board.value).alignedTo(sourceLabels.value))

    return {
      key,
      heading,
      /** 買入那一張用上漲的綠，賣出那一張用下跌的紅——與整站漲跌的顏色同一套。 */
      tone,
      /** 卡與卡之間那一小段線上寫的字：來源拿來判斷買入，而賣出與買入同時在看。 */
      connectorWord,
      board: computed(() => aligned.value.toDto()),
      condition: computed(() => aligned.value.toCondition()),
      toggleSignal: (sourceLabel: string, signal: string) => {
        board.value = aligned.value.toggleSignal(sourceLabel, signal).value
      },
      /** 加一條條件：那個來源排到最後面，而且只收挑的那一個信號。 */
      addClause: (sourceLabel: string, signal: string) => {
        board.value = aligned.value.addClause(sourceLabel, signal).value
      },
      /** 把一條條件排到這張卡的第幾格；已經在上面就是換位置。 */
      placeAt: (sourceLabel: string, position: number) => {
        board.value = aligned.value.placeAt(sourceLabel, position).value
      },
      /** 把一條條件從這張卡上拿掉。那個訊號來源還在，不是被刪掉。 */
      takeOff: (sourceLabel: string) => {
        board.value = aligned.value.takeOff(sourceLabel).value
      },
      /** 把一條條件扣到另一條上，變成一組——「A 而且（B 或 C）」唯一的寫法。 */
      bundleOnto: (sourceLabel: string, targetLabel: string) => {
        board.value = aligned.value.bundleOnto(sourceLabel, targetLabel).value
      },
      /** 把一條單獨的條件和另一格扣成一組；往哪個方向扣由 ConditionBoardDomain 決定。 */
      bundleWith: (sourceLabel: string, targetKey: string) => {
        board.value = aligned.value.bundleWith(sourceLabel, targetKey).value
      },
      /** 把一條條件從一組裡拆出來，放回它自己一格。 */
      unbundle: (sourceLabel: string) => {
        board.value = aligned.value.unbundle(sourceLabel).value
      },
      /** 把一整組拆開，回到一條一條、順序不變。 */
      splitBundle: (itemKey: string) => {
        board.value = aligned.value.splitBundle(itemKey).value
      },
      /** 換掉某一組裡面怎麼合併。 */
      changeBundleOperator: (itemKey: string, operator: ConditionOperatorVo) => {
        board.value = aligned.value.changeBundleOperator(itemKey, operator).value
      },
      changeOperator: (operator: ConditionOperatorVo) => {
        board.value = aligned.value.changeOperator(operator).value
      },
    }
  }

  const conditionSides = [
    conditionSide('buy', '什麼算買入', 'success', '拿來判斷'),
    conditionSide('sell', '什麼算賣出', 'danger', '同時也看'),
  ]

  return {
    name,
    marketDataKind,
    tradingMode,
    marketDataKindNotice,
    marketDataKindLocked,
    replaysOnContractAccount,
    changeMarketDataKind,
    changeTradingMode,
    signalSources,
    sourceLabels,
    intervalOptions,
    signalOptions: SIGNAL_OPTIONS,
    canAddSignalSource,
    // 與擋住新增的是同一個數字，往下傳給要說出它的那個元件。
    signalSourceLimit: STRATEGY_BOT_LIMITS.signalSourceCount,
    signalSourceUsageWarnings,
    signalSourceStrategyScriptLabels,
    signalSourceParameterSummaries,
    signalSourceParameterInputs,
    conditionSides,
    rejection,
    reset,
    toWriteDto,
    addSignalSource,
    removeSignalSource,
    changeSignalSourceLabel,
    changeSignalSourceStrategyScript,
    changeSignalSourceInterval,
    changeSignalSourceParameterValue,
  }
}
