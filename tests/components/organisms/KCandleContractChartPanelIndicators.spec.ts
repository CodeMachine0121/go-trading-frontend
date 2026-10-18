import Decimal from 'decimal.js'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import KCandleContractChartPanel from '~/components/organisms/KCandleContractChartPanel.vue'
import KCandleChart from '~/components/molecules/KCandleChart.vue'
import { KCandleChartApplication } from '~/application/k-candle-chart-application'
import { KCandleChartService } from '~/domain/service/k-candle-chart-service'
import { TradingSymbolApplication } from '~/application/trading-symbol-application'
import { TradingSymbolService } from '~/domain/service/trading-symbol-service'
import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import type { ILiveKCandleProxy } from '~/domain/interface/i-live-k-candle-proxy'
import type { IStrategyScriptProxy } from '~/domain/interface/i-strategy-script-proxy'
import type { IIndicatorCalculationProxy } from '~/domain/interface/i-indicator-calculation-proxy'
import type { IAppliedChartIndicatorPreferenceProxy } from '~/domain/interface/i-applied-chart-indicator-preference-proxy'
import type { IndicatorCalculationRequestDomain } from '~/domain/models/domains/indicator-calculation-request-domain'
import { KCandle } from '~/domain/models/entities/k-candle'
import { KCandleContract } from '~/domain/models/entities/k-candle-contract'
import { LiveKCandleUpdate } from '~/domain/models/entities/live-k-candle-update'
import type { ContractTradingSymbol } from '~/domain/models/entities/contract-trading-symbol'
import { IndicatorCalculation } from '~/domain/models/entities/indicator-calculation'
import { IndicatorValueVo } from '~/domain/models/vo/indicator-value-vo'
import { ContractPriceLineVo } from '~/domain/models/vo/contract-price-line-vo'
import { KCandleContractSeriesVo } from '~/domain/models/vo/k-candle-contract-series-vo'
import { RememberedAppliedIndicatorVo } from '~/domain/models/vo/remembered-applied-indicator-vo'
import { aggregationIntervalOf } from '~/domain/models/vo/aggregation-interval-vo'
import { IndicatorScriptFailedError } from '~/domain/errors/indicator-script-failed-error'
import { buildTimeZone } from '../../fixtures/time-zone'
import { openIndicatorDialog } from '../../fixtures/symbol-search'
import { buildChartDrawingApplication } from '../../fixtures/chart-drawing-application'
import { buildLiveKCandleContractApplication } from '../../fixtures/live-k-candle-application'
import { buildChartIndicatorApplication } from '../../fixtures/chart-indicator-application'
import {
  buildAdoptedStrategyScript, buildStoredStrategyScript, buildStrategyScriptApplication,
} from '../../fixtures/strategy-script-application'
import {
  buildContractTradingSymbol, buildContractTradingSymbolProxy, buildKCandleContractProxy,
} from '../../fixtures/contract-proxies'

const CURRENT_TIME = new Date('2026-09-23T12:00:30.000Z')
const LATEST_OPEN_TIME = '2026-09-23T11:45:00.000Z'

function buildKCandleContract(openTime: string): KCandleContract {
  const markLine = new ContractPriceLineVo(
    new Decimal('1'), new Decimal('1'), new Decimal('1'), new Decimal('1'))

  return new KCandleContract(
    'BTCUSDT', new Date(openTime),
    new Decimal('100'), new Decimal('130'), new Decimal('90'), new Decimal('110'),
    new Decimal('1'), new Decimal('1'), new Decimal('1'), new Decimal('1'),
    3, markLine, null, null,
  )
}

function buildSpotProxy(): IKCandleProxy {
  return {
    findKCandlesInRange: vi.fn(),
    findKCandleSeries: vi.fn(),
    saveKCandle: vi.fn(),
    updateKCandle: vi.fn(),
    deleteKCandle: vi.fn(),
    catchUpSymbol: vi.fn(),
  }
}

function controllableFeed() {
  const listeners: ((update: LiveKCandleUpdate) => void)[] = []
  const followKCandles: ILiveKCandleProxy['followKCandles'] = (_symbol, onUpdate) => {
    listeners.push(onUpdate)

    return () => {}
  }

  function reportClosed(openTime: string) {
    for (const listener of listeners) {
      listener(new LiveKCandleUpdate('BTCUSDT', 'closed', new KCandle('BTCUSDT', new Date(openTime),
        new Decimal('100'), new Decimal('130'), new Decimal('90'), new Decimal('118'),
        new Decimal('1'), new Decimal('1'), new Decimal('1'), new Decimal('1'))))
    }
  }

  return { followKCandles, reportClosed }
}

