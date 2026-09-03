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

/**
 * 圖上手上這一批有兩根：一根舊的、一根最新的。
 * 兩根刻意隔得很開，這樣「看得到最新那一根」與「看得到隨便哪一根」才分得出來。
 */
const OLDEST_OPEN_TIME = '2026-09-03T09:30:00.000Z'
const LATEST_OPEN_TIME = '2026-09-03T11:55:00.000Z'

/** 看得到最新那一根：右端在 11:55 之後。 */
const SHOWING_NOW = {
  startTime: new Date('2026-09-03T09:00:00.000Z'),
  endTime: new Date('2026-09-03T12:00:00.000Z'),
}

/**
 * 看不到最新那一根：右端在 11:55 之前。
 * 它刻意落在**兩根之間**——舊那根看得到、最新那根看不到——
 * 這樣「拿錯了哪一根當最新的」會立刻現形。
 */
const SHOWING_THE_PAST = {
  startTime: new Date('2026-09-03T06:00:00.000Z'),
  endTime: new Date('2026-09-03T10:00:00.000Z'),
}

function buildKCandle(openTime: string, closePrice: string): KCandle {
  return new KCandle(
    'BTCUSDT', new Date(openTime),
    new Decimal('100'), new Decimal('130'), new Decimal('90'), new Decimal(closePrice),
    new Decimal('1'), new Decimal('1'), new Decimal('1'), new Decimal('1'),
  )
}

function buildKCandleProxy(): IKCandleProxy {
  return {
    findKCandleSeries: vi.fn().mockResolvedValue([
      buildKCandle(OLDEST_OPEN_TIME, '105'),
      buildKCandle(LATEST_OPEN_TIME, '110'),
    ]),
    findKCandlesInRange: vi.fn(),
    saveKCandle: vi.fn(),
    updateKCandle: vi.fn(),
    deleteKCandle: vi.fn(),
  }
}

/** 一條由測試決定何時說話的通道。 */
function controllableFeed() {
  const listeners: ((update: LiveKCandleUpdate) => void)[] = []
  const followKCandles: ILiveKCandleProxy['followKCandles'] = (_symbol, onUpdate) => {
    listeners.push(onUpdate)

    return () => {}
  }

  function report(status: LiveKCandleStatus, openTime = LATEST_OPEN_TIME) {
    const kCandle = status === 'stalled' ? null : buildKCandle(openTime, '118')
    for (const listener of listeners) {
      listener(new LiveKCandleUpdate('BTCUSDT', status, kCandle))
    }
  }

  return { followKCandles, report }
}

