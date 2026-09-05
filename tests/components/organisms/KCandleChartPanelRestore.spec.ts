import Decimal from 'decimal.js'
import { flushPromises, mount } from '@vue/test-utils'
import type { Mock } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import KCandleChartPanel from '~/components/organisms/KCandleChartPanel.vue'
import { KCandleChartApplication } from '~/application/k-candle-chart-application'
import { KCandleChartService } from '~/domain/service/k-candle-chart-service'
import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import type { IIndicatorCalculationProxy } from '~/domain/interface/i-indicator-calculation-proxy'
import type { IAppliedChartIndicatorPreferenceProxy } from '~/domain/interface/i-applied-chart-indicator-preference-proxy'
import type { IChartLineColorPreferenceProxy } from '~/domain/interface/i-chart-line-color-preference-proxy'
import { KCandle } from '~/domain/models/entities/k-candle'
import { IndicatorCalculation } from '~/domain/models/entities/indicator-calculation'
import { IndicatorValueVo } from '~/domain/models/vo/indicator-value-vo'
import { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'
import { RememberedAppliedIndicatorVo } from '~/domain/models/vo/remembered-applied-indicator-vo'
import { buildTradingSymbolApplication } from '../../fixtures/trading-symbol-application'
import { buildStrategyApplication, buildStoredStrategy } from '../../fixtures/strategy-application'
import { buildChartIndicatorApplication } from '../../fixtures/chart-indicator-application'
import { buildLiveKCandleApplication } from '../../fixtures/live-k-candle-application'
import { buildTimeZone } from '../../fixtures/time-zone'

// 只 mock 最外層的 proxy 介面；application、domain service 與 domain model 都是真的。
const CURRENT_TIME = new Date('2026-09-02T12:00:00.000Z')

function aKCandle() {
  return new KCandle(
    'BTCUSDT', new Date('2026-09-02T10:00:00.000Z'),
    new Decimal('100'), new Decimal('130'), new Decimal('90'), new Decimal('110'),
    new Decimal('1'), new Decimal('1'), new Decimal('1'), new Decimal('1'))
}

function buildKCandleProxy(
  findKCandleSeries: Mock = vi.fn().mockResolvedValue([aKCandle()]),
): IKCandleProxy {
  return {
    findKCandlesInRange: vi.fn(),
    findKCandleSeries,
    saveKCandle: vi.fn(),
    updateKCandle: vi.fn(),
    deleteKCandle: vi.fn(),
  }
}

function aCalculation(indicatorName = '均價') {
  return new IndicatorCalculation(
    'BTCUSDT', '5m', 1, 'float', [new IndicatorValueVo(indicatorName, [115])])
}

/** 一支帶著一個旋鈕的策略：期數，預設 20。 */
function strategyWithLookback(id = 7, name = '均線') {
  return buildStoredStrategy(id, name, {
    resultType: 'float',
    parameters: [new StrategyParameterDto('期數', 'lookbackCount', 20)],
  })
}

/** 留存下來的一筆。 */
function rememberedOf(
  strategyId: number, parameterValues: Record<string, number> = {}, shownOnChart = true,
): RememberedAppliedIndicatorVo {
  return new RememberedAppliedIndicatorVo(
    strategyId, new Map(Object.entries(parameterValues)), shownOnChart)
}

async function mountPanel(overrides: {
  strategies?: ReturnType<typeof buildStoredStrategy>[]
  remembered?: RememberedAppliedIndicatorVo[]
  readAppliedChartIndicators?: Mock<IAppliedChartIndicatorPreferenceProxy['readAppliedChartIndicators']>
  calculateIndicator?: Mock<IIndicatorCalculationProxy['calculateIndicator']>
  colorPreference?: Partial<IChartLineColorPreferenceProxy>
  listStrategies?: Mock
  /** 行情什麼時候回來。不給就立刻回來。 */
  findKCandleSeries?: Mock
} = {}) {
  const calculateIndicator = overrides.calculateIndicator
    ?? vi.fn().mockResolvedValue(aCalculation())
  const readAppliedChartIndicators = overrides.readAppliedChartIndicators
    ?? vi.fn().mockReturnValue(overrides.remembered ?? [])
  const writeAppliedChartIndicators = vi.fn()

  const wrapper = mount(KCandleChartPanel, {
    props: {
      kCandleChartApplication: new KCandleChartApplication(
        new KCandleChartService(buildKCandleProxy(overrides.findKCandleSeries))),
      tradingSymbolApplication: buildTradingSymbolApplication(),
      liveKCandleApplication: buildLiveKCandleApplication(),
      chartIndicatorApplication: buildChartIndicatorApplication(
        { calculateIndicator },
        overrides.colorPreference ?? {},
        {},
        { readAppliedChartIndicators, writeAppliedChartIndicators },
      ),
      strategyApplication: buildStrategyApplication({
        listStrategies: overrides.listStrategies
          ?? vi.fn().mockResolvedValue(overrides.strategies ?? [strategyWithLookback()]),
      }),
      timeZone: buildTimeZone(),
    },
    global: { stubs: { KCandleChart: true } },
  })
  await flushPromises()
  await vi.advanceTimersByTimeAsync(400)
  await flushPromises()

  return { wrapper, calculateIndicator, writeAppliedChartIndicators }
}

type Panel = Awaited<ReturnType<typeof mountPanel>>['wrapper']

/** 清單上每一列的樣子：它是誰、這一次的值。 */
function rowsOf(wrapper: Panel) {
  return wrapper.findAll('[data-testid="applied-indicator"]').map(
    row => row.get('[data-testid="applied-indicator-summary"]').text())
}

/** 那幾次計算各自用的期數——它是留存的值真的有生效的證據。 */
function usedLookbackCountsOf(calculateIndicator: Mock) {
  return calculateIndicator.mock.calls.map(
    ([request]) => request.parameters.all.map((one: { value: number }) => one.value))
}

async function pickStrategy(wrapper: Panel, id: number) {
  await wrapper.get('[data-testid="chart-indicator-picker"]').setValue(String(id))
  await flushPromises()
}

async function removeIndicator(wrapper: Panel, appliedIndicatorId: number) {
  await wrapper.get(`[data-testid="remove-indicator-${appliedIndicatorId}"]`).trigger('click')
  await flushPromises()
}

async function toggleVisibility(wrapper: Panel, appliedIndicatorId: number) {
  await wrapper.get(`[data-testid="toggle-indicator-visibility-${appliedIndicatorId}"]`)
    .trigger('click')
  await flushPromises()
}

/** 那一列的眼睛現在說它是收著還是畫著。 */
function visibilityLabelOf(wrapper: Panel, appliedIndicatorId: number) {
  return wrapper.get(`[data-testid="toggle-indicator-visibility-${appliedIndicatorId}"]`)
    .attributes('aria-label')
}

async function changeAppliedValue(
  wrapper: Panel, appliedIndicatorId: number, name: string, value: string,
) {
  await wrapper.get(`[data-testid="open-indicator-${appliedIndicatorId}"]`).trigger('click')
  await flushPromises()
  await wrapper.get(`[data-testid="applied-parameter-${name}"]`).setValue(value)
  await flushPromises()
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(CURRENT_TIME)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('打開畫面時上次那幾支自己回來', () => {
  it('一筆回來，帶著它留存的值並算了一次', async () => {
    const { wrapper, calculateIndicator } = await mountPanel({
      remembered: [rememberedOf(7, { 期數: 60 })],
    })

    expect(rowsOf(wrapper)).toEqual(['期數 60'])
    expect(usedLookbackCountsOf(calculateIndicator)).toEqual([[60]])
  })

  it('好幾筆依留存的順序回來', async () => {
    const { wrapper } = await mountPanel({
      strategies: [strategyWithLookback(7, '均線'), strategyWithLookback(9, '布林')],
      remembered: [rememberedOf(9, { 期數: 30 }), rememberedOf(7, { 期數: 60 })],
    })

    expect(wrapper.findAll('[data-testid="applied-indicator"]').map(row => row.text()))
      .toEqual([expect.stringContaining('布林'), expect.stringContaining('均線')])
  })

  it('同一支的兩筆各自帶著自己的值回來，各算一次', async () => {
    // 「這支上次調成什麼」只有一個答案，靠它還原會得到兩條一樣的線——而且不報錯。
    const { wrapper, calculateIndicator } = await mountPanel({
      remembered: [rememberedOf(7, { 期數: 20 }), rememberedOf(7, { 期數: 60 })],
    })

    expect(rowsOf(wrapper)).toEqual(['期數 20', '期數 60'])
    expect(usedLookbackCountsOf(calculateIndicator)).toEqual([[20], [60]])
  })

  it('一筆都沒留存時清單是空的，一次計算都沒發生', async () => {
    const { wrapper, calculateIndicator } = await mountPanel()

    expect(wrapper.findAll('[data-testid="applied-indicator"]')).toHaveLength(0)
    expect(calculateIndicator).not.toHaveBeenCalled()
  })

  it('回來的那一筆用挑過的顏色', async () => {
    const { wrapper } = await mountPanel({
      remembered: [rememberedOf(7, { 期數: 60 })],
      colorPreference: { readColorToken: vi.fn().mockReturnValue('--color-chart-line-4') },
    })

    await wrapper.get('[data-testid="open-indicator-1"]').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-testid="indicator-line"] select')
      .map(select => (select.element as HTMLSelectElement).value))
      .toEqual(['--color-chart-line-4'])
  })

  it('回來的那幾筆之後再挑一支，序號不撞號——移除新的那一筆不會連帶移除舊的', async () => {
    const { wrapper } = await mountPanel({
      strategies: [buildStoredStrategy(9, '無旋鈕', { resultType: 'float' })],
      remembered: [rememberedOf(9), rememberedOf(9)],
    })

    await pickStrategy(wrapper, 9)
    await removeIndicator(wrapper, 3)

    expect(wrapper.findAll('[data-testid="applied-indicator"]')).toHaveLength(2)
  })

  it('有筆被跳過時後續挑的那一支也不撞號——跳過的那幾筆不佔號', async () => {
    // 跳過的那一筆若佔掉一個號，回來的那一筆會拿到序號 2，而下一次手動加入的也是 2。
    // 撞號之後移除任何一筆，**兩筆會一起消失**，而且不會有任何地方報錯。
    const { wrapper } = await mountPanel({
      strategies: [buildStoredStrategy(9, '無旋鈕', { resultType: 'float' })],
      remembered: [rememberedOf(404), rememberedOf(9)],
    })

    await pickStrategy(wrapper, 9)
    await removeIndicator(wrapper, 2)

    expect(wrapper.findAll('[data-testid="applied-indicator"]')).toHaveLength(1)
  })
})

