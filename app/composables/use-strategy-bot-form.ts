import { ConditionBlockPaletteDomain } from '~/domain/models/domains/condition-block-palette-domain'
import { StrategyBotConditionDomain } from '~/domain/models/domains/strategy-bot-condition-domain'
import { StrategyBotWriteDomain } from '~/domain/models/domains/strategy-bot-write-domain'
import type { StrategyBotConditionDto } from '~/domain/models/dto/strategy-bot-condition-dto'
import type { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import {
  StrategyBotParameterValueDto,
  StrategyBotSignalSourceDto,
} from '~/domain/models/dto/strategy-bot-signal-source-dto'
import { StrategyBotWriteDto } from '~/domain/models/dto/strategy-bot-write-dto'
import { AGGREGATION_INTERVALS } from '~/domain/models/vo/aggregation-interval-vo'
import type { ConditionBlockVo } from '~/domain/models/vo/condition-block-vo'
import type { ConditionHoleVo } from '~/domain/models/vo/condition-hole-vo'
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
  const buyCondition = ref<StrategyBotConditionDto | null>(null)
  const sellCondition = ref<StrategyBotConditionDto | null>(null)

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
      ...new StrategyBotConditionDomain(buyCondition.value).usedSourceLabels(),
      ...new StrategyBotConditionDomain(sellCondition.value).usedSourceLabels(),
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
      buyCondition.value,
      sellCondition.value,
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
    buyCondition.value = loaded?.buyCondition ?? null
    sellCondition.value = loaded?.sellCondition ?? null
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

    buyCondition.value = new StrategyBotConditionDomain(buyCondition.value)
      .renameSourceLabel(committedLabel, label).value
    sellCondition.value = new StrategyBotConditionDomain(sellCondition.value)
      .renameSourceLabel(committedLabel, label).value
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

  function replaceSignalSource(
    index: number,
    transform: (signalSource: StrategyBotSignalSourceDto) => StrategyBotSignalSourceDto,
  ) {
    signalSources.value = signalSources.value.map(
      (signalSource, position) => (position === index ? transform(signalSource) : signalSource))
  }

  /**
   * 使用者剛剛點的那個空位，連同它在哪一棵樹上。
   *
   * **一個，不是兩個**：抽屜只有一個，所以「現在要放進哪裡」全畫面只能有一個答案。
   * 兩棵樹各記一個的話，點了買入那邊再點賣出那邊，抽屜就得決定聽誰的。
   */
  const selectedHole = ref<{ side: 'buy' | 'sell', hole: ConditionHoleVo } | null>(null)

  /**
   * 正被拖著的東西：抽屜裡的一塊，或樹上已經有的一塊。
   *
   * 拖放通道只搬得動字串，而字串要變回一塊積木得有人認得那個格式——
   * 那個方向沒有來源物件可以掛，只會是一個 static。所以拖著的是什麼記在這裡，
   * 通道裡那串字只是為了讓瀏覽器認得這是一次拖曳。
   */
  const dragging = ref<
    | { kind: 'block', block: ConditionBlockVo }
    | { kind: 'node', side: 'buy' | 'sell', nodeId: string }
    | null
  >(null)

  /**
   * 兩棵樹的每一個動作長得一模一樣，所以它們共用這一段而不是各寫一份。
   * 寫兩份的話，第二份就是那個忘記同步的地方。
   */
  function conditionSide(
    key: 'buy' | 'sell',
    heading: string,
    condition: Ref<StrategyBotConditionDto | null>,
  ) {
    const tree = computed(() => new StrategyBotConditionDomain(condition.value))

    function apply(transform: (domain: StrategyBotConditionDomain) => StrategyBotConditionDomain) {
      condition.value = transform(tree.value).value
    }

    return {
      key,
      heading,
      condition,
      /** 這一棵畫出來的樣子，洞與每一塊的狀態都已經在裡面了。 */
      view: computed(() => tree.value.toViewDto(sourceLabels.value)),
      /** 這一棵還差什麼。沒話說就是拼好了。 */
      incompleteReason: computed(() => tree.value.incompleteReason(sourceLabels.value)),
      /** 使用者現在選著的空位是不是在這一棵上，是的話是哪一個。 */
      selectedHoleKey: computed(() => (
        selectedHole.value?.side === key ? selectedHole.value.hole.key : null)),
      /**
       * 點一個空位就選它；**再點同一個就放掉**。
       *
       * 沒有放掉那條路的話，點了一個空位又決定不放東西的人，
       * 就困在一個永遠開著的抽屜旁邊——因為把抽屜撐開的正是那個選取，
       * 而畫面上沒有任何動作取消得了它。
       */
      selectHole: (hole: ConditionHoleVo) => {
        selectedHole.value = selectedHole.value?.side === key
          && selectedHole.value.hole.key === hole.key
          ? null
          : { side: key, hole }
      },
      /**
       * 把一塊放進一個空位——點按與拖拉走的是同一個方法。
       *
       * 放完就把選著的空位清掉：那個空位已經不是空的了，繼續指著它會讓下一次點抽屜
       * 落到一個不存在的地方。
       */
      fill: (hole: ConditionHoleVo, block: ConditionBlockVo) => {
        apply(domain => domain.fill(hole, block))
        selectedHole.value = null
      },
      /** 把樹上已經有的一塊搬進一個空位，底下的一整串跟著走。 */
      move: (nodeId: string, hole: ConditionHoleVo) => {
        apply(domain => domain.move(nodeId, hole))
        selectedHole.value = null
      },
      changeOperator: (nodeId: string, operator: ConditionOperatorVo) =>
        apply(domain => domain.changeOperator(nodeId, operator)),
      changeComparison: (nodeId: string, sourceLabel: string, signal: string) =>
        apply(domain => domain.changeComparison(nodeId, sourceLabel, signal)),
      remove: (nodeId: string) => {
        apply(domain => domain.removeNode(nodeId))
        selectedHole.value = null
      },
      /**
       * 這個空位收不收現在拖著的那個東西。
       *
       * 落點問的與抽屜問的是同一個方法，所以一塊按得下去的積木一定也放得進去。
       * 拖著一個節點時多一條限制：它不得落進自己底下——那會把一段樹接到它自己身上。
       */
      acceptsDragged: (hole: ConditionHoleVo) => {
        const carried = dragging.value
        if (carried === null) {
          return false
        }

        if (carried.kind === 'block') {
          return tree.value.accepts(hole, carried.block)
        }

        return carried.side === key && tree.value.move(carried.nodeId, hole).value !== condition.value
      },
      /**
       * 把現在拖著的那一塊丟掉。
       *
       * 它與那顆「移除」鍵做的是同一件事，而兩條路都要有：拖著一塊已經抓在手上的積木時，
       * 最自然的丟法是把它扔出去，而不是放回原位再去找它的按鈕。
       * 反過來，沒有指標裝置的人只有按鈕那一條。
       *
       * 拖著的是抽屜裡的積木時什麼都不做——它本來就不在樹上，沒有東西可以丟。
       */
      dropAwayDragged: () => {
        const carried = dragging.value
        dragging.value = null

        if (carried?.kind === 'node' && carried.side === key) {
          apply(domain => domain.removeNode(carried.nodeId))
        }
      },
      /** 現在拖著的是這一棵上的一塊嗎——丟掉那一格要不要出現，看的就是這件事。 */
      isDraggingOwnNode: computed(
        () => dragging.value?.kind === 'node' && dragging.value.side === key),
      /** 把現在拖著的那個東西放進這個空位。放不進去時什麼都不做。 */
      dropDragged: (hole: ConditionHoleVo) => {
        const carried = dragging.value
        dragging.value = null

        if (carried === null) {
          return
        }

        if (carried.kind === 'block') {
          apply(domain => domain.fill(hole, carried.block))

          return
        }

        if (carried.side === key) {
          apply(domain => domain.move(carried.nodeId, hole))
        }
      },
    }
  }

  const conditionSides = [
    conditionSide('buy', '什麼情況算買入', buyCondition),
    conditionSide('sell', '什麼情況算賣出', sellCondition),
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
    blockDrawer: computed(() => new ConditionBlockPaletteDomain(
      new StrategyBotConditionDomain(
        selectedHole.value?.side === 'sell' ? sellCondition.value : buyCondition.value),
      sourceLabels.value,
      selectedHole.value?.hole ?? null,
    ).toDto()),
    selectedHole,
    dragging,
    /** 從抽屜開始拖一塊。 */
    startDraggingBlock: (block: ConditionBlockVo) => {
      dragging.value = { kind: 'block', block }
    },
    /** 從樹上開始拖一塊已經放好的。 */
    startDraggingNode: (side: 'buy' | 'sell', nodeId: string) => {
      dragging.value = { kind: 'node', side, nodeId }
    },
    /** 拖曳結束——不論有沒有放成功，拖著的那個東西都要放開。 */
    stopDragging: () => {
      dragging.value = null
    },
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
