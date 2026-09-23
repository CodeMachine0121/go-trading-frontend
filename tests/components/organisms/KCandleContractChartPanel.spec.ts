import Decimal from 'decimal.js'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import KCandleContractChartPanel from '~/components/organisms/KCandleContractChartPanel.vue'
import KCandleChart from '~/components/molecules/KCandleChart.vue'
import ContractSymbolField from '~/components/molecules/ContractSymbolField.vue'
import ChartIndicatorPanel from '~/components/molecules/ChartIndicatorPanel.vue'
import { KCandleChartApplication } from '~/application/k-candle-chart-application'
import { KCandleChartService } from '~/domain/service/k-candle-chart-service'
import { TradingSymbolApplication } from '~/application/trading-symbol-application'
import { TradingSymbolService } from '~/domain/service/trading-symbol-service'
import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import type { IKCandleContractProxy } from '~/domain/interface/i-k-candle-contract-proxy'
import { KCandleContract } from '~/domain/models/entities/k-candle-contract'
import { ContractPriceLineVo } from '~/domain/models/vo/contract-price-line-vo'
import { KCandleContractSeriesVo } from '~/domain/models/vo/k-candle-contract-series-vo'
import { aggregationIntervalOf } from '~/domain/models/vo/aggregation-interval-vo'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { buildTimeZone } from '../../fixtures/time-zone'
import { onADesktop, onAPhone } from '../../fixtures/layout-density'
import {
  buildContractTradingSymbol, buildContractTradingSymbolProxy, buildKCandleContractProxy,
} from '../../fixtures/contract-proxies'

// 只 mock 最外層的 proxy 介面；application、domain service 與 domain model 都是真的。
// 圖本身以 stub 取代：它要的是真正的畫布。
const CURRENT_TIME = new Date('2026-09-23T12:00:00.000Z')
const INTERVAL_SELECT = '[data-testid="aggregation-interval-choice-select"]'

function buildKCandleContract(openTime: string, closePrice: string): KCandleContract {
  const markLine = new ContractPriceLineVo(
    new Decimal('1'), new Decimal('1'), new Decimal('1'), new Decimal('7777'))

  return new KCandleContract(
    'BTCUSDT', new Date(openTime),
    new Decimal('100'), new Decimal('130'), new Decimal('90'), new Decimal(closePrice),
    new Decimal('1'), new Decimal('1'), new Decimal('1'), new Decimal('1'),
    3, markLine, null, null,
  )
}

