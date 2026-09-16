import { ConditionBoardDomain } from '~/domain/models/domains/condition-board-domain'
import {
  ConditionBoardDto,
  ConditionBoardItemDto,
  ConditionBoardPieceDto,
} from '~/domain/models/dto/condition-board-dto'
import { StrategyBotConditionDomain } from '~/domain/models/domains/strategy-bot-condition-domain'
import { StrategyBotWriteDomain } from '~/domain/models/domains/strategy-bot-write-domain'
import type { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import {
  StrategyBotParameterValueDto,
  StrategyBotSignalSourceDto,
} from '~/domain/models/dto/strategy-bot-signal-source-dto'
import { StrategyBotWriteDto } from '~/domain/models/dto/strategy-bot-write-dto'
import { AGGREGATION_INTERVALS } from '~/domain/models/vo/aggregation-interval-vo'
import type { ConditionOperatorVo } from '~/domain/models/vo/condition-operator-vo'
import { STRATEGY_BOT_LIMITS } from '~/domain/models/vo/strategy-bot-limits-vo'

/** 一句比對挑得到的三個值。信號只有三個，所以它是選的。 */
const SIGNAL_OPTIONS = [
  { value: 'buy', label: '買入' },
  { value: 'sell', label: '賣出' },
  { value: 'hold', label: '持有' },
] as const

/** 一台新機器人的預設觸發間隔。五分鐘：夠密、又不會密到每一輪都讀到同一根。 */
const DEFAULT_TRIGGER_INTERVAL_MINUTES = 5

/** 新增一個信號來源時它的預設刻度。與預設間隔同一個理由。 */
const DEFAULT_AGGREGATION_INTERVAL = '5m'

/**
 * 表單的狀態與每一個改得動它的動作。
 *
 * 它住在 composable 而不是元件裡，是因為「加一句比對」與「加一個信號來源」是同一件事的
 * 兩半：條件挑得到什麼，由信號來源決定。兩半分在兩個元件裡的話，
 * 那條連線就得靠 props 一層層傳，而傳錯的那一天不會有人發現。
 *
 * 規則本身一句都不在這裡——形狀規則問 StrategyBotConditionDomain，
 * 送不送得出去問 StrategyBotWriteDomain。這裡只負責把它們接上畫面。
 */
export function useStrategyBotForm(
  editing: () => StrategyBotDto | null,
  strategyOptions: () => readonly { value: number, label: string }[],
) {
  const name = ref('')
  const symbol = ref('')
  const triggerIntervalText = ref(String(DEFAULT_TRIGGER_INTERVAL_MINUTES))
  const signalSources = ref<StrategyBotSignalSourceDto[]>([])
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

  const triggerIntervalMinutes = computed(() => {
    const parsed = Number(triggerIntervalText.value)

    return Number.isFinite(parsed) ? parsed : 0
  })

  const canAddSignalSource = computed(
    () => signalSources.value.length < STRATEGY_BOT_LIMITS.signalSourceCount)

  /**
   * 哪幾個來源被條件用著，以及被誰用著。
   *
   * 它**不再擋住刪除**。原本會擋，理由是「刪了條件就會指向一個不存在的代號」——
   * 而那件事現在**看得見**：那幾句會自己標成「找不到這個來源」，而且送不出去。
   *
   * 擋住的代價比想像中大：使用者只有一個來源、而兩棵樹都在用它的時候，
   * 他得先把兩棵樹拆光才刪得掉那一個來源，才換得掉一支策略。
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
        warnings[index] = `條件裡還在用「${signalSource.label}」，刪掉之後那幾句要改或拿掉`
      }
    })

    return warnings
  })

  const rejection = computed(() => new StrategyBotWriteDomain(buildWriteDto()).rejection)

  function buildWriteDto(): StrategyBotWriteDto {
    return new StrategyBotWriteDto(
      editing()?.id,
      name.value,
      symbol.value,
      triggerIntervalMinutes.value,
      signalSources.value,
      conditionSides[0].condition.value,
      conditionSides[1].condition.value,
    )
  }

  /** 送不出去時回 null——擋下來的那一句已經在 rejection 裡說了。 */
  function toWriteDto(): StrategyBotWriteDto | null {
    const writeDto = buildWriteDto()

    return new StrategyBotWriteDomain(writeDto).isSendable ? writeDto : null
  }

  /** 每次打開對話框都重來一次：改到一半關掉再打開，看到的應該是庫裡那一台。 */
  function reset() {
    const loaded = editing()

    name.value = loaded?.name ?? ''
    symbol.value = loaded?.symbol ?? ''
    triggerIntervalText.value = String(
      loaded?.triggerIntervalMinutes ?? DEFAULT_TRIGGER_INTERVAL_MINUTES)
    signalSources.value = [...(loaded?.signalSources ?? [])]
    committedLabels.value = signalSources.value.map(signalSource => signalSource.label)
    // 存進來的那棵樹在這裡、而且只在這裡，被讀成「墊子上擺了哪幾塊」。
    boards.buy.value = new StrategyBotConditionDomain(loaded?.buyCondition ?? null).toBoardDto()
    boards.sell.value = new StrategyBotConditionDomain(
      loaded?.sellCondition ?? null).toBoardDto()
  }

  function addSignalSource() {
    if (!canAddSignalSource.value) {
      return
    }

    const strategyId = strategyOptions()[0]?.value ?? 0
    const label = nextLabel(strategyId)

    signalSources.value = [
      ...signalSources.value,
      new StrategyBotSignalSourceDto(
        label,
        strategyId,
        DEFAULT_AGGREGATION_INTERVAL,
        [],
      ),
    ]
    committedLabels.value = [...committedLabels.value, label]
  }

  /**
   * 下一個沒人用的代號，預設就是**那支策略的名字**。
   *
   * 原本給的是 A、B、C，而那讓條件讀起來是「A 等於買入」——一句看不出自己在說什麼的話。
   * 使用者得自己記住 A 是哪一支，而他同時在讀的是一棵三層深的樹。
   * 用策略的名字，同一句就變成「MACD 交叉 等於買入」，不必記任何東西。
   *
   * 撞名時後面接一個數字而不是換一個字母：同一支策略用兩次（不同參數）正是代號
   * 存在的理由，而「MACD 交叉 2」仍然說得出它是哪一支。
   */
  function nextLabel(strategyId: number): string {
    const taken = new Set(signalSources.value.map(signalSource => signalSource.label))
    const strategyName = strategyOptions().find(
      option => option.value === strategyId)?.label.trim() ?? ''

    // 一支策略都還沒得挑時只能退回舊做法——那時畫面上已經在說「先去建一支策略」了。
    if (strategyName === '') {
      for (let offset = 0; offset < 26; offset += 1) {
        const candidate = String.fromCharCode('A'.charCodeAt(0) + offset)
        if (!taken.has(candidate)) {
          return candidate
        }
      }

      return `來源${signalSources.value.length + 1}`
    }

    if (!taken.has(strategyName)) {
      return strategyName
    }

    for (let suffix = 2; ; suffix += 1) {
      const candidate = `${strategyName} ${suffix}`
      if (!taken.has(candidate)) {
        return candidate
      }
    }
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
   * 原本屬於另一支策略的那一句已經悄悄變成重複的一句，而畫面上一個字都沒提。
   *
   * 所以條件記著的是 committedLabels：**最後一個沒有撞名的代號**。撞名期間欄位照改
   * （使用者才看得到那句重複的提醒），條件按兵不動；等他把名字弄乾淨了，
   * 再從條件真正還指著的那一個改過去。
   */
  function changeSignalSourceLabel(index: number, label: string) {
    replaceSignalSource(index, signalSource => new StrategyBotSignalSourceDto(
      label, signalSource.strategyId, signalSource.aggregationInterval, signalSource.parameterValues))

    const committedLabel = committedLabels.value[index]
    const takenByOthers = signalSources.value
      .filter((_unused, position) => position !== index)
      .map(signalSource => signalSource.label.trim())

    if (committedLabel === undefined || label.trim() === committedLabel
      || takenByOthers.includes(label.trim())) {
      return
    }

    // 表上那一列跟著改名。代號是列的身分，改了名卻不跟著改的話，
    // 使用者會看到一列空白的新策略，和一列指著一個已經不存在的名字的舊資料。
    boards.buy.value = renamedPieces(boards.buy.value, committedLabel, label)
    boards.sell.value = renamedPieces(boards.sell.value, committedLabel, label)
    committedLabels.value = committedLabels.value.map(
      (existing, position) => (position === index ? label : existing))
  }

  /** 換策略時把舊策略的旋鈕值清掉——它們屬於另一支算式，留著只會被後端拒絕。 */
  function changeSignalSourceStrategy(index: number, strategyId: number) {
    replaceSignalSource(index, signalSource => new StrategyBotSignalSourceDto(
      signalSource.label, strategyId, signalSource.aggregationInterval, []))
  }

  function changeSignalSourceInterval(index: number, aggregationInterval: string) {
    replaceSignalSource(index, signalSource => new StrategyBotSignalSourceDto(
      signalSource.label, signalSource.strategyId, aggregationInterval, signalSource.parameterValues))
  }

  function changeSignalSourceParameterValue(index: number, parameterName: string, value: number) {
    replaceSignalSource(index, signalSource => new StrategyBotSignalSourceDto(
      signalSource.label,
      signalSource.strategyId,
      signalSource.aggregationInterval,
      [
        ...signalSource.parameterValues.filter(existing => existing.name !== parameterName),
        new StrategyBotParameterValueDto(parameterName, value),
      ],
    ))
  }

  /** 墊子上某一塊零件改名之後的樣子。它擺在哪裡、收什麼，一樣都不動。 */
  function renamedPieces(board: ConditionBoardDto, fromLabel: string, toLabel: string) {
    return new ConditionBoardDto(
      board.operator,
      board.items.map(item => new ConditionBoardItemDto(
        item.operator,
        item.pieces.map(piece => (piece.sourceLabel === fromLabel
          ? new ConditionBoardPieceDto(toLabel, piece.acceptedSignals)
          : piece)),
      )),
      board.representable,
    )
  }

  function replaceSignalSource(
    index: number,
    transform: (signalSource: StrategyBotSignalSourceDto) => StrategyBotSignalSourceDto,
  ) {
    signalSources.value = signalSources.value.map(
      (signalSource, position) => (position === index ? transform(signalSource) : signalSource))
  }

  /**
   * 兩邊的判斷，以矩陣的形狀跟著使用者的每一次點擊走。
   *
   * 它由存進來的那棵樹讀出來一次，之後就是這一頁的狀態；要送出去時再寫回一棵樹。
   * **兩邊各存一份的話，第二份遲早會說出第一份沒有的話**——所以樹那一份只在
   * 讀進來與送出去這兩個時刻存在。
   */
  const boards = {
    buy: ref(new StrategyBotConditionDomain(null).toBoardDto()),
    sell: ref(new StrategyBotConditionDomain(null).toBoardDto()),
  }

  /**
   * 兩邊的判斷長得一模一樣，所以它們共用這一段而不是各寫一份。
   * 寫兩份的話，第二份就是那個忘記同步的地方。
   */
  function conditionSide(key: 'buy' | 'sell', heading: string) {
    const board = boards[key]

    /**
     * 每次讀之前先跟這一刻的來源對齊。
     *
     * 表的列是由**來源**決定的：加一支策略就多一列，刪一支就少一列，改代號就跟著改。
     * 對齊寫在讀的路上而不是各個改動的路上，是因為來源有五種改法，
     * 而每一種都要記得同步一次的話，第五種就是那個被忘記的。
     */
    const aligned = computed(
      () => new ConditionBoardDomain(board.value).alignedTo(sourceLabels.value))

    return {
      key,
      heading,
      board: computed(() => aligned.value.value),
      condition: computed(() => aligned.value.toCondition()),
      toggleSignal: (sourceLabel: string, signal: string) => {
        board.value = aligned.value.toggleSignal(sourceLabel, signal).value
      },
      /** 這張墊子上擺了這塊零件沒有。 */
      holds: (sourceLabel: string) => aligned.value.holds(sourceLabel),
      /** 把一塊零件擺上這張墊子的第幾格；已經在上面就是搬位置。 */
      placeAt: (sourceLabel: string, position: number) => {
        board.value = aligned.value.placeAt(sourceLabel, position).value
      },
      /** 把一塊零件從這張墊子上拿走。它回到架子上，不是被刪掉。 */
      takeOff: (sourceLabel: string) => {
        board.value = aligned.value.takeOff(sourceLabel).value
      },
      /** 把一塊零件扣到另一塊上，變成一組——「A 而且（B 或 C）」唯一的寫法。 */
      bundleOnto: (sourceLabel: string, targetLabel: string) => {
        board.value = aligned.value.bundleOnto(sourceLabel, targetLabel).value
      },
      /** 把一塊零件從一組裡拆出來，放回它自己一格。 */
      unbundle: (sourceLabel: string) => {
        board.value = aligned.value.unbundle(sourceLabel).value
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
    conditionSide('buy', '什麼算買入'),
    conditionSide('sell', '什麼算賣出'),
  ]

  return {
    name,
    symbol,
    triggerIntervalText,
    signalSources,
    sourceLabels,
    intervalOptions,
    signalOptions: SIGNAL_OPTIONS,
    canAddSignalSource,
    // 與擋住新增的是同一個數字，往下傳給要說出它的那個元件。
    signalSourceLimit: STRATEGY_BOT_LIMITS.signalSourceCount,
    signalSourceUsageWarnings,
    conditionSides,
    /**
     * 積木抽屜這一刻的樣子。
     *
     * 每次都由**這一刻已宣告的代號**與**現在選著的空位**重算，不留快取：
     * 抽屜列的就是現在拼得出來的東西，而使用者隨時會在第二段加一個、刪一個、改一個代號。
     */
    rejection,
    reset,
    toWriteDto,
    addSignalSource,
    removeSignalSource,
    changeSignalSourceLabel,
    changeSignalSourceStrategy,
    changeSignalSourceInterval,
    changeSignalSourceParameterValue,
  }
}
