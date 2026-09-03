import Decimal from 'decimal.js'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import KCandleChartPanel from '~/components/organisms/KCandleChartPanel.vue'
import KCandleChart from '~/components/molecules/KCandleChart.vue'
import { KCandleChartApplication } from '~/application/k-candle-chart-application'
import { KCandleChartService } from '~/domain/service/k-candle-chart-service'
import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import type { ILiveKCandleProxy } from '~/domain/interface/i-live-k-candle-proxy'
import { KCandle } from '~/domain/models/entities/k-candle'
import { LiveKCandleUpdate, type LiveKCandleStatus } from '~/domain/models/entities/live-k-candle-update'
import { IndicatorCalculation } from '~/domain/models/entities/indicator-calculation'
import { IndicatorValueVo } from '~/domain/models/vo/indicator-value-vo'
import { buildTradingSymbolApplication } from '../../fixtures/trading-symbol-application'
import { buildStrategyApplication, buildStoredStrategy } from '../../fixtures/strategy-application'
import { buildChartIndicatorApplication } from '../../fixtures/chart-indicator-application'
import { buildLiveKCandleApplication } from '../../fixtures/live-k-candle-application'
import { buildTimeZone } from '../../fixtures/time-zone'

const CURRENT_TIME = new Date('2026-09-03T12:00:00.000Z')

function buildKCandle(openTime: string, closePrice: string): KCandle {
  return new KCandle(
    'BTCUSDT', new Date(openTime),
    new Decimal('100'), new Decimal('130'), new Decimal('90'), new Decimal(closePrice),
    new Decimal('1'), new Decimal('1'), new Decimal('1'), new Decimal('1'),
  )
}

function buildKCandleProxy(): IKCandleProxy {
  return {
    findKCandleSeries: vi.fn().mockResolvedValue(
      [buildKCandle('2026-09-03T11:55:00.000Z', '110')]),
    findKCandlesInRange: vi.fn(),
    saveKCandle: vi.fn(),
    updateKCandle: vi.fn(),
    deleteKCandle: vi.fn(),
  }
}

/** 一條由測試決定何時說話的通道。 */
function controllableFeed() {
  const listeners: ((update: LiveKCandleUpdate) => void)[] = []
  const stopped = { count: 0 }
  const followKCandles: ILiveKCandleProxy['followKCandles'] = (_symbol, onUpdate) => {
    listeners.push(onUpdate)

    return () => {
      stopped.count += 1
    }
  }

  function report(status: LiveKCandleStatus, closePrice = '118') {
    const kCandle = status === 'stalled'
      ? null
      : buildKCandle('2026-09-03T12:00:00.000Z', closePrice)
    for (const listener of listeners) {
      listener(new LiveKCandleUpdate('BTCUSDT', status, kCandle))
    }
  }

  return { followKCandles, report, stopped, followerCount: () => listeners.length }
}

