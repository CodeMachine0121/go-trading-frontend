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
   * 哪幾個來源現在刪不掉，以及為什麼。
   *
   * 刪掉一個還被條件用著的來源，會讓條件指向一個不存在的代號。這裡**擋住那次刪除**
   * 並說出是哪裡在用它——比默默把條件一起刪掉誠實得多。
   */
  const signalSourceRemovalBlockedReasons = computed(() => {
    const usedLabels = new Set([
      ...new StrategyBotConditionDomain(buyCondition.value).usedSourceLabels(),
      ...new StrategyBotConditionDomain(sellCondition.value).usedSourceLabels(),
    ])

    const blocked: Record<number, string> = {}
    signalSources.value.forEach((signalSource, index) => {
      if (usedLabels.has(signalSource.label)) {
        blocked[index] = `條件裡還在用「${signalSource.label}」，要先把那幾句改掉或刪掉`
      }
    })

    return blocked
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
    buyCondition.value = loaded?.buyCondition ?? null
    sellCondition.value = loaded?.sellCondition ?? null
  }

  function addSignalSource() {
    if (!canAddSignalSource.value) {
      return
    }

    signalSources.value = [
      ...signalSources.value,
      new StrategyBotSignalSourceDto(
        nextLabel(),
        strategyOptions()[0]?.value ?? 0,
        DEFAULT_AGGREGATION_INTERVAL,
        [],
      ),
    ]
  }

  /**
   * 下一個沒人用的代號。
   *
   * 自動給一個，是因為代號是這張表單上唯一沒有預設值就填不完的欄位——
   * 而 A、B、C 正是絕大多數人會自己打的那幾個字。
   */
  function nextLabel(): string {
    const taken = new Set(signalSources.value.map(signalSource => signalSource.label))

    for (let offset = 0; offset < 26; offset += 1) {
      const candidate = String.fromCharCode('A'.charCodeAt(0) + offset)
      if (!taken.has(candidate)) {
        return candidate
      }
    }

    return `來源${signalSources.value.length + 1}`
  }

  function removeSignalSource(index: number) {
    if (signalSourceRemovalBlockedReasons.value[index] !== undefined) {
      return
    }

    signalSources.value = signalSources.value.filter((_, position) => position !== index)
  }

  /**
   * 改代號時，條件裡指到舊代號的那幾句一起改。
   *
   * 不跟著改的話，使用者把 A 改成「均線」之後，條件會指向一個不存在的代號——
   * 而畫面上那一句看起來完全正常。
   */
  function changeSignalSourceLabel(index: number, label: string) {
    const previousLabel = signalSources.value[index]?.label
    replaceSignalSource(index, signalSource => new StrategyBotSignalSourceDto(
      label, signalSource.strategyId, signalSource.aggregationInterval, signalSource.parameterValues))

    if (previousLabel !== undefined && previousLabel !== label) {
      buyCondition.value = new StrategyBotConditionDomain(buyCondition.value)
        .renameSourceLabel(previousLabel, label).value
      sellCondition.value = new StrategyBotConditionDomain(sellCondition.value)
        .renameSourceLabel(previousLabel, label).value
    }
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
      // 拿得掉的那幾個。剩兩句的群組裡那幾句不在裡面，所以它們的刪除鍵不存在——
      // 規則在畫面上的樣子是**做不到**，而不是被拒絕。
      removableNodeIds: computed(() => collectNodeIds(condition.value)
        .filter(nodeId => tree.value.canRemove(nodeId))),
      canAdd: (nodeId: string) => tree.value.canAddUnder(nodeId),
      start: () => apply(domain => domain.startWithComparison(firstLabel())),
      addComparison: (parentNodeId: string) =>
        apply(domain => domain.addComparison(parentNodeId, firstLabel())),
      addGroup: (parentNodeId: string) =>
        apply(domain => domain.addGroup(parentNodeId, firstLabel())),
      changeOperator: (nodeId: string, operator: ConditionOperatorVo) =>
        apply(domain => domain.changeOperator(nodeId, operator)),
      changeComparison: (nodeId: string, sourceLabel: string, signal: string) =>
        apply(domain => domain.changeComparison(nodeId, sourceLabel, signal)),
      wrapInGroup: (nodeId: string) =>
        apply(domain => domain.wrapInGroup(nodeId, firstLabel())),
      remove: (nodeId: string) => apply(domain => domain.removeNode(nodeId)),
    }
  }

  /** 新加的那一句預設指向第一個來源——留空的話畫面上會多出一句永遠不成立的條件。 */
  function firstLabel(): string {
    return sourceLabels.value[0] ?? ''
  }

  function collectNodeIds(condition: StrategyBotConditionDto | null): string[] {
    if (condition === null) {
      return []
    }

    return [
      condition.nodeId,
      ...condition.conditions.flatMap(child => collectNodeIds(child)),
    ]
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
    signalSourceRemovalBlockedReasons,
    conditionSides,
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