function seriesCalculation(indicatorNames: string[]) {
  return new IndicatorCalculation('BTCUSDT', '15m', 1, 'floatList',
    indicatorNames.map(name => new IndicatorValueVo(name, [115])), [new Date(LATEST_OPEN_TIME)])
}

function levelCalculation() {
  return new IndicatorCalculation('BTCUSDT', '15m', 1, 'float', [new IndicatorValueVo('水位', [115])])
}

const GAUSSIAN_CONTRACT = buildStoredStrategyScript(116, '高斯濾波（合約）', { marketDataKind: 'contractKCandle' })
const GAUSSIAN_SPOT = buildStoredStrategyScript(115, '高斯濾波（現貨）', { marketDataKind: 'kCandle' })

async function mountPanel(overrides: {
  mine?: ReturnType<typeof buildStoredStrategyScript>[]
  adopted?: ReturnType<typeof buildAdoptedStrategyScript>[]
  listAvailableStrategyScripts?: IStrategyScriptProxy['listAvailableStrategyScripts']
  calculateIndicator?: IIndicatorCalculationProxy['calculateIndicator']
  recalculateIndicator?: IIndicatorCalculationProxy['recalculateIndicator']
  appliedChartIndicatorPreferenceProxy?: Partial<IAppliedChartIndicatorPreferenceProxy>
  contractTradingSymbols?: ContractTradingSymbol[]
} = {}) {
  const feed = controllableFeed()
  const calculateIndicator = overrides.calculateIndicator
    ?? vi.fn().mockResolvedValue(seriesCalculation(['高斯濾波線', '上軌', '下軌', '趨勢方向']))
  const recalculateIndicator = overrides.recalculateIndicator
    ?? vi.fn().mockResolvedValue(seriesCalculation(['高斯濾波線']))
  const findKCandleContractSeries = vi.fn().mockImplementation(async ({ aggregationIntervalChoice }) =>
    new KCandleContractSeriesVo([buildKCandleContract(LATEST_OPEN_TIME)],
      aggregationIntervalOf(aggregationIntervalChoice.declaredInterval === '4h' ? '4h' : '15m')))

  const wrapper = mount(KCandleContractChartPanel, {
    props: {
      kCandleChartApplication: new KCandleChartApplication(
        new KCandleChartService(buildSpotProxy(), buildKCandleContractProxy({ findKCandleContractSeries }))),
      tradingSymbolApplication: new TradingSymbolApplication(new TradingSymbolService(
        { findTradingSymbols: vi.fn() },
        buildContractTradingSymbolProxy(overrides.contractTradingSymbols ?? [buildContractTradingSymbol('BTCUSDT')]))),
      liveKCandleContractApplication: buildLiveKCandleContractApplication({ followKCandles: feed.followKCandles }),
      chartIndicatorApplication: buildChartIndicatorApplication(
        { calculateIndicator, recalculateIndicator }, {}, {}, overrides.appliedChartIndicatorPreferenceProxy ?? {}),
      strategyScriptApplication: buildStrategyScriptApplication({
        listAvailableStrategyScripts: overrides.listAvailableStrategyScripts ?? vi.fn().mockResolvedValue({
          mine: overrides.mine ?? [GAUSSIAN_SPOT, GAUSSIAN_CONTRACT], adopted: overrides.adopted ?? [],
        }),
      }),
      timeZone: buildTimeZone('UTC'),
      chartDrawingApplication: buildChartDrawingApplication(),
    },
    global: { stubs: { KCandleChart: true } },
  })
  await flushPromises()
  await openIndicatorDialog(wrapper)

  return { wrapper, calculateIndicator, recalculateIndicator, feed, findKCandleContractSeries }
}

function pickerOptionTexts(wrapper: Awaited<ReturnType<typeof mountPanel>>['wrapper']): string[] {
  return wrapper.findAll('[data-testid="chart-indicator-picker"] option')
    .map(option => option.text())
    .slice(1)
}

async function applyStrategyScript(wrapper: Awaited<ReturnType<typeof mountPanel>>['wrapper'], id: number) {
  await wrapper.get('[data-testid="chart-indicator-picker"]').setValue(String(id))
  await flushPromises()
}

