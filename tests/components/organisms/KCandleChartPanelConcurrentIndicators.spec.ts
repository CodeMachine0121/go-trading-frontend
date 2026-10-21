import Decimal from 'decimal.js'
import { seriesOf } from '../../fixtures/k-candle-series'
import { openIndicatorDialog, pickSymbolInSearch } from '../../fixtures/symbol-search'
import { buildChartDrawingApplication } from '../../fixtures/chart-drawing-application'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import KCandleChartPanel from '~/components/organisms/KCandleChartPanel.vue'
import KCandleChart from '~/components/molecules/KCandleChart.vue'
import { KCandleChartApplication } from '~/application/k-candle-chart-application'
import { KCandleChartService } from '~/domain/service/k-candle-chart-service'
import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import type { ILiveKCandleProxy } from '~/domain/interface/i-live-k-candle-proxy'
import type { IChartLineColorPreferenceProxy } from '~/domain/interface/i-chart-line-color-preference-proxy'
import type { IndicatorCalculationRequestDomain } from '~/domain/models/domains/indicator-calculation-request-domain'
import { KCandle } from '~/domain/models/entities/k-candle'
import { LiveKCandleUpdate } from '~/domain/models/entities/live-k-candle-update'
import { IndicatorCalculation } from '~/domain/models/entities/indicator-calculation'
import { IndicatorValueVo } from '~/domain/models/vo/indicator-value-vo'
import { RememberedAppliedIndicatorVo } from '~/domain/models/vo/remembered-applied-indicator-vo'
import { IndicatorScriptFailedError } from '~/domain/errors/indicator-script-failed-error'
import { buildTradingSymbolApplication } from '../../fixtures/trading-symbol-application'
import { buildStrategyScriptApplication, buildStoredStrategyScript } from '../../fixtures/strategy-script-application'
import { buildChartIndicatorApplication } from '../../fixtures/chart-indicator-application'
import { buildLiveKCandleApplication } from '../../fixtures/live-k-candle-application'
import { buildTimeZone } from '../../fixtures/time-zone'
import { buildKCandleContractProxy } from '../../fixtures/contract-proxies'

const CURRENT_TIME = new Date('2026-09-03T12:00:00.000Z')
const LATEST_OPEN_TIME = '2026-09-03T11:55:00.000Z'

function buildKCandle(openTime: string): KCandle {
  return new KCandle(
    'BTCUSDT', new Date(openTime),
    new Decimal('100'), new Decimal('130'), new Decimal('90'), new Decimal('110'),
    new Decimal('1'), new Decimal('1'), new Decimal('1'), new Decimal('1'))
}

function buildKCandleProxy(): IKCandleProxy {
  return {
    findKCandlesInRange: vi.fn(),
    findKCandleSeries: vi.fn().mockResolvedValue(seriesOf([
      buildKCandle('2026-09-03T09:30:00.000Z'),
      buildKCandle(LATEST_OPEN_TIME),
    ])),
    saveKCandle: vi.fn(),
    updateKCandle: vi.fn(),
    deleteKCandle: vi.fn(),
    catchUpSymbol: vi.fn().mockResolvedValue(0),
  }
}

function aCalculation(indicatorName: string) {
  return new IndicatorCalculation(
    'BTCUSDT', '5m', 1, 'float', [new IndicatorValueVo(indicatorName, [115])])
}

/** 每一次計算都由測試決定何時、以什麼結果回來。 */
function deferredCalculations() {
  const pending: {
    request: IndicatorCalculationRequestDomain
    succeed: (indicatorName: string) => void
    fail: () => void
  }[] = []
  const calculate = vi.fn((request: IndicatorCalculationRequestDomain) =>
    new Promise<IndicatorCalculation>((resolve, reject) => {
      pending.push({
        request,
        succeed: indicatorName => resolve(aCalculation(indicatorName)),
        fail: () => reject(new IndicatorScriptFailedError('算式執行失敗')),
      })
    }))

  return { calculate, pending }
}