describe('打開畫面時對不上的那幾筆不回來', () => {
  it('策略被刪掉的那一筆不回來，其餘照常且不報錯', async () => {
    const { wrapper } = await mountPanel({
      strategies: [strategyWithLookback(7, '均線')],
      remembered: [rememberedOf(404, { 期數: 30 }), rememberedOf(7, { 期數: 60 })],
    })

    expect(rowsOf(wrapper)).toEqual(['期數 60'])
    expect(wrapper.findAll('[data-testid="rejected-alert"]')).toHaveLength(0)
  })

  it('現在畫不成線的那一筆不回來', async () => {
    // 它在可挑清單裡本來就挑不到，讓它自己回到圖上等於繞過那道擋。
    const { wrapper } = await mountPanel({
      strategies: [buildStoredStrategy(7, '是非策略', { resultType: 'bool' })],
      remembered: [rememberedOf(7)],
    })

    expect(wrapper.findAll('[data-testid="applied-indicator"]')).toHaveLength(0)
  })

  it('取不到策略清單時清單是空的，圖表本身照畫', async () => {
    const { wrapper } = await mountPanel({
      listStrategies: vi.fn().mockRejectedValue(new Error('連不上')),
      remembered: [rememberedOf(7)],
    })

    expect(wrapper.findAll('[data-testid="applied-indicator"]')).toHaveLength(0)
    expect(wrapper.find('[data-testid="chart-indicator-empty"]').exists()).toBe(true)
  })

  it('留存讀不出來時清單是空的，不報錯', async () => {
    // 無痕視窗、封鎖網站資料時 proxy 交出空的一份。
    const { wrapper } = await mountPanel({
      readAppliedChartIndicators: vi.fn().mockReturnValue([]),
    })

    expect(wrapper.findAll('[data-testid="applied-indicator"]')).toHaveLength(0)
    expect(wrapper.findAll('[data-testid="rejected-alert"]')).toHaveLength(0)
  })
})

