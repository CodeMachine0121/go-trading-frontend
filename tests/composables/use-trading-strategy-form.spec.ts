// @vitest-environment nuxt
import { describe, expect, it } from 'vitest'
import { TradingStrategyConditionDto } from '~/domain/models/dto/trading-strategy-condition-dto'
import { TradingStrategyDto } from '~/domain/models/dto/trading-strategy-dto'
import {
  StrategyBotParameterValueDto,
  TradingStrategySignalSourceDto,
} from '~/domain/models/dto/trading-strategy-signal-source-dto'

const STRATEGY_OPTIONS = [
  { value: 9, label: '均線' },
  { value: 10, label: '動能' },
]

function formUnderTest(editing: TradingStrategyDto | null = null) {
  return useTradingStrategyForm(
    () => editing,
    () => STRATEGY_OPTIONS,
    () => ({ 11: '收盤價（不是一個信號）' }),
    () => ({ 9: ['快線期數', '慢線期數'] }),
  )
}

function comparison(nodeId: string, sourceLabel: string, signal: string) {
  return new TradingStrategyConditionDto(nodeId, null, [], sourceLabel, signal)
}

/** 一份存好的交易策略：買入是「均線＝買 且 動能＝買」，賣出是「均線＝賣」。 */
function aStoredBot() {
  return new TradingStrategyDto(
    3, '黃金交叉',
    [
      new TradingStrategySignalSourceDto('均線', 9, '1h', []),
      new TradingStrategySignalSourceDto('動能', 10, '1h', []),
    ],
    new TradingStrategyConditionDto('root', 'and', [
      comparison('a', '均線', 'buy'),
      comparison('b', '動能', 'buy'),
    ], '', ''),
    comparison('s', '均線', 'sell'),
  )
}

/**
 * 一張墊子讀成好比對的樣子：一格一個字串，`代號:信號+信號`；
 * 扣成一組的用 `(且 A:… B:…)` 括起來。
 */
function readable(form: ReturnType<typeof formUnderTest>, side: 0 | 1): string[] {
  return form.conditionSides[side]!.board.value.items.map((item) => {
    const pieces = item.pieces.map(
      piece => `${piece.sourceLabel}:${piece.acceptedSignals.join('+')}`)

    return item.isBundle ? `(${item.operator} ${pieces.join(' ')})` : pieces[0]!
  })
}

describe('useTradingStrategyForm 的策略腳本清單', () => {
  it('新加的策略腳本預設就叫它自己的名字，撞名時後面接數字', () => {
    // 「A 等於買入」是一句看不出自己在說什麼的話——使用者得自己記住 A 是哪一支。
    const form = formUnderTest()
    form.reset()

    form.addSignalSource()
    form.addSignalSource()

    expect(form.sourceLabels.value).toEqual(['均線', '均線 2'])
  })

  it('加一塊零件不會自己跳上墊子——那是使用者要做的動作', () => {
    // 一個自己跑到工作區的零件，會讓他覺得畫面在替他做決定。
    const form = formUnderTest()
    form.reset()

    form.addSignalSource()

    expect(form.sourceLabels.value).toEqual(['均線'])
    expect(readable(form, 0)).toEqual([])
    expect(readable(form, 1)).toEqual([])
  })

  it('把零件擺上墊子，它就在上面了', () => {
    const form = formUnderTest()
    form.reset()
    form.addSignalSource()

    form.conditionSides[0]!.placeAt('均線', 0)

    expect(readable(form, 0)).toEqual(['均線:buy'])
    expect(form.conditionSides[0]!.board.value.placedLabels).toContain('均線')
    expect(form.conditionSides[1]!.board.value.placedLabels).not.toContain('均線')
  })

  it('把零件拿下墊子，零件本身還在架子上', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()

    form.conditionSides[0]!.takeOff('均線')

    expect(readable(form, 0)).toEqual(['動能:buy'])
    expect(form.sourceLabels.value).toContain('均線')
  })

  it('刪掉一支策略腳本，兩邊的表立刻各少一列', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()

    form.removeSignalSource(0)

    expect(readable(form, 0)).toEqual(['動能:buy'])
  })

  it('改一支策略腳本的名字，表上那一列跟著改，格子一個都不動', () => {
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

    expect(form.rejection.value).toContain('重複')
  })

  it('換策略腳本時把舊策略腳本的旋鈕值清掉——它們屬於另一支算式', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()

    form.changeSignalSourceParameterValue(0, '回看根數', 20)
    form.changeSignalSourceStrategyScript(0, 10)

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

  it('還被條件用著的策略腳本刪得掉，只是先說一聲', () => {
    // 擋住它的代價比想像中大：只有一支策略腳本、而兩邊都在用它的人，
    // 得先把兩邊拆光才換得掉那一支。
    const form = formUnderTest(aStoredBot())
    form.reset()

    expect(form.signalSourceUsageWarnings.value[0]).toContain('均線')

    form.removeSignalSource(0)

    expect(form.signalSources.value).toHaveLength(1)
  })
})