function contractSeriesOf(kCandleContracts: KCandleContract[], interval = '15m'): KCandleContractSeriesVo {
  return new KCandleContractSeriesVo(kCandleContracts, aggregationIntervalOf(interval))
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

async function mountPanel(kCandleContractProxy: IKCandleContractProxy, spotProxy = buildSpotProxy()) {
  const wrapper = mount(KCandleContractChartPanel, {
    props: {
      kCandleChartApplication: new KCandleChartApplication(
        new KCandleChartService(spotProxy, kCandleContractProxy)),
      tradingSymbolApplication: new TradingSymbolApplication(new TradingSymbolService(
        { findTradingSymbols: vi.fn() },
        buildContractTradingSymbolProxy([buildContractTradingSymbol('BTCUSDT'), buildContractTradingSymbol('ETHUSDT')]))),
      timeZone: buildTimeZone('UTC'),
      layoutDensity: onADesktop(),
    },
    global: { stubs: { KCandleChart: true } },
  })
  await flushPromises()

  return wrapper
}

function loadPlanOf(findKCandleContractSeries: ReturnType<typeof vi.fn>, callNumber: number) {
  return findKCandleContractSeries.mock.calls[callNumber]?.[0]
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(CURRENT_TIME)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('KCandleContractChartPanel', () => {
  it('一進來畫 BTCUSDT 最近一天，標系統說的每根涵蓋，最大的數字是最新那一根的收盤價', async () => {
    const spotProxy = buildSpotProxy()
    const findKCandleContractSeries = vi.fn().mockResolvedValue(contractSeriesOf([
      buildKCandleContract('2026-09-23T11:00:00.000Z', '110'),
      buildKCandleContract('2026-09-23T11:15:00.000Z', '105.5'),
    ]))
    const wrapper = await mountPanel(buildKCandleContractProxy({ findKCandleContractSeries }), spotProxy)

    expect(findKCandleContractSeries).toHaveBeenCalledTimes(1)
    const loadPlan = loadPlanOf(findKCandleContractSeries, 0)
    expect(loadPlan.symbol).toBe('BTCUSDT')
    expect(loadPlan.visibleStartTime.toISOString()).toBe('2026-09-22T12:00:00.000Z')
    expect(loadPlan.visibleEndTime.toISOString()).toBe('2026-09-23T12:00:00.000Z')
    expect(spotProxy.findKCandleSeries).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="interval-label"]').text()).toBe('十五分鐘')
    expect(wrapper.get('[data-testid="k-candle-quote"]').text()).toContain('105.5')
    expect(wrapper.findComponent(KCandleChart).props('chart')?.kCandles).toHaveLength(2)
  })

  it('把每根涵蓋改成五分鐘時，看的那一段不動，改以五分鐘重畫', async () => {
    const findKCandleContractSeries = vi.fn()
      .mockResolvedValueOnce(contractSeriesOf([buildKCandleContract('2026-09-23T11:00:00.000Z', '110')]))
      .mockResolvedValueOnce(contractSeriesOf([buildKCandleContract('2026-09-23T11:00:00.000Z', '110')], '5m'))
    const wrapper = await mountPanel(buildKCandleContractProxy({ findKCandleContractSeries }))

    await wrapper.get(INTERVAL_SELECT).setValue('5m')
    await flushPromises()

    const loadPlan = loadPlanOf(findKCandleContractSeries, 1)
    expect(loadPlan.aggregationIntervalChoice.declaredInterval).toBe('5m')
    expect(loadPlan.visibleStartTime.toISOString()).toBe('2026-09-22T12:00:00.000Z')
    expect(loadPlan.visibleEndTime.toISOString()).toBe('2026-09-23T12:00:00.000Z')
    expect(wrapper.get('[data-testid="interval-label"]').text()).toBe('五分鐘')
  })

  it('在圖上拉遠時換成那一段，由系統換粗一點的每根涵蓋', async () => {
    const findKCandleContractSeries = vi.fn()
      .mockResolvedValueOnce(contractSeriesOf([buildKCandleContract('2026-09-23T11:00:00.000Z', '110')]))
      .mockResolvedValueOnce(contractSeriesOf([
        buildKCandleContract('2026-09-14T00:00:00.000Z', '90'),
        buildKCandleContract('2026-09-23T11:00:00.000Z', '95'),
      ], '1h'))
    const wrapper = await mountPanel(buildKCandleContractProxy({ findKCandleContractSeries }))

    wrapper.findComponent(KCandleChart).vm.$emit('rangeChange', {
      startTime: new Date('2026-09-13T12:00:00.000Z'), endTime: new Date('2026-09-23T12:00:00.000Z'),
    })
    await flushPromises()

    const loadPlan = loadPlanOf(findKCandleContractSeries, 1)
    expect(loadPlan.visibleStartTime.toISOString()).toBe('2026-09-13T12:00:00.000Z')
    // 挑的仍是「自動」：粗細由系統換，圖上標的是它說的那一種
    expect(loadPlan.aggregationIntervalChoice.declaredInterval).toBeNull()
    expect(wrapper.get('[data-testid="interval-label"]').text()).toBe('一小時')
    expect(wrapper.findComponent(KCandleChart).props('chart')?.kCandles.map(kCandle => kCandle.close.toString()))
      .toEqual(['90', '95'])
  })

  it('換合約時換一批資料，看的那一段不變', async () => {
    const findKCandleContractSeries = vi.fn().mockResolvedValue(
      contractSeriesOf([buildKCandleContract('2026-09-23T11:00:00.000Z', '110')]))
    const wrapper = await mountPanel(buildKCandleContractProxy({ findKCandleContractSeries }))

    await wrapper.get('[data-testid="contract-symbol-select"]').setValue('ETHUSDT')
    await flushPromises()

    const loadPlan = loadPlanOf(findKCandleContractSeries, 1)
    expect(loadPlan.symbol).toBe('ETHUSDT')
    expect(loadPlan.visibleStartTime.toISOString()).toBe('2026-09-22T12:00:00.000Z')
  })

  it('常駐一句話說沒有即時跟盤與指標，資料由背景每分鐘同步', async () => {
    const wrapper = await mountPanel(buildKCandleContractProxy({
      findKCandleContractSeries: vi.fn().mockResolvedValue(contractSeriesOf([])),
    }))

    const notice = wrapper.get('[data-testid="no-live-follow-notice"]').text()
    expect(notice).toContain('沒有即時跟盤')
    expect(notice).toContain('沒有指標')
    expect(notice).toContain('背景每分鐘同步')
  })

  it('沒有現貨才有的控制項：套用指標那一塊與立刻更新都不在', async () => {
    const wrapper = await mountPanel(buildKCandleContractProxy({
      findKCandleContractSeries: vi.fn().mockResolvedValue(
        contractSeriesOf([buildKCandleContract('2026-09-23T11:00:00.000Z', '110')])),
    }))

    expect(wrapper.find('[data-testid="catch-up-button"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('立刻更新')
    expect(wrapper.findComponent(ChartIndicatorPanel).exists()).toBe(false)
    expect(wrapper.findComponent(ContractSymbolField).exists()).toBe(true)
  })

  it('那一段太長而被拒絕時，照系統說的原因呈現', async () => {
    const findKCandleContractSeries = vi.fn()
      .mockResolvedValueOnce(contractSeriesOf([buildKCandleContract('2026-09-23T11:00:00.000Z', '110')]))
      .mockRejectedValueOnce(new BackendRequestRejectedError(
        '時間區間過大，請縮小區間；若指定了彙總刻度，也可以改用更長的一種'))
    const wrapper = await mountPanel(buildKCandleContractProxy({ findKCandleContractSeries }))

    await wrapper.get(INTERVAL_SELECT).setValue('1m')
    await flushPromises()

    expect(wrapper.get('[data-testid="rejected-alert"]').text())
      .toBe('時間區間過大，請縮小區間；若指定了彙總刻度，也可以改用更長的一種')
    expect(wrapper.findComponent(KCandleChart).exists()).toBe(false)
  })

  it('連不上後端時說連不上，並給一顆重試', async () => {
    const findKCandleContractSeries = vi.fn()
      .mockRejectedValueOnce(new BackendUnreachableError('/contract-k-candles/series'))
      .mockResolvedValueOnce(contractSeriesOf([buildKCandleContract('2026-09-23T11:00:00.000Z', '110')]))
    const wrapper = await mountPanel(buildKCandleContractProxy({ findKCandleContractSeries }))

    expect(wrapper.get('[data-testid="unreachable-alert"]').text()).toContain('連不上後端')

    await wrapper.get('[data-testid="unreachable-alert"]').get('button').trigger('click')
    await flushPromises()

    expect(wrapper.findComponent(KCandleChart).exists()).toBe(true)
  })

  it('那段時間一根都沒有時說查無 K 線', async () => {
    const wrapper = await mountPanel(buildKCandleContractProxy({
      findKCandleContractSeries: vi.fn().mockResolvedValue(contractSeriesOf([])),
    }))

    expect(wrapper.get('[data-testid="empty-chart"]').text()).toContain('查無 K 線')
  })

  it('一個合約都挑不到時不去取，也不怪使用者', async () => {
    const findKCandleContractSeries = vi.fn().mockResolvedValue(contractSeriesOf([]))
    const wrapper = await mountPanel(buildKCandleContractProxy({ findKCandleContractSeries }))
    findKCandleContractSeries.mockClear()

    wrapper.findComponent(ContractSymbolField).vm.$emit('update:modelValue', '')
    await flushPromises()

    expect(findKCandleContractSeries).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="rejected-alert"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="idle-chart"]').exists()).toBe(true)
  })

  it('後端出錯時說不是區間的問題，並給一顆重試', async () => {
    const findKCandleContractSeries = vi.fn()
      .mockRejectedValueOnce(new BackendServerError('database unavailable'))
      .mockResolvedValueOnce(contractSeriesOf([buildKCandleContract('2026-09-23T11:00:00.000Z', '110')]))
    const wrapper = await mountPanel(buildKCandleContractProxy({ findKCandleContractSeries }))

    expect(wrapper.get('[data-testid="server-error-alert"]').text()).toContain('database unavailable')

    await wrapper.get('[data-testid="server-error-alert"]').get('button').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="server-error-alert"]').exists()).toBe(false)
    expect(wrapper.findComponent(KCandleChart).exists()).toBe(true)
  })

  it('說不出是哪一種失敗時，照樣說取行情失敗而不是一片空白', async () => {
    const wrapper = await mountPanel(buildKCandleContractProxy({
      findKCandleContractSeries: vi.fn().mockRejectedValue(new Error('boom')),
    }))

    expect(wrapper.get('[data-testid="rejected-alert"]').text()).toBe('取行情時發生未預期的錯誤。')
  })

  it('畫法換成曲線時圖跟著換', async () => {
    const wrapper = await mountPanel(buildKCandleContractProxy({
      findKCandleContractSeries: vi.fn().mockResolvedValue(
        contractSeriesOf([buildKCandleContract('2026-09-23T11:00:00.000Z', '110')])),
    }))

    const lineButton = wrapper.findAll('[data-testid="drawing-button"]').find(button => button.text() === '曲線')
    await lineButton?.trigger('click')

    expect(wrapper.findComponent(KCandleChart).props('drawing')).toBe('line')
  })

  it('按快捷區間時看那一段，那一顆亮起來', async () => {
    const findKCandleContractSeries = vi.fn().mockResolvedValue(
      contractSeriesOf([buildKCandleContract('2026-09-23T11:00:00.000Z', '110')]))
    const wrapper = await mountPanel(buildKCandleContractProxy({ findKCandleContractSeries }))

    const fiveDays = wrapper.findAll('[data-testid="range-preset-button"]').find(button => button.text() === '五天')
    await fiveDays?.trigger('click')
    await flushPromises()

    const loadPlan = loadPlanOf(findKCandleContractSeries, findKCandleContractSeries.mock.calls.length - 1)
    // 時鐘會隨真實時間往前走，所以比的是看了多長，而不是從哪一刻開始。
    expect(loadPlan.visibleEndTime.getTime() - loadPlan.visibleStartTime.getTime())
      .toBe(5 * 24 * 60 * 60 * 1000)
    expect(fiveDays?.classes().join(' ')).toContain('primary')
  })

  it('先送出的那一次晚回來時不蓋掉後來那一次', async () => {
    let answerTheFirst: (series: KCandleContractSeriesVo) => void = () => {}
    const findKCandleContractSeries = vi.fn()
      .mockResolvedValueOnce(contractSeriesOf([buildKCandleContract('2026-09-23T11:00:00.000Z', '110')]))
      .mockReturnValueOnce(new Promise<KCandleContractSeriesVo>((resolve) => {
        answerTheFirst = resolve
      }))
      .mockResolvedValueOnce(contractSeriesOf([buildKCandleContract('2026-09-23T11:00:00.000Z', '222')], '5m'))
    const wrapper = await mountPanel(buildKCandleContractProxy({ findKCandleContractSeries }))

    // 改粗細那一次還沒回來，使用者又在圖上拖了一下（選單在等的時候是停用的，圖不是）。
    await wrapper.get(INTERVAL_SELECT).setValue('1m')
    wrapper.findComponent(KCandleChart).vm.$emit('rangeChange', {
      startTime: new Date('2026-09-20T12:00:00.000Z'), endTime: new Date('2026-09-23T12:00:00.000Z'),
    })
    await flushPromises()
    answerTheFirst(contractSeriesOf([buildKCandleContract('2026-09-23T11:00:00.000Z', '111')], '1m'))
    await flushPromises()

    expect(wrapper.findComponent(KCandleChart).props('chart')?.kCandles[0]?.close.toString()).toBe('222')
    expect(wrapper.get('[data-testid="interval-label"]').text()).toBe('五分鐘')
    expect(wrapper.find('[data-testid="loading-alert"]').exists()).toBe(false)
  })

  it('先送出的那一次晚回來而且失敗了，也不蓋掉後來那一次', async () => {
    let failTheFirst: (failure: Error) => void = () => {}
    const findKCandleContractSeries = vi.fn()
      .mockResolvedValueOnce(contractSeriesOf([buildKCandleContract('2026-09-23T11:00:00.000Z', '110')]))
      .mockReturnValueOnce(new Promise<KCandleContractSeriesVo>((_resolve, reject) => {
        failTheFirst = reject
      }))
      .mockResolvedValueOnce(contractSeriesOf([buildKCandleContract('2026-09-23T11:00:00.000Z', '222')], '5m'))
    const wrapper = await mountPanel(buildKCandleContractProxy({ findKCandleContractSeries }))

    // 改粗細那一次還沒回來，使用者又在圖上拖了一下（選單在等的時候是停用的，圖不是）。
    await wrapper.get(INTERVAL_SELECT).setValue('1m')
    wrapper.findComponent(KCandleChart).vm.$emit('rangeChange', {
      startTime: new Date('2026-09-20T12:00:00.000Z'), endTime: new Date('2026-09-23T12:00:00.000Z'),
    })
    await flushPromises()
    failTheFirst(new BackendRequestRejectedError('時間區間過大'))
    await flushPromises()

    expect(wrapper.find('[data-testid="rejected-alert"]').exists()).toBe(false)
    expect(wrapper.findComponent(KCandleChart).props('chart')?.kCandles[0]?.close.toString()).toBe('222')
  })

  it('小幅拖動、還在手上那批之內時不重新取，圖照舊', async () => {
    const findKCandleContractSeries = vi.fn().mockResolvedValue(
      contractSeriesOf([buildKCandleContract('2026-09-23T11:00:00.000Z', '110')]))
    const wrapper = await mountPanel(buildKCandleContractProxy({ findKCandleContractSeries }))

    wrapper.findComponent(KCandleChart).vm.$emit('rangeChange', {
      startTime: new Date('2026-09-22T11:00:00.000Z'), endTime: new Date('2026-09-23T11:00:00.000Z'),
    })
    await flushPromises()

    expect(findKCandleContractSeries).toHaveBeenCalledTimes(1)
    expect(wrapper.findComponent(KCandleChart).props('chart')?.kCandles).toHaveLength(1)
  })

  it('版面：「看什麼」一塊，圖的標題是畫出來的那一個合約', async () => {
    const wrapper = await mountPanel(buildKCandleContractProxy({
      findKCandleContractSeries: vi.fn().mockResolvedValue(
        contractSeriesOf([buildKCandleContract('2026-09-23T11:00:00.000Z', '110')])),
    }))

    expect(wrapper.findAll('h2').map(title => title.text())).toEqual(['看什麼', 'BTCUSDT'])
  })

  it('收起「看什麼」之後，沒有即時跟盤那一句照樣在', async () => {
    const wrapper = await mountPanel(buildKCandleContractProxy({
      findKCandleContractSeries: vi.fn().mockResolvedValue(contractSeriesOf([])),
    }))

    await wrapper.get('[data-testid="toggle-panel"]').trigger('click')

    expect(wrapper.get('[data-testid="toggle-panel"]').attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('[data-testid="no-live-follow-notice"]').text()).toContain('沒有即時跟盤')
  })

  it('取行情的時候說正在取', async () => {
    const wrapper = await mountPanel(buildKCandleContractProxy({
      findKCandleContractSeries: vi.fn().mockReturnValue(new Promise(() => {})),
    }))

    expect(wrapper.get('[data-testid="loading-alert"]').text()).toBe('取行情中…')
  })

  it('手機上控制項一開始收著，預設那一個不在清單上時照樣改畫清單上的第一個', async () => {
    const findKCandleContractSeries = vi.fn().mockResolvedValue(contractSeriesOf([]))
    mount(KCandleContractChartPanel, {
      props: {
        kCandleChartApplication: new KCandleChartApplication(
          new KCandleChartService(buildSpotProxy(), buildKCandleContractProxy({ findKCandleContractSeries }))),
        tradingSymbolApplication: new TradingSymbolApplication(new TradingSymbolService(
          { findTradingSymbols: vi.fn() }, buildContractTradingSymbolProxy([buildContractTradingSymbol('ETHUSDT')]))),
        timeZone: buildTimeZone('UTC'),
        layoutDensity: onAPhone(),
      },
      global: { stubs: { KCandleChart: true } },
    })
    await flushPromises()

    const lastLoadPlan = loadPlanOf(findKCandleContractSeries, findKCandleContractSeries.mock.calls.length - 1)
    expect(lastLoadPlan.symbol).toBe('ETHUSDT')
  })
})