async function mountPanel(feed: ReturnType<typeof controllableFeed>) {
  const calculateIndicator = vi.fn().mockResolvedValue(new IndicatorCalculation(
    'BTCUSDT', '5m', 1, 'float', [new IndicatorValueVo('均價', [115])]))

  const wrapper = mount(KCandleChartPanel, {
    props: {
      kCandleChartApplication: new KCandleChartApplication(
        new KCandleChartService(buildKCandleProxy())),
      tradingSymbolApplication: buildTradingSymbolApplication(),
      liveKCandleApplication: buildLiveKCandleApplication(
        { followKCandles: feed.followKCandles }),
      chartIndicatorApplication: buildChartIndicatorApplication({ calculateIndicator }),
      strategyApplication: buildStrategyApplication({
        listStrategies: vi.fn().mockResolvedValue(
          [buildStoredStrategy(7, '二十根均線', { resultType: 'float' })]),
      }),
      timeZone: buildTimeZone(),
    },
    global: { stubs: { KCandleChart: true } },
  })
  await flushPromises()

  return { wrapper, calculateIndicator }
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(CURRENT_TIME)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('圖跟著市場走', () => {
  it('市場動了，圖上就多出正在走的那一根', async () => {
    const feed = controllableFeed()
    const { wrapper } = await mountPanel(feed)

    feed.report('forming', '118')
    await flushPromises()

    const kCandles = wrapper.findComponent(KCandleChart).props('chart')?.kCandles ?? []
    expect(kCandles[kCandles.length - 1]?.close.toString()).toBe('118')
  })

  it('換交易標的就換跟的對象', async () => {
    const feed = controllableFeed()
    const { wrapper } = await mountPanel(feed)
    expect(feed.followerCount()).toBe(1)

    await wrapper.get('[data-testid="symbol-select"]').setValue('ETHUSDT')
    await flushPromises()

    expect(feed.stopped.count).toBe(1)
    expect(feed.followerCount()).toBe(2)
  })

  it('離開畫面時，還在等停手的那次重算也一起收掉', async () => {
    // 對一個已經不存在的畫面重算，算完也沒有地方可以畫。
    const feed = controllableFeed()
    const { wrapper, calculateIndicator } = await mountPanel(feed)
    await wrapper.get('[data-testid="chart-indicator-picker"]').setValue('7')
    await flushPromises()
    expect(calculateIndicator).toHaveBeenCalledTimes(1)

    wrapper.findComponent(KCandleChart).vm.$emit('rangeChange', {
      startTime: new Date('2026-09-03T09:00:00.000Z'),
      endTime: new Date('2026-09-03T11:00:00.000Z'),
    })
    await flushPromises()
    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(400)
    await flushPromises()

    expect(calculateIndicator).toHaveBeenCalledTimes(1)
  })

  it('離開畫面就不再跟', async () => {
    const feed = controllableFeed()
    const { wrapper } = await mountPanel(feed)

    wrapper.unmount()

    expect(feed.stopped.count).toBe(1)
  })
})

describe('進行中 K 線不影響指標', () => {
  it('還在走的那一根動了，指標不重算', async () => {
    // 它本來就不算數，重算出來必然一樣，只是白算。
    const feed = controllableFeed()
    const { wrapper, calculateIndicator } = await mountPanel(feed)
    await wrapper.get('[data-testid="chart-indicator-picker"]').setValue('7')
    await flushPromises()
    expect(calculateIndicator).toHaveBeenCalledTimes(1)

    feed.report('forming', '118')
    feed.report('forming', '119')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(400)

    expect(calculateIndicator).toHaveBeenCalledTimes(1)
  })

  it('一根走完就重算每一支', async () => {
    // 那一刻指標可用的資料真的多了一根。
    const feed = controllableFeed()
    const { wrapper, calculateIndicator } = await mountPanel(feed)
    await wrapper.get('[data-testid="chart-indicator-picker"]').setValue('7')
    await flushPromises()

    feed.report('closed', '118')
    await flushPromises()

    expect(calculateIndicator).toHaveBeenCalledTimes(2)
  })

  it('一支都沒套用時，一根走完也不發生任何計算', async () => {
    const feed = controllableFeed()
    const { calculateIndicator } = await mountPanel(feed)

    feed.report('closed', '118')
    await flushPromises()

    expect(calculateIndicator).not.toHaveBeenCalled()
  })
})

describe('即時更新停掉的時候', () => {
  it('停止時明白說出來', async () => {
    const feed = controllableFeed()
    const { wrapper } = await mountPanel(feed)

    feed.report('stalled')
    await flushPromises()

    expect(wrapper.find('[data-testid="live-update-stalled-alert"]').exists()).toBe(true)
  })

  it('停止時圖照樣顯示手上有的，不清空也不跳錯誤畫面', async () => {
    const feed = controllableFeed()
    const { wrapper } = await mountPanel(feed)

    feed.report('stalled')
    await flushPromises()

    expect(wrapper.findComponent(KCandleChart).exists()).toBe(true)
    expect(wrapper.findComponent(KCandleChart).props('chart')?.kCandles).toHaveLength(1)
    expect(wrapper.find('[data-testid="server-error-alert"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="rejected-alert"]').exists()).toBe(false)
  })

  it('恢復之後那個說明自己消失', async () => {
    const feed = controllableFeed()
    const { wrapper } = await mountPanel(feed)
    feed.report('stalled')
    await flushPromises()

    feed.report('forming', '118')
    await flushPromises()

    expect(wrapper.find('[data-testid="live-update-stalled-alert"]').exists()).toBe(false)
    const kCandles = wrapper.findComponent(KCandleChart).props('chart')?.kCandles ?? []
    expect(kCandles[kCandles.length - 1]?.close.toString()).toBe('118')
  })
})
