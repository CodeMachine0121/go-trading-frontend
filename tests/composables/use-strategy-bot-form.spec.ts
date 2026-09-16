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

function comparison(nodeId: string, sourceLabel: string, signal: string) {
  return new StrategyBotConditionDto(nodeId, null, [], sourceLabel, signal)
}

/** 一台存好的機器人：買入是「均線＝買 且 動能＝買」，賣出是「均線＝賣」。 */
function aStoredBot() {
  return new StrategyBotDto(
    3, '早盤突破', 'BTCUSDT', 5,
    [
      new StrategyBotSignalSourceDto('均線', 9, '1h', []),
      new StrategyBotSignalSourceDto('動能', 10, '5m', []),
    ],
    new StrategyBotConditionDto('root', 'and', [
      comparison('a', '均線', 'buy'),
      comparison('b', '動能', 'buy'),
    ], '', ''),
    comparison('s', '均線', 'sell'),
    aStoppedRunState(),
  )
}

/** 一張表讀成好比對的樣子：`代號:信號+信號`。 */
function readable(form: ReturnType<typeof formUnderTest>, side: 0 | 1): string[] {
  return form.conditionSides[side]!.matrix.value.rows.map(
    row => `${row.sourceLabel}:${row.acceptedSignals.join('+')}`)
}

describe('useStrategyBotForm 的策略清單', () => {
  it('新加的策略預設就叫它自己的名字，撞名時後面接數字', () => {
    // 「A 等於買入」是一句看不出自己在說什麼的話——使用者得自己記住 A 是哪一支。
    const form = formUnderTest()
    form.reset()

    form.addSignalSource()
    form.addSignalSource()

    expect(form.sourceLabels.value).toEqual(['均線', '均線 2'])
  })

  it('加一支策略，兩邊的表立刻各多一列空的', () => {
    // 表與策略清單是同一份東西的兩種看法，所以它們不會有「還沒同步」的狀態。
    const form = formUnderTest()
    form.reset()

    form.addSignalSource()

    expect(readable(form, 0)).toEqual(['均線:'])
    expect(readable(form, 1)).toEqual(['均線:'])
  })

  it('刪掉一支策略，兩邊的表立刻各少一列', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()

    form.removeSignalSource(0)

    expect(readable(form, 0)).toEqual(['動能:buy'])
  })

  it('改一支策略的名字，表上那一列跟著改，格子一個都不動', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()

    form.changeSignalSourceLabel(0, '長均線')

    expect(readable(form, 0)).toEqual(['長均線:buy', '動能:buy'])
  })

  it('改成一個別人正用著的名字時，那一列先停在舊名字上', () => {
    // 對調兩個名字必然會經過一個「兩個都叫動能」的瞬間，照改的話兩列會永久合併。
    const form = formUnderTest(aStoredBot())
    form.reset()

    form.changeSignalSourceLabel(0, '動能')

    expect(readable(form, 0)).toEqual(['動能:buy', '動能:buy'])
    expect(form.rejection.value).toContain('重複')
  })

  it('換策略時把舊策略的旋鈕值清掉——它們屬於另一支算式', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()

    form.changeSignalSourceParameterValue(0, '回看根數', 20)
    form.changeSignalSourceStrategy(0, 10)

    expect(form.signalSources.value[0]!.parameterValues).toEqual([])
  })

  it('到了上限就加不動——新增鍵不存在，而不是按了才被拒', () => {
    const form = formUnderTest()
    form.reset()

    for (let added = 0; added < form.signalSourceLimit; added += 1) {
      form.addSignalSource()
    }

    expect(form.canAddSignalSource.value).toBe(false)
  })

  it('還被條件用著的策略刪得掉，只是先說一聲', () => {
    // 擋住它的代價比想像中大：只有一支策略、而兩邊都在用它的人，
    // 得先把兩邊拆光才換得掉那一支。
    const form = formUnderTest(aStoredBot())
    form.reset()

    expect(form.signalSourceUsageWarnings.value[0]).toContain('均線')

    form.removeSignalSource(0)

    expect(form.signalSources.value).toHaveLength(1)
  })
})

describe('useStrategyBotForm 的那張表', () => {
  it('打開一台存好的機器人，兩邊讀回來的格子與存進去時一樣', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()

    expect(readable(form, 0)).toEqual(['均線:buy', '動能:buy'])
    expect(readable(form, 1)).toEqual(['均線:sell', '動能:'])
  })

  it('按一格就打開它，再按一次就關掉', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()

    form.conditionSides[0]!.toggleSignal('均線', 'hold')
    expect(readable(form, 0)).toEqual(['均線:buy+hold', '動能:buy'])

    form.conditionSides[0]!.toggleSignal('均線', 'buy')
    expect(readable(form, 0)).toEqual(['均線:hold', '動能:buy'])
  })

  it('改一邊不會動到另一邊', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()

    form.conditionSides[0]!.toggleSignal('均線', 'hold')

    expect(readable(form, 1)).toEqual(['均線:sell', '動能:'])
  })

  it('換運算子時哪幾格開著一格都不動', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()

    form.conditionSides[0]!.changeOperator('or')

    expect(form.conditionSides[0]!.matrix.value.operator).toBe('or')
    expect(readable(form, 0)).toEqual(['均線:buy', '動能:buy'])
  })

  it('一邊一格都沒勾就送不出去，並說得出為什麼', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()

    form.conditionSides[1]!.toggleSignal('均線', 'sell')

    expect(form.rejection.value).toContain('兩邊都要至少勾一格')
  })

  it('交出去的是那張表寫成的條件樹——存的形狀一個位元都沒變', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()

    const writeDto = form.toWriteDto()

    expect(writeDto?.buyCondition?.isGroup).toBe(true)
    expect(writeDto?.buyCondition?.operator).toBe('and')
    expect(writeDto?.buyCondition?.conditions.map(child => child.sourceLabel))
      .toEqual(['均線', '動能'])
    expect(writeDto?.sellCondition?.sourceLabel).toBe('均線')
  })

  it('一格打開好幾個信號時，那一列自己寫成一個「或」', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()

    form.conditionSides[0]!.toggleSignal('均線', 'hold')

    const firstClause = form.toWriteDto()?.buyCondition?.conditions[0]
    expect(firstClause?.operator).toBe('or')
    expect(firstClause?.conditions.map(child => child.signal)).toEqual(['buy', 'hold'])
  })
})

describe('useStrategyBotForm 存得下去嗎', () => {
  it('每一格都好了就送得出去', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()

    expect(form.rejection.value).toBeNull()
    expect(form.toWriteDto()).not.toBeNull()
  })

  it('沒給名稱就送不出去', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()
    form.name.value = '   '

    expect(form.rejection.value).toContain('名稱')
    expect(form.toWriteDto()).toBeNull()
  })

  it('觸發間隔填 0 就送不出去', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()
    form.triggerIntervalText.value = '0'

    expect(form.rejection.value).toContain('大於零')
  })
})