function sentRequest(calculate: ReturnType<typeof vi.fn>, callIndex = 0): IndicatorCalculationRequestDomain {
  return calculate.mock.calls[callIndex]?.[0] as IndicatorCalculationRequestDomain
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(CURRENT_TIME)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('合約圖表的指標清單', () => {
  it('只列吃合約行情的策略腳本', async () => {
    const { wrapper } = await mountPanel()

    expect(pickerOptionTexts(wrapper)).toEqual(['高斯濾波（合約）'])
  })

  it('從市集加入的合約策略腳本也列出來，挑得到也套得上', async () => {
    const { wrapper, calculateIndicator } = await mountPanel({
      mine: [],
      adopted: [
        buildAdoptedStrategyScript(200, '別人的通道', { marketDataKind: 'contractKCandle' }),
        buildAdoptedStrategyScript(201, '別人的現貨均線', { marketDataKind: 'kCandle' }),
      ],
    })

    expect(pickerOptionTexts(wrapper)).toEqual(['別人的通道'])
    await applyStrategyScript(wrapper, 200)
    expect(sentRequest(vi.mocked(calculateIndicator)).strategyScriptId).toBe(200)
    expect(wrapper.findAll('[data-testid="applied-indicator"]')).toHaveLength(1)
  })

  it('一支吃合約行情的策略腳本都沒有時明說並指路', async () => {
    const { wrapper } = await mountPanel({ mine: [GAUSSIAN_SPOT] })

    expect(wrapper.get('[data-testid="chart-indicator-empty"]').text())
      .toBe('還沒有吃合約行情的策略腳本，到合約策略腳本畫面新增一支。')
  })

  it('只回答是或否的合約策略腳本列著但挑不了', async () => {
    const { wrapper } = await mountPanel({
      mine: [buildStoredStrategyScript(117, '是否突破', { marketDataKind: 'contractKCandle', resultType: 'boolList' })],
    })

    const option = wrapper.findAll('[data-testid="chart-indicator-picker"] option')
      .find(candidate => candidate.text().includes('是否突破'))
    expect(option?.attributes('disabled')).toBeDefined()
    expect(option?.text()).toContain('畫不成線')
  })

  it('交易服務答不出有哪些策略腳本時圖照畫，清單是空的', async () => {
    const { wrapper } = await mountPanel({
      listAvailableStrategyScripts: vi.fn().mockRejectedValue(new Error('後端沒有回應')),
    })

    expect(wrapper.findComponent(KCandleChart).props('chart')?.kCandles).toHaveLength(1)
    expect(wrapper.find('[data-testid="chart-indicator-empty"]').exists()).toBe(true)
  })
})

describe('合約圖表畫出指標', () => {
  it('每一根各得一個值的畫成四條跟著 K 線走的曲線，圖例多一行', async () => {
    const { wrapper } = await mountPanel()

    await applyStrategyScript(wrapper, 116)

    const [indicator] = wrapper.findComponent(KCandleChart).props('indicators') ?? []
    expect(indicator?.series).toHaveLength(4)
    expect(indicator?.levels).toHaveLength(0)
    expect(wrapper.findAll('[data-testid="applied-indicator"]')).toHaveLength(1)
  })

  it('計算送到合約指標計算，算的是圖上這一檔、這個刻度', async () => {
    const { wrapper, calculateIndicator } = await mountPanel()

    await applyStrategyScript(wrapper, 116)

    const request = sentRequest(vi.mocked(calculateIndicator))
    expect(request.marketDataKind.value).toBe('contractKCandle')
    expect(request.symbol).toBe('BTCUSDT')
    expect(request.strategyScriptId).toBe(116)
  })

  it('只得出單一個值的畫成一條水平線', async () => {
    const { wrapper } = await mountPanel({
      mine: [buildStoredStrategyScript(118, '水位', { marketDataKind: 'contractKCandle', resultType: 'float' })],
      calculateIndicator: vi.fn().mockResolvedValue(levelCalculation()),
    })

    await applyStrategyScript(wrapper, 118)

    const [indicator] = wrapper.findComponent(KCandleChart).props('indicators') ?? []
    expect(indicator?.levels).toHaveLength(1)
    expect(indicator?.series).toHaveLength(0)
  })

  it('換彙總刻度時以新的刻度重算', async () => {
    const { wrapper, calculateIndicator } = await mountPanel()
    await applyStrategyScript(wrapper, 116)
    const callsBefore = vi.mocked(calculateIndicator).mock.calls.length

    await wrapper.get('[data-testid="aggregation-interval-choice-button"][data-interval="4h"]').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(400)
    await flushPromises()

    const calls = vi.mocked(calculateIndicator).mock.calls
    expect(calls.length).toBeGreaterThan(callsBefore)
    expect(sentRequest(vi.mocked(calculateIndicator), calls.length - 1).aggregationInterval.value).toBe('4h')
  })

  it('追蹤名單上的合約標的一根走完時在背景重算一次', async () => {
    const { wrapper, calculateIndicator, recalculateIndicator, feed } = await mountPanel()
    await applyStrategyScript(wrapper, 116)
    const calculationsBefore = vi.mocked(calculateIndicator).mock.calls.length

    feed.reportClosed('2026-09-23T12:00:00.000Z')
    await flushPromises()

    expect(recalculateIndicator).toHaveBeenCalledTimes(1)
    expect(sentRequest(vi.mocked(recalculateIndicator)).marketDataKind.value).toBe('contractKCandle')
    expect(vi.mocked(calculateIndicator).mock.calls.length).toBe(calculationsBefore)
  })

  it('不在追蹤名單上的合約標的不會自己重算', async () => {
    const { wrapper, recalculateIndicator, feed } = await mountPanel({
      contractTradingSymbols: [buildContractTradingSymbol('BTCUSDT', false)],
    })
    await applyStrategyScript(wrapper, 116)

    feed.reportClosed('2026-09-23T12:00:00.000Z')
    await flushPromises()

    expect(recalculateIndicator).not.toHaveBeenCalled()
  })

  it('一支本身有錯時只有那一行說明，另一支照常畫', async () => {
    const { wrapper } = await mountPanel({
      mine: [
        buildStoredStrategyScript(116, '會失敗的', { marketDataKind: 'contractKCandle' }),
        buildStoredStrategyScript(119, '算得出來的', { marketDataKind: 'contractKCandle' }),
      ],
      calculateIndicator: vi.fn()
        .mockRejectedValueOnce(new IndicatorScriptFailedError('算式執行失敗：boom'))
        .mockResolvedValue(seriesCalculation(['線'])),
    })

    await applyStrategyScript(wrapper, 116)
    await applyStrategyScript(wrapper, 119)

    expect(wrapper.get('[data-testid="indicator-error-1"]').text()).toContain('boom')
    expect(wrapper.find('[data-testid="indicator-error-2"]').exists()).toBe(false)
    expect(wrapper.findComponent(KCandleChart).props('indicators')).toHaveLength(1)
  })
})

describe('合約圖表擺著哪幾支記在合約那一份', () => {
  it('打開時還原的是合約那一份', async () => {
    const readAppliedChartIndicators = vi.fn((marketDataKind: string) => marketDataKind === 'contractKCandle'
      ? [new RememberedAppliedIndicatorVo(116, new Map())]
      : [new RememberedAppliedIndicatorVo(115, new Map())])
    const { wrapper } = await mountPanel({ appliedChartIndicatorPreferenceProxy: { readAppliedChartIndicators } })

    expect(readAppliedChartIndicators).toHaveBeenCalledWith('contractKCandle')
    expect(readAppliedChartIndicators).not.toHaveBeenCalledWith('kCandle')
    expect(wrapper.findAll('[data-testid="applied-indicator"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="applied-indicator"]').text()).toContain('高斯濾波（合約）')
  })

  it('記著的那一支已被刪掉時不回來，其餘照常', async () => {
    const { wrapper } = await mountPanel({
      appliedChartIndicatorPreferenceProxy: {
        readAppliedChartIndicators: vi.fn().mockReturnValue([
          new RememberedAppliedIndicatorVo(999, new Map()),
          new RememberedAppliedIndicatorVo(116, new Map()),
        ]),
      },
    })

    expect(wrapper.findAll('[data-testid="applied-indicator"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="applied-indicator"]').text()).toContain('高斯濾波（合約）')
  })

  it('移除最後一支時寫下的是合約那一份', async () => {
    const writeAppliedChartIndicators = vi.fn()
    const { wrapper } = await mountPanel({ appliedChartIndicatorPreferenceProxy: { writeAppliedChartIndicators } })
    await applyStrategyScript(wrapper, 116)

    await wrapper.get('[data-testid="remove-indicator-1"]').trigger('click')
    await flushPromises()

    expect(writeAppliedChartIndicators).toHaveBeenLastCalledWith('contractKCandle', [])
    expect(writeAppliedChartIndicators).not.toHaveBeenCalledWith('kCandle', expect.anything())
  })
})