function controllableFeed() {
  const listeners: ((update: LiveKCandleUpdate) => void)[] = []
  const followKCandles: ILiveKCandleProxy['followKCandles'] = (_symbol, onUpdate) => {
    listeners.push(onUpdate)

    return () => {}
  }

  function reportClosed() {
    for (const listener of listeners) {
      listener(new LiveKCandleUpdate('BTCUSDT', 'closed', buildKCandle(LATEST_OPEN_TIME)))
    }
  }

  return { followKCandles, reportClosed }
}

const STRATEGY_SCRIPTS = [
  buildStoredStrategyScript(7, '均線', { resultType: 'float' }),
  buildStoredStrategyScript(8, '布林', { resultType: 'float' }),
  buildStoredStrategyScript(9, '通道', { resultType: 'float' }),
  buildStoredStrategyScript(10, '動能', { resultType: 'float' }),
]

/** 上次擺著的那幾支：打開畫面、行情回來時一起算。 */
async function mountPanel(rememberedStrategyScriptIds: number[], overrides: {
  colorPreference?: Partial<IChartLineColorPreferenceProxy>
  /** 策略腳本清單比行情晚回來：還原回來的那幾支在已經擺好位置的圖上直接算。 */
  strategyScriptsArriveLate?: boolean
} = {}) {
  const strategyScriptList = { mine: STRATEGY_SCRIPTS, adopted: [] }
  const strategyScriptsArrival = Promise.withResolvers<typeof strategyScriptList>()
  if (!overrides.strategyScriptsArriveLate) {
    strategyScriptsArrival.resolve(strategyScriptList)
  }
  const calculations = deferredCalculations()
  const recalculations = deferredCalculations()
  const feed = controllableFeed()

  const wrapper = mount(KCandleChartPanel, {
    props: {
      kCandleChartApplication: new KCandleChartApplication(
        new KCandleChartService(buildKCandleProxy(), buildKCandleContractProxy())),
      tradingSymbolApplication: buildTradingSymbolApplication(),
      liveKCandleApplication: buildLiveKCandleApplication({ followKCandles: feed.followKCandles }),
      chartIndicatorApplication: buildChartIndicatorApplication(
        { calculateIndicator: calculations.calculate, recalculateIndicator: recalculations.calculate },
        overrides.colorPreference ?? {},
        {},
        {
          readAppliedChartIndicators: vi.fn().mockReturnValue(rememberedStrategyScriptIds.map(
            strategyScriptId => new RememberedAppliedIndicatorVo(strategyScriptId, new Map(), true))),
        },
      ),
      strategyScriptApplication: buildStrategyScriptApplication({
        listAvailableStrategyScripts: vi.fn().mockReturnValue(strategyScriptsArrival.promise),
      }),
      timeZone: buildTimeZone(),
      chartDrawingApplication: buildChartDrawingApplication(),
    },
    global: { stubs: { KCandleChart: true } },
  })
  await flushPromises()
  await openIndicatorDialog(wrapper)
  await settle()
  strategyScriptsArrival.resolve(strategyScriptList)
  await flushPromises()

  return { wrapper, calculations, recalculations, feed }
}

type Panel = Awaited<ReturnType<typeof mountPanel>>['wrapper']

async function settle() {
  await vi.advanceTimersByTimeAsync(400)
  await flushPromises()
}

function sentStrategyScriptIds(pending: { request: IndicatorCalculationRequestDomain }[]) {
  return pending.map(one => one.request.strategyScriptId)
}

function drawnIndicatorNames(wrapper: Panel) {
  return (wrapper.findComponent(KCandleChart).props('indicators') ?? [])
    .map(indicator => indicator.levels[0]?.indicatorName)
}

function colorOf(wrapper: Panel, appliedIndicatorId: number) {
  return (wrapper.findComponent(KCandleChart).props('indicators') ?? [])
    .find(indicator => indicator.appliedIndicatorId === appliedIndicatorId)?.levels[0]?.colorToken
}