describe('收起來的那幾筆下次仍然收著', () => {
  it('留存說收著的那一筆回來時仍然收著', async () => {
    const { wrapper } = await mountPanel({
      remembered: [rememberedOf(7, { 期數: 20 }, false)],
    })

    expect(visibilityLabelOf(wrapper, 1)).toBe('畫回圖上')
  })

  it('留存說畫著的那一筆回來時畫著', async () => {
    const { wrapper } = await mountPanel({
      remembered: [rememberedOf(7, { 期數: 20 }, true)],
    })

    expect(visibilityLabelOf(wrapper, 1)).toBe('在圖上收起來')
  })

  it('收著的那一筆照樣算——拿回它時要的是一條現在的線，不是等一次計算', async () => {
    const { calculateIndicator } = await mountPanel({
      remembered: [rememberedOf(7, { 期數: 60 }, false)],
    })

    expect(usedLookbackCountsOf(calculateIndicator)).toEqual([[60]])
  })
})

describe('清單一改動就寫下來', () => {
  it('加入一筆之後留存的是那一筆', async () => {
    const { wrapper, writeAppliedChartIndicators } = await mountPanel({
      strategies: [buildStoredStrategy(9, '無旋鈕', { resultType: 'float' })],
    })

    await pickStrategy(wrapper, 9)

    expect(writeAppliedChartIndicators).toHaveBeenLastCalledWith([rememberedOf(9)])
  })

  it('移除一筆之後留存的只有剩下的那一筆', async () => {
    const { wrapper, writeAppliedChartIndicators } = await mountPanel({
      remembered: [rememberedOf(7, { 期數: 20 }), rememberedOf(7, { 期數: 60 })],
    })

    await removeIndicator(wrapper, 1)

    expect(writeAppliedChartIndicators)
      .toHaveBeenLastCalledWith([rememberedOf(7, { 期數: 60 })])
  })

  it('改一筆的值之後留存的是新的值', async () => {
    const { wrapper, writeAppliedChartIndicators } = await mountPanel({
      remembered: [rememberedOf(7, { 期數: 20 })],
    })

    await changeAppliedValue(wrapper, 1, '期數', '60')

    expect(writeAppliedChartIndicators)
      .toHaveBeenLastCalledWith([rememberedOf(7, { 期數: 60 })])
  })

  it('值填得用不了的時候不寫，但畫面顯示他剛打的東西', async () => {
    // 留存的必須是能用的那一份，否則下次打開時圖上少一條線，
    // 而旁邊那行說明講的是他昨天打錯的東西。
    const { wrapper, writeAppliedChartIndicators } = await mountPanel({
      remembered: [rememberedOf(7, { 期數: 20 })],
    })
    writeAppliedChartIndicators.mockClear()

    await changeAppliedValue(wrapper, 1, '期數', '0')

    expect(writeAppliedChartIndicators).not.toHaveBeenCalled()
    expect(wrapper.get<HTMLInputElement>('[data-testid="applied-parameter-期數"]').element.value)
      .toBe('0')
  })

  it('還原本身不寫回留存——留存的內容一個字都沒有變', async () => {
    const { writeAppliedChartIndicators } = await mountPanel({
      remembered: [rememberedOf(7, { 期數: 60 })],
    })

    expect(writeAppliedChartIndicators).not.toHaveBeenCalled()
  })

  it('按一下眼睛就寫下來——收起來與否與那幾格的值同一份留存', async () => {
    const { wrapper, writeAppliedChartIndicators } = await mountPanel({
      remembered: [rememberedOf(7, { 期數: 20 })],
    })

    await toggleVisibility(wrapper, 1)

    expect(writeAppliedChartIndicators)
      .toHaveBeenLastCalledWith([rememberedOf(7, { 期數: 20 }, false)])
  })

  it('某一格填著用不了的值時，按下的眼睛照樣記得住', async () => {
    // 留存寫的是「最後一次值用得了的樣子」，而那份快照上的眼睛可能是好幾次操作之前的。
    // 拿它去寫，這一次按下的眼睛會安靜地被寫回舊的樣子——而畫面上那隻眼睛明明是新的。
    const { wrapper, writeAppliedChartIndicators } = await mountPanel({
      remembered: [rememberedOf(7, { 期數: 20 })],
    })
    await changeAppliedValue(wrapper, 1, '期數', '0')

    await toggleVisibility(wrapper, 1)

    // 值仍然是最後一次用得了的那個（20，不是用不了的 0），眼睛是剛按下的那一個。
    expect(writeAppliedChartIndicators)
      .toHaveBeenLastCalledWith([rememberedOf(7, { 期數: 20 }, false)])
  })

  it('還在調旋鈕、還沒按加入的那一筆不寫', async () => {
    const { wrapper, writeAppliedChartIndicators } = await mountPanel()

    await pickStrategy(wrapper, 7)

    expect(writeAppliedChartIndicators).not.toHaveBeenCalled()
  })
})