async function mountPanel() {
  const feed = controllableFeed()
  const calculateIndicator = vi.fn().mockResolvedValue(new IndicatorCalculation(
    'BTCUSDT', '5m', 1, 'float', [new IndicatorValueVo('均價', [115])]))

  const wrapper = mount(KCandleChartPanel, {
    props: {
      kCandleChartApplication: new KCandleChartApplication(
        new KCandleChartService(buildKCandleProxy())),
      tradingSymbolApplication: buildTradingSymbolApplication(),
      liveKCandleApplication: buildLiveKCandleApplication({ followKCandles: feed.followKCandles }),
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
  await wrapper.get('[data-testid="chart-indicator-picker"]').setValue('7')
  await flushPromises()

  return { wrapper, calculateIndicator, feed }
}

/** 等使用者停手。 */
async function settle() {
  await vi.advanceTimersByTimeAsync(400)
  await flushPromises()
}

async function look(
  wrapper: Awaited<ReturnType<typeof mountPanel>>['wrapper'],
  range: { startTime: Date, endTime: Date },
) {
  wrapper.findComponent(KCandleChart).vm.$emit('rangeChange', range)
  await flushPromises()
  await settle()
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(CURRENT_TIME)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('在看現在，就算到現在', () => {
  it('一根走完時以現在重算——截止時間交給系統判斷', async () => {
    const { wrapper, calculateIndicator, feed } = await mountPanel()
    await look(wrapper, SHOWING_NOW)
    const calculationsSoFar = calculateIndicator.mock.calls.length

    feed.report('closed')
    await flushPromises()

    expect(calculateIndicator.mock.calls.length).toBe(calculationsSoFar + 1)
    expect(calculateIndicator).toHaveBeenLastCalledWith(
      expect.objectContaining({ endTime: null }))
  })

  it('連續走完好幾根都一直跟著走', async () => {
    // 使用者一整天沒碰畫面，答案不該停在他打開畫面的那一刻。
    const { wrapper, calculateIndicator, feed } = await mountPanel()
    await look(wrapper, SHOWING_NOW)
    const calculationsSoFar = calculateIndicator.mock.calls.length

    for (const _ of [1, 2, 3]) {
      feed.report('closed')
      await flushPromises()
    }

    expect(calculateIndicator.mock.calls.length).toBe(calculationsSoFar + 3)
  })

  it('往回拖一點但最新那一根還看得見，仍然算到現在', async () => {
    const { wrapper, calculateIndicator, feed } = await mountPanel()
    // 右端剛好落在最新那一根上——這就是邊界。
    await look(wrapper, {
      startTime: new Date('2026-09-03T09:00:00.000Z'),
      endTime: new Date(LATEST_OPEN_TIME),
    })
    const calculationsSoFar = calculateIndicator.mock.calls.length

    feed.report('closed')
    await flushPromises()

    expect(calculateIndicator.mock.calls.length).toBe(calculationsSoFar + 1)
    expect(calculateIndicator).toHaveBeenLastCalledWith(
      expect.objectContaining({ endTime: null }))
  })
})

describe('在看過去，就停在那一段', () => {
  it('看不見最新那一根時，一根走完不重算', async () => {
    const { wrapper, calculateIndicator, feed } = await mountPanel()
    await look(wrapper, SHOWING_THE_PAST)
    const calculationsSoFar = calculateIndicator.mock.calls.length

    feed.report('closed')
    await flushPromises()

    expect(calculateIndicator.mock.calls.length).toBe(calculationsSoFar)
  })

  it('待再久、走完再多根，答案也一次都沒變', async () => {
    const { wrapper, calculateIndicator, feed } = await mountPanel()
    await look(wrapper, SHOWING_THE_PAST)
    const calculationsSoFar = calculateIndicator.mock.calls.length

    for (const _ of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
      feed.report('closed')
      await flushPromises()
    }

    expect(calculateIndicator.mock.calls.length).toBe(calculationsSoFar)
  })

  it('算到的是那一段的右端，不是現在', async () => {
    const { wrapper, calculateIndicator } = await mountPanel()

    await look(wrapper, SHOWING_THE_PAST)

    expect(calculateIndicator).toHaveBeenLastCalledWith(expect.objectContaining({
      endTime: SHOWING_THE_PAST.endTime,
    }))
  })

  it('拖回來看得見最新那一根時，重新算到現在', async () => {
    const { wrapper, calculateIndicator } = await mountPanel()
    await look(wrapper, SHOWING_THE_PAST)
    expect(calculateIndicator).toHaveBeenLastCalledWith(
      expect.objectContaining({ endTime: SHOWING_THE_PAST.endTime }))

    await look(wrapper, SHOWING_NOW)

    expect(calculateIndicator).toHaveBeenLastCalledWith(
      expect.objectContaining({ endTime: null }))
  })
})

describe('看過去時，圖照樣跟著市場走', () => {
  it('看不見最新那一根時它照樣更新，拖回來就是最新的', async () => {
    // 指標停住是因為那一根不在他看的那一段裡，不是因為跟盤該停——
    // 把跟盤變成「只在看現在時才運作」會讓他拖回來時看到一張過期的圖。
    const { wrapper, feed } = await mountPanel()
    await look(wrapper, SHOWING_THE_PAST)

    feed.report('forming', '2026-09-03T12:00:00.000Z')
    await flushPromises()

    const kCandles = wrapper.findComponent(KCandleChart).props('chart')?.kCandles ?? []
    expect(kCandles.map(kCandle => kCandle.openTime.toISOString()))
      .toContain('2026-09-03T12:00:00.000Z')
  })

  it('即時更新停掉時照樣明說，與在看哪一段無關', async () => {
    const { wrapper, feed } = await mountPanel()
    await look(wrapper, SHOWING_THE_PAST)

    feed.report('stalled')
    await flushPromises()

    expect(wrapper.find('[data-testid="live-update-stalled-alert"]').exists()).toBe(true)
  })
})

describe('「看哪一段」與「算到哪一刻」互不干擾', () => {
  it('換一段仍在看現在時，以新那一段算、且算到現在', async () => {
    const { wrapper, calculateIndicator } = await mountPanel()
    await look(wrapper, SHOWING_NOW)

    await look(wrapper, {
      startTime: new Date('2026-08-31T12:00:00.000Z'),
      endTime: new Date('2026-09-03T12:00:00.000Z'),
    })

    expect(calculateIndicator).toHaveBeenLastCalledWith(expect.objectContaining({
      endTime: null,
      // 三天、一天最多 400 根看得清，因此挑到的是十五分鐘一根 → 288 根。
      candleCount: 288,
    }))
  })

  it('一支都沒套用時，一根走完不發生任何計算', async () => {
    const feed = controllableFeed()
    const calculateIndicator = vi.fn()
    const wrapper = mount(KCandleChartPanel, {
      props: {
        kCandleChartApplication: new KCandleChartApplication(
          new KCandleChartService(buildKCandleProxy())),
        tradingSymbolApplication: buildTradingSymbolApplication(),
        liveKCandleApplication: buildLiveKCandleApplication({ followKCandles: feed.followKCandles }),
        chartIndicatorApplication: buildChartIndicatorApplication({ calculateIndicator }),
        strategyApplication: buildStrategyApplication({
          listStrategies: vi.fn().mockResolvedValue([]),
        }),
        timeZone: buildTimeZone(),
      },
      global: { stubs: { KCandleChart: true } },
    })
    await flushPromises()
    await look(wrapper, SHOWING_NOW)

    feed.report('closed')
    await flushPromises()

    expect(calculateIndicator).not.toHaveBeenCalled()
  })
})