function calculatingBadgeCount(wrapper: Panel) {
  return wrapper.findAll('[data-testid="applied-indicator"]')
    .filter(row => row.text().includes('計算中')).length
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(CURRENT_TIME)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('好幾支同時算，但同時最多三支', () => {
  it('三支同時送去算，不等前一支算完', async () => {
    const { calculations } = await mountPanel([7, 8, 9])

    expect(sentStrategyScriptIds(calculations.pending)).toEqual([7, 8, 9])
  })

  it('第四支排隊，前面任一支算好才送出', async () => {
    const { calculations } = await mountPanel([7, 8, 9, 10])

    expect(sentStrategyScriptIds(calculations.pending)).toEqual([7, 8, 9])

    calculations.pending[1]?.succeed('布林')
    await flushPromises()

    expect(sentStrategyScriptIds(calculations.pending)).toEqual([7, 8, 9, 10])
  })

  it('前面那一支失敗也讓出名額', async () => {
    const { calculations } = await mountPanel([7, 8, 9, 10])

    calculations.pending[0]?.fail()
    await flushPromises()

    expect(sentStrategyScriptIds(calculations.pending)).toEqual([7, 8, 9, 10])
  })

  it('策略腳本清單晚回來時，還原的那幾支也同時送出、同樣受上限管', async () => {
    const { calculations } = await mountPanel([7, 8, 9, 10], { strategyScriptsArriveLate: true })

    expect(sentStrategyScriptIds(calculations.pending)).toEqual([7, 8, 9])
  })

  it('畫面收掉之後，排隊中的那一支不再送出', async () => {
    const { wrapper, calculations } = await mountPanel([7, 8, 9, 10])

    wrapper.unmount()
    calculations.pending[0]?.succeed('均線')
    await flushPromises()

    expect(sentStrategyScriptIds(calculations.pending)).toEqual([7, 8, 9])
  })

  it('只掛一支時就送那一支一次', async () => {
    const { calculations } = await mountPanel([7])

    expect(sentStrategyScriptIds(calculations.pending)).toEqual([7])
  })

  it('排隊中的那一支也顯示正在算', async () => {
    const { wrapper } = await mountPanel([7, 8, 9, 10])

    expect(calculatingBadgeCount(wrapper)).toBe(4)
  })

  it('三支在算時再加一支，新加的那一支也要排隊', async () => {
    const { wrapper, calculations } = await mountPanel([7, 8, 9])

    await wrapper.get('[data-testid="chart-indicator-picker"]').setValue('10')
    await flushPromises()

    expect(sentStrategyScriptIds(calculations.pending)).toEqual([7, 8, 9])

    calculations.pending[0]?.succeed('均線')
    await flushPromises()

    expect(sentStrategyScriptIds(calculations.pending)).toEqual([7, 8, 9, 10])
  })
})

describe('算好一支畫一支', () => {
  it('第二支先算好就先畫上，其他兩支仍在算', async () => {
    const { wrapper, calculations } = await mountPanel([7, 8, 9])

    calculations.pending[1]?.succeed('布林')
    await flushPromises()

    expect(drawnIndicatorNames(wrapper)).toEqual(['布林'])
    expect(calculatingBadgeCount(wrapper)).toBe(2)
  })

  it('一支失敗只標在它旁邊，另外兩支照常畫上', async () => {
    const { wrapper, calculations } = await mountPanel([7, 8, 9])

    calculations.pending[0]?.fail()
    calculations.pending[1]?.succeed('布林')
    calculations.pending[2]?.succeed('通道')
    await flushPromises()

    expect(drawnIndicatorNames(wrapper)).toEqual(['布林', '通道'])
    expect(wrapper.find('[data-testid="indicator-error-1"]').exists()).toBe(true)
    expect(calculatingBadgeCount(wrapper)).toBe(0)
  })
})

describe('舊的結果不蓋掉新的', () => {
  it('換標的後，晚回來的舊標的不會蓋掉新標的的線', async () => {
    const { wrapper, calculations } = await mountPanel([7])

    await pickSymbolInSearch(wrapper, 'ETHUSDT')
    await settle()

    calculations.pending[1]?.succeed('以太幣的值')
    await flushPromises()
    calculations.pending[0]?.succeed('比特幣的值')
    await flushPromises()

    expect(drawnIndicatorNames(wrapper)).toEqual(['以太幣的值'])
  })

  it('排隊中被新一次重算取代的那一次不送出', async () => {
    const { wrapper, calculations } = await mountPanel([7, 8, 9, 10])

    await pickSymbolInSearch(wrapper, 'ETHUSDT')
    await settle()
    for (const one of calculations.pending.slice(0, 3)) {
      one.succeed('過期的值')
    }
    await flushPromises()
    calculations.pending[3]?.succeed('以太幣的值')
    await flushPromises()

    const sentForTheFourth = calculations.pending.filter(one => one.request.strategyScriptId === 10)
    expect(sentForTheFourth.map(one => one.request.symbol)).toEqual(['ETHUSDT'])
  })

  it('舊的那一次先結束時，仍在算新的那一次的那一支照樣顯示正在算', async () => {
    const { wrapper, calculations } = await mountPanel([7])

    await pickSymbolInSearch(wrapper, 'ETHUSDT')
    await settle()
    calculations.pending[0]?.succeed('比特幣的值')
    await flushPromises()

    expect(calculatingBadgeCount(wrapper)).toBe(1)
  })

  it('移除之後才回來的那一支不畫回去', async () => {
    const { wrapper, calculations } = await mountPanel([7, 8])

    await wrapper.get('[data-testid="remove-indicator-1"]').trigger('click')
    await flushPromises()
    calculations.pending[0]?.succeed('均線')
    calculations.pending[1]?.succeed('布林')
    await flushPromises()

    expect(drawnIndicatorNames(wrapper)).toEqual(['布林'])
  })
})

describe('顏色只看清單順序', () => {
  it('布林先算好、均線後算好，均線仍拿第一個顏色', async () => {
    const { wrapper, calculations } = await mountPanel([7, 8])

    calculations.pending[1]?.succeed('布林')
    await flushPromises()
    calculations.pending[0]?.succeed('均線')
    await flushPromises()

    expect(colorOf(wrapper, 1)).toBe('--color-chart-line-1')
    expect(colorOf(wrapper, 2)).toBe('--color-chart-line-2')
  })

  it('均線挑過的顏色照舊', async () => {
    const { wrapper, calculations } = await mountPanel([7, 8], {
      colorPreference: {
        readColorToken: vi.fn((lineKey: string) => (lineKey === '7:均線' ? '--color-chart-line-4' : null)),
      },
    })

    calculations.pending[1]?.succeed('布林')
    await flushPromises()
    calculations.pending[0]?.succeed('均線')
    await flushPromises()

    expect(colorOf(wrapper, 1)).toBe('--color-chart-line-4')
    expect(colorOf(wrapper, 2)).toBe('--color-chart-line-1')
  })

  it('同一支擺兩筆、第二筆先算好：第一筆用挑過的顏色，第二筆換一個沒被用掉的', async () => {
    const { wrapper, calculations } = await mountPanel([7, 7], {
      colorPreference: { readColorToken: vi.fn().mockReturnValue('--color-chart-line-4') },
    })

    calculations.pending[1]?.succeed('均線')
    await flushPromises()
    calculations.pending[0]?.succeed('均線')
    await flushPromises()

    expect(colorOf(wrapper, 1)).toBe('--color-chart-line-4')
    expect(colorOf(wrapper, 2)).toBe('--color-chart-line-1')
  })
})

describe('跟盤重算照舊不打擾', () => {
  it('一根走完時三支同時走背景那一條重算', async () => {
    const { calculations, recalculations, feed } = await mountPanel([7, 8, 9])
    for (const [index, one] of calculations.pending.entries()) {
      one.succeed(`第${index}支`)
    }
    await flushPromises()

    feed.reportClosed()
    await flushPromises()

    expect(sentStrategyScriptIds(recalculations.pending)).toEqual([7, 8, 9])
    expect(calculations.pending).toHaveLength(3)
  })

  it('使用者換標的時三支走使用者在等的那一條，頂端進度條照舊會亮', async () => {
    const { wrapper, calculations, recalculations } = await mountPanel([7, 8, 9])

    for (const one of calculations.pending) {
      one.succeed('比特幣的值')
    }
    await flushPromises()

    await pickSymbolInSearch(wrapper, 'ETHUSDT')
    await settle()

    expect(calculations.pending.slice(3).map(one => one.request.symbol))
      .toEqual(['ETHUSDT', 'ETHUSDT', 'ETHUSDT'])
    expect(recalculations.pending).toHaveLength(0)
  })
})