describe('行情與策略清單誰先回來都算得出來', () => {
  it('策略清單先回來、行情後到：那幾筆在行情到手時被補算', async () => {
    // 還原時「算哪一段」還不存在，那幾筆當時算不動——這一刻才第一次有。
    // 不補算的後果是清單上有列、圖上永遠沒有線，而且不會有任何地方報錯。
    let releaseKCandles = (): void => {}
    const kCandlesArrived = new Promise<KCandle[]>((resolve) => {
      releaseKCandles = () => resolve([aKCandle()])
    })

    const { wrapper, calculateIndicator } = await mountPanel({
      remembered: [rememberedOf(7, { 期數: 60 })],
      findKCandleSeries: vi.fn().mockReturnValue(kCandlesArrived),
    })

    // 那幾筆已經在清單上了，但還沒有任何一次計算——沒有「算哪一段」可用。
    expect(rowsOf(wrapper)).toEqual(['期數 60'])
    expect(calculateIndicator).not.toHaveBeenCalled()

    releaseKCandles()
    await flushPromises()

    expect(usedLookbackCountsOf(calculateIndicator)).toEqual([[60]])
  })

  it('行情到手時不等停手就補算——第一次擺好位置不是拖動', async () => {
    let releaseKCandles = (): void => {}
    const kCandlesArrived = new Promise<KCandle[]>((resolve) => {
      releaseKCandles = () => resolve([aKCandle()])
    })

    const { calculateIndicator } = await mountPanel({
      remembered: [rememberedOf(7, { 期數: 60 })],
      findKCandleSeries: vi.fn().mockReturnValue(kCandlesArrived),
    })

    releaseKCandles()
    await flushPromises()

    // 沒有推進任何時間就已經算過了。等 300 毫秒只是讓圖空著。
    expect(calculateIndicator).toHaveBeenCalledTimes(1)
  })

  it('一筆都沒留存時，行情到手不會憑空算一次', async () => {
    const { calculateIndicator } = await mountPanel()

    expect(calculateIndicator).not.toHaveBeenCalled()
  })
})

