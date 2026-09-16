// @vitest-environment nuxt
import { describe, expect, it } from 'vitest'
import { ConditionBlockVo } from '~/domain/models/vo/condition-block-vo'
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

  it('對調兩個代號時，兩邊的條件不會被合併成同一句', () => {
    // 欄位是逐字觸發的，所以對調必然經過一個「兩個都叫 A」的瞬間。
    // 那一刻若照改，B 的那一句會永久變成 A 的那一句——而畫面上一個字都沒提。
    const form = formUnderTest(aStoredBot())
    form.reset()

    // 把 B 改成 A（撞名），再把 A 改成 MA。
    form.changeSignalSourceLabel(1, 'A')
    form.changeSignalSourceLabel(0, 'MA')

    const buyCondition = form.conditionSides[0]?.condition.value
    const usedLabels = [
      buyCondition?.conditions[0]?.sourceLabel,
      buyCondition?.conditions[1]?.sourceLabel,
    ]

    expect(new Set(usedLabels).size).toBe(2)
    expect(usedLabels).toContain('MA')
  })

  it('撞名期間條件按兵不動，名字弄乾淨之後才跟上', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()

    form.changeSignalSourceLabel(1, 'A')
    // 撞名的那一刻，B 的那一句還指著 B。
    expect(form.conditionSides[0]?.condition.value?.conditions[1]?.sourceLabel).toBe('B')

    form.changeSignalSourceLabel(1, 'RSI')
    // 弄乾淨之後，它才從 B 改過去。
    expect(form.conditionSides[0]?.condition.value?.conditions[1]?.sourceLabel).toBe('RSI')
  })

  it('刪一個還被條件用著的來源之前先說一聲，但不擋', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()

    expect(form.signalSourceUsageWarnings.value[0]).toContain('「A」')

    form.removeSignalSource(0)

    expect(form.signalSources.value).toHaveLength(1)
  })

  it('沒有被條件用著的來源刪得掉', () => {
    const form = formUnderTest()
    form.reset()
    form.addSignalSource()

    expect(form.signalSourceUsageWarnings.value[0]).toBeUndefined()

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
  it('從無到有：空的那一棵就是一個洞，放一塊進去它就是整棵樹', () => {
    const form = formUnderTest()
    form.reset()
    form.addSignalSource()

    const buySide = form.conditionSides[0]!
    expect(buySide.condition.value).toBeNull()
    expect(buySide.view.value.kind).toBe('hole')

    buySide.fill(buySide.view.value.hole!, new ConditionBlockVo('comparison', 'A', null))

    expect(buySide.condition.value?.isGroup).toBe(false)
    expect(buySide.condition.value?.sourceLabel).toBe('A')
  })

  it('放完就把選著的空位清掉——它已經不是空的了', () => {
    // 繼續指著它，下一次點抽屜會落到一個不存在的地方。
    const form = formUnderTest()
    form.reset()
    form.addSignalSource()

    const buySide = form.conditionSides[0]!
    buySide.selectHole(buySide.view.value.hole!)
    expect(form.selectedHole.value).not.toBeNull()

    buySide.fill(buySide.view.value.hole!, new ConditionBlockVo('comparison', 'A', null))

    expect(form.selectedHole.value).toBeNull()
  })

  it('抽屜只認一個空位——兩棵樹共用它，所以不能各記各的', () => {
    const form = formUnderTest()
    form.reset()
    form.addSignalSource()

    const [buySide, sellSide] = form.conditionSides
    buySide!.selectHole(buySide!.view.value.hole!)
    sellSide!.selectHole(sellSide!.view.value.hole!)

    expect(buySide!.selectedHoleKey.value).toBeNull()
    expect(sellSide!.selectedHoleKey.value).not.toBeNull()
  })

  it('改了來源，抽屜立刻跟著改', () => {
    const form = formUnderTest()
    form.reset()
    form.addSignalSource()

    expect(form.blockDrawer.value.comparisons.map(option => option.label)).toEqual(['A 等於…'])

    form.addSignalSource()

    expect(form.blockDrawer.value.comparisons.map(option => option.label))
      .toEqual(['A 等於…', 'B 等於…'])
  })

  it('改了代號，抽屜與樹上那幾句一起跟著改', () => {
    // 抽屜列的是這一刻拼得出來的東西。它不跟著改的話，使用者會看到一塊指向
    // 舊代號的積木，而那個代號已經不存在了。
    const form = formUnderTest(aStoredBot())
    form.reset()

    form.changeSignalSourceLabel(0, 'MA')

    expect(form.blockDrawer.value.comparisons.map(option => option.label)).toContain('MA 等於…')
    expect(form.conditionSides[0]!.condition.value!.conditions[0]!.sourceLabel).toBe('MA')
  })

  it('還被條件用著的來源刪得掉，刪完那幾句自己標成找不到來源', () => {
    // 擋住它的代價比想像中大：只有一個來源、而兩棵樹都在用它的人，
    // 得先把兩棵樹拆光才換得掉那一支策略。
    const form = formUnderTest(aStoredBot())
    form.reset()

    expect(form.signalSourceUsageWarnings.value[0]).toContain('A')

    form.removeSignalSource(0)

    // 樹上那幾句仍然指著 A，而 A 已經不在宣告過的代號裡了。
    expect(form.sourceLabels.value).not.toContain('A')
    expect(form.rejection.value).not.toBeNull()
  })

  it('一個來源都沒有時，抽屜說得出要先去宣告一個', () => {
    const form = formUnderTest()
    form.reset()

    expect(form.blockDrawer.value.comparisons).toEqual([])
    expect(form.blockDrawer.value.hint).toContain('信號來源')
  })

  it('群組剩兩句時，那兩句都拿不掉——規則在畫面上的樣子是做不到，不是按了才被拒', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()

    const buySide = form.conditionSides[0]!
    const view = buySide.view.value

    expect(view.removable).toBe(true)
    expect(view.children.filter(child => child.kind !== 'hole')
      .every(child => !child.removable)).toBe(true)
  })

  it('拖著的那一塊放不進自己底下——那會把一段樹接到它自己身上', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()

    const buySide = form.conditionSides[0]!
    form.startDraggingNode('buy', buySide.condition.value!.nodeId)
    const ownHole = buySide.view.value.children.find(child => child.kind === 'hole')!.hole!

    expect(buySide.acceptsDragged(ownHole)).toBe(false)
  })

  it('拖著一塊抽屜裡的積木時，放得進去的空位說收', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()

    const buySide = form.conditionSides[0]!
    form.startDraggingBlock(new ConditionBlockVo('comparison', 'A', null))
    const hole = buySide.view.value.children.find(child => child.kind === 'hole')!.hole!

    expect(buySide.acceptsDragged(hole)).toBe(true)

    buySide.dropDragged(hole)

    expect(form.dragging.value).toBeNull()
    expect(buySide.condition.value!.conditions).toHaveLength(3)
  })

  it('沒有人在拖的時候，每一個空位都不收', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()

    const buySide = form.conditionSides[0]!
    const hole = buySide.view.value.children.find(child => child.kind === 'hole')!.hole!

    expect(buySide.acceptsDragged(hole)).toBe(false)
  })

  it('買入與賣出各自編各自的，互不影響', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()

    form.conditionSides[0]?.remove('root')

    expect(form.conditionSides[0]?.condition.value).toBeNull()
    expect(form.conditionSides[1]?.condition.value?.sourceLabel).toBe('A')
  })
})