describe('useTradingStrategyForm 的那張表', () => {
  it('打開一台存好的機器人，兩邊讀回來的格子與存進去時一樣', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()

    expect(readable(form, 0)).toEqual(['均線:buy', '動能:buy'])
    expect(readable(form, 1)).toEqual(['均線:sell'])
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

    expect(readable(form, 1)).toEqual(['均線:sell'])
  })

  it('換運算子時哪幾格開著一格都不動', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()

    form.conditionSides[0]!.changeOperator('or')

    expect(form.conditionSides[0]!.board.value.operator).toBe('or')
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

describe('useTradingStrategyForm 存得下去嗎', () => {
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
})

describe('useTradingStrategyForm：一個動作一次呼叫', () => {
  it.each([
    { signal: 'sell', expected: ['均線:buy', '動能:sell'] },
    { signal: 'buy', expected: ['均線:buy', '動能:buy'] },
  ])('加一條「動能 等於 $signal」：排到最後面，只收挑的那一個', ({ signal, expected }) => {
    const form = formUnderTest(aStoredBot())
    form.reset()
    form.conditionSides[0]!.takeOff('動能')

    form.conditionSides[0]!.addClause('動能', signal)

    expect(readable(form, 0)).toEqual(expected)
  })

  it('和一條單獨的扣成一組，再整組拆開，回到原本的順序', () => {
    const form = formUnderTest(aStoredBot())
    form.reset()

    form.conditionSides[0]!.bundleWith('均線', '動能')
    expect(readable(form, 0)).toEqual(['(or 均線:buy 動能:buy)'])

    form.conditionSides[0]!.splitBundle('均線+動能')
    expect(readable(form, 0)).toEqual(['均線:buy', '動能:buy'])
  })

  it.each([
    { side: 0 as const, tone: 'success', connectorWord: '拿來判斷' },
    { side: 1 as const, tone: 'danger', connectorWord: '同時也看' },
  ])('每一邊說得出自己的顏色與卡前那一句（$tone）', ({ side, tone, connectorWord }) => {
    const form = formUnderTest()

    expect(form.conditionSides[side]!.tone).toBe(tone)
    expect(form.conditionSides[side]!.connectorWord).toBe(connectorWord)
  })

  it('信號選單由 SignalDomain 說它們叫什麼', () => {
    expect(formUnderTest().signalOptions).toEqual([
      { value: 'buy', label: '買入' },
      { value: 'sell', label: '賣出' },
      { value: 'hold', label: '持有' },
    ])
  })
})

describe('useTradingStrategyForm：訊號來源卡上讀出來的字', () => {
  it.each([
    { name: '挑得到的就是它的名字', strategyScriptId: 9, expected: '均線' },
    { name: '存在但挑不得的，說它為什麼挑不得', strategyScriptId: 11, expected: '收盤價（不是一個信號）' },
    { name: '認不得的，說它已經不在了', strategyScriptId: 42, expected: '這支策略腳本（編號 42）已經不在了' },
  ])('策略腳本那一欄：$name', ({ strategyScriptId, expected }) => {
    const form = formUnderTest(new TradingStrategyDto(
      3, '黃金交叉', [new TradingStrategySignalSourceDto('來源', strategyScriptId, '1h', [])], null, null))
    form.reset()

    expect(form.signalSourceStrategyScriptLabels.value).toEqual([expected])
  })

  it.each([
    { name: '沒調過就是空的一行、每一欄都是空白', values: [], summary: '', inputs: { 快線期數: '', 慢線期數: '' } },
    {
      name: '調過的才列，沒填的那一欄是空白而不是 0',
      values: [new StrategyBotParameterValueDto('快線期數', 12)],
      summary: '快線期數=12',
      inputs: { 快線期數: '12', 慢線期數: '' },
    },
    {
      name: '調過好幾個時用 · 隔開',
      values: [new StrategyBotParameterValueDto('快線期數', 12), new StrategyBotParameterValueDto('慢線期數', 0)],
      summary: '快線期數=12 · 慢線期數=0',
      inputs: { 快線期數: '12', 慢線期數: '0' },
    },
  ])('參數：$name', ({ values, summary, inputs }) => {
    const form = formUnderTest(new TradingStrategyDto(
      3, '黃金交叉', [new TradingStrategySignalSourceDto('均線', 9, '1h', values)], null, null))
    form.reset()

    expect(form.signalSourceParameterSummaries.value).toEqual([summary])
    expect(form.signalSourceParameterInputs.value).toEqual([inputs])
  })
})