describe('留存的必須是能用的那一份', () => {
  it('填了用不了的值之後移除另一筆，留存的仍是能用的那個值', async () => {
    // 值用不了的那一次不寫（既有規則），但清單的下一次改動寫的是**整份**——
    // 若那一份帶著用不了的值，下次打開時它會退回策略的預設值，
    // 而使用者自己調過的那個值就這樣消失了，沒有任何地方報錯。
    const { wrapper, writeAppliedChartIndicators } = await mountPanel({
      remembered: [rememberedOf(7, { 期數: 45 }), rememberedOf(7, { 期數: 60 })],
    })

    await changeAppliedValue(wrapper, 1, '期數', '0')
    await removeIndicator(wrapper, 2)

    expect(writeAppliedChartIndicators)
      .toHaveBeenLastCalledWith([rememberedOf(7, { 期數: 45 })])
  })

  it('填了用不了的值之後再加一筆，留存的仍是能用的那個值', async () => {
    const { wrapper, writeAppliedChartIndicators } = await mountPanel({
      strategies: [strategyWithLookback(7, '均線'),
        buildStoredStrategy(9, '無旋鈕', { resultType: 'float' })],
      remembered: [rememberedOf(7, { 期數: 45 })],
    })

    await changeAppliedValue(wrapper, 1, '期數', '0')
    await pickStrategy(wrapper, 9)

    expect(writeAppliedChartIndicators)
      .toHaveBeenLastCalledWith([rememberedOf(7, { 期數: 45 }), rememberedOf(9)])
  })

  it('把用不了的值改回能用的之後，留存的是新的那個值', async () => {
    const { wrapper, writeAppliedChartIndicators } = await mountPanel({
      remembered: [rememberedOf(7, { 期數: 45 })],
    })

    await changeAppliedValue(wrapper, 1, '期數', '0')
    await changeAppliedValue(wrapper, 1, '期數', '30')

    expect(writeAppliedChartIndicators)
      .toHaveBeenLastCalledWith([rememberedOf(7, { 期數: 30 })])
  })
})

describe('還原後每一筆只算一次', () => {
  it.each([0, 1, 2, 3])('行情延後 %i 個微任務回來時也只算一次', async (ticks) => {
    // 還原是「附加整份、然後逐筆 await」，而每一個 await 都是一個空檔。
    // 行情的續段若正好落在那個空檔裡，補算會與還原的迴圈同時跑，
    // 於是同一批被算兩遍——而兩次都畫得出線，圖上不會有任何異狀。
    const kCandlesArrived = Array.from({ length: ticks }).reduce<Promise<KCandle[]>>(
      previous => previous.then(candles => candles), Promise.resolve([aKCandle()]))

    const { calculateIndicator } = await mountPanel({
      strategies: [strategyWithLookback(7, '均線'), strategyWithLookback(9, '布林'),
        strategyWithLookback(11, 'RSI')],
      remembered: [rememberedOf(7, { 期數: 20 }), rememberedOf(9, { 期數: 30 }),
        rememberedOf(11, { 期數: 40 })],
      findKCandleSeries: vi.fn().mockReturnValue(kCandlesArrived),
    })

    expect(calculateIndicator).toHaveBeenCalledTimes(3)
  })
})
