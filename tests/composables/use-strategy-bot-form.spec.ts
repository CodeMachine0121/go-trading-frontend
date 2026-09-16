// @vitest-environment nuxt
import { describe, expect, it } from 'vitest'
import { StrategyBotConditionDto } from '~/domain/models/dto/strategy-bot-condition-dto'
import { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import { StrategyBotRunStateDto } from '~/domain/models/dto/strategy-bot-run-state-dto'
import { StrategyBotSignalSourceDto } from '~/domain/models/dto/strategy-bot-signal-source-dto'

const STRATEGY_OPTIONS = [
  { value: 9, label: '均線' },
  { value: 10, label: '動能' },
]

function formUnderTest(editing: StrategyBotDto | null = null) {
  return useStrategyBotForm(() => editing, () => STRATEGY_OPTIONS)
}

function aStoppedRunState() {
  return new StrategyBotRunStateDto(
    false, false, false, '已停止', 'neutral', '', '還沒送出過', true, false, true, '')
}

/** 一台存好的機器人，買入條件是「A 且 B」——足以證明讀回來時層次不變。 */
function aStoredBot() {
  return new StrategyBotDto(
    3, '早盤突破', 'BTCUSDT', 5,
    [
      new StrategyBotSignalSourceDto('A', 9, '1h', []),
      new StrategyBotSignalSourceDto('B', 10, '5m', []),
    ],
    new StrategyBotConditionDto('root', 'and', [
      new StrategyBotConditionDto('a', null, [], 'A', 'buy'),
      new StrategyBotConditionDto('b', null, [], 'B', 'buy'),
    ], '', ''),
    new StrategyBotConditionDto('s', null, [], 'A', 'sell'),
    aStoppedRunState(),
  )
}

describe('useStrategyBotForm 的三段順序', () => {
  it('條件挑得到的代號，是由信號來源那一段填出來的', () => {
    // 這一行就是「打不出錯誤的代號」的實作方式：選單裡沒有的東西選不到。
    const form = formUnderTest()
    form.reset()

    expect(form.sourceLabels.value).toEqual([])

    form.addSignalSource()
    form.addSignalSource()

    expect(form.sourceLabels.value).toEqual(['A', 'B'])
  })

  it('新加的來源自動拿到一個沒人用的代號', () => {
    // 代號是這張表單上唯一沒有預設值就填不完的欄位，而 A、B、C 正是多數人會打的那幾個。
    const form = formUnderTest()
    form.reset()
    form.addSignalSource()
    form.addSignalSource()
    form.addSignalSource()

    expect(form.signalSources.value.map(source => source.label)).toEqual(['A', 'B', 'C'])
  })

  it('到了上限就加不動——新增鍵因此消失，而不是按了才被拒', () => {
    const form = formUnderTest()
    form.reset()
    for (let index = 0; index < 10; index += 1) {
      form.addSignalSource()
    }

    expect(form.canAddSignalSource.value).toBe(false)

    form.addSignalSource()
    expect(form.signalSources.value).toHaveLength(10)
  })
})

describe('useStrategyBotForm 讓第三段跟得上第二段', () => {
  it('來源改名時，條件裡指到舊代號的那幾句一起改', () => {
    // 不跟著改的話，條件會指向一個不存在的代號，而畫面上那一句看起來完全正常。
    const form = formUnderTest(aStoredBot())
    form.reset()

    form.changeSignalSourceLabel(0, '均線交叉')

    const buyCondition = form.conditionSides[0]?.condition.value
    expect(buyCondition?.conditions[0]?.sourceLabel).toBe('均線交叉')
    expect(buyCondition?.conditions[1]?.sourceLabel).toBe('B')
  })

  it('還被條件用著的來源刪不掉，並說得出是哪裡在用它', () => {
    // 比默默把條件一起刪掉誠實得多。
    const form = formUnderTest(aStoredBot())
    form.reset()

    expect(form.signalSourceRemovalBlockedReasons.value[0]).toContain('「A」')

    form.removeSignalSource(0)
    expect(form.signalSources.value).toHaveLength(2)
  })

  it('沒有被條件用著的來源刪得掉', () => {
    const form = formUnderTest()
    form.reset()
    form.addSignalSource()

    expect(form.signalSourceRemovalBlockedReasons.value[0]).toBeUndefined()

    form.removeSignalSource(0)
    expect(form.signalSources.value).toHaveLength(0)
  })

  it('換策略時把舊策略的旋鈕值清掉', () => {
    // 它們屬於另一支算式，留著只會被後端拒絕。
    const form = formUnderTest()
    form.reset()
    form.addSignalSource()
    form.changeSignalSourceParameterValue(0, '回看根數', 20)

    expect(form.signalSources.value[0]?.parameterValues).toHaveLength(1)

    form.changeSignalSourceStrategy(0, 10)

    expect(form.signalSources.value[0]?.strategyId).toBe(10)
    expect(form.signalSources.value[0]?.parameterValues).toHaveLength(0)
  })
})

describe('useStrategyBotForm 讀回一台已存的', () => {
  it('巢狀的層次與存進去時相同', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()

    const buyCondition = form.conditionSides[0]?.condition.value
    expect(buyCondition?.isGroup).toBe(true)
    expect(buyCondition?.operator).toBe('and')
    expect(buyCondition?.conditions).toHaveLength(2)
  })

  it('每一個來源各自的刻度都正確帶出來', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()

    expect(form.signalSources.value[0]?.aggregationInterval).toBe('1h')
    expect(form.signalSources.value[1]?.aggregationInterval).toBe('5m')
  })

  it('改到一半關掉再打開，看到的是庫裡那一台', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()
    form.name.value = '改到一半'

    form.reset()

    expect(form.name.value).toBe('早盤突破')
  })
})

describe('useStrategyBotForm 送不送得出去', () => {
  it('填完三段就送得出去', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()

    expect(form.rejection.value).toBeNull()
    expect(form.toWriteDto()).not.toBeNull()
  })

  it('送不出去時 toWriteDto 回 null，理由在 rejection 裡', () => {
    const form = formUnderTest()
    form.reset()

    expect(form.rejection.value).toContain('取一個名稱')
    expect(form.toWriteDto()).toBeNull()
  })

  it('改一台已存的時候帶著它的識別碼', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()

    expect(form.toWriteDto()?.id).toBe(3)
  })
})

describe('useStrategyBotForm 的條件操作', () => {
  it('從無到有先放一句比對，而且它指向第一個來源', () => {
    const form = formUnderTest()
    form.reset()
    form.addSignalSource()

    const buySide = form.conditionSides[0]
    expect(buySide?.condition.value).toBeNull()

    buySide?.start()

    expect(buySide?.condition.value?.isGroup).toBe(false)
    expect(buySide?.condition.value?.sourceLabel).toBe('A')
  })

  it('群組剩兩句時，那兩句都不在拿得掉的名單裡', () => {
    // 規則在畫面上的樣子是**做不到**——刪除鍵消失，而不是按了才被拒。
    const form = formUnderTest(aStoredBot())
    form.reset()

    const buySide = form.conditionSides[0]
    expect(buySide?.removableNodeIds.value).toEqual(['root'])
  })

  it('買入與賣出各自編各自的，互不影響', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()

    form.conditionSides[0]?.remove('root')

    expect(form.conditionSides[0]?.condition.value).toBeNull()
    expect(form.conditionSides[1]?.condition.value?.sourceLabel).toBe('A')
  })
})
