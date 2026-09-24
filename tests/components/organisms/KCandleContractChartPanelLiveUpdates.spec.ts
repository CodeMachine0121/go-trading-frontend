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
import { KCandle } from '~/domain/models/entities/k-candle'
import { KCandleContract } from '~/domain/models/entities/k-candle-contract'
import { LiveKCandleUpdate, type LiveKCandleStatus } from '~/domain/models/entities/live-k-candle-update'
import type { ContractTradingSymbol } from '~/domain/models/entities/contract-trading-symbol'
import { ContractPriceLineVo } from '~/domain/models/vo/contract-price-line-vo'
import { KCandleContractSeriesVo } from '~/domain/models/vo/k-candle-contract-series-vo'
import { aggregationIntervalOf } from '~/domain/models/vo/aggregation-interval-vo'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { buildTimeZone } from '../../fixtures/time-zone'
import { onADesktop } from '../../fixtures/layout-density'
import { buildLiveKCandleContractApplication } from '../../fixtures/live-k-candle-application'
import {
  buildContractTradingSymbol, buildContractTradingSymbolProxy, buildKCandleContractProxy,
} from '../../fixtures/contract-proxies'

// 只 mock 最外層的通道與 proxy；application、domain service 與併入的算法都是真的。
const CURRENT_TIME = new Date('2026-09-23T12:00:30.000Z')

function buildKCandleContract(symbol: string, openTime: string, closePrice: string): KCandleContract {
  const markLine = new ContractPriceLineVo(
    new Decimal('1'), new Decimal('1'), new Decimal('1'), new Decimal('1'))

  return new KCandleContract(
    symbol, new Date(openTime),
    new Decimal('100'), new Decimal('130'), new Decimal('90'), new Decimal(closePrice),
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

/** 一條由測試決定何時說話的合約通道，記得每一次是替哪一個合約標的開的。 */
function controllableFeed() {
  const follows: { symbol: string, onUpdate: (update: LiveKCandleUpdate) => void }[] = []
  const stopped = { count: 0 }
  const followKCandles = vi.fn<ILiveKCandleProxy['followKCandles']>((symbol, onUpdate) => {
    follows.push({ symbol, onUpdate })

    return () => {
      stopped.count += 1
    }
  })

  function reportTo(followIndex: number, status: LiveKCandleStatus, openTime: string, closePrice: string) {
    const follow = follows[followIndex]!
    const carriesACandle = status === 'forming' || status === 'closed'
    follow.onUpdate(new LiveKCandleUpdate(follow.symbol, status, carriesACandle
      ? new KCandle(follow.symbol, new Date(openTime),
          new Decimal('100'), new Decimal('130'), new Decimal('90'), new Decimal(closePrice),
          new Decimal('1'), new Decimal('1'), new Decimal('1'), new Decimal('1'))
      : null))
  }

  function report(status: LiveKCandleStatus, openTime = '2026-09-23T12:00:00.000Z', closePrice = '64050') {
    reportTo(follows.length - 1, status, openTime, closePrice)
  }

  return { followKCandles, report, reportTo, stopped, follows }
}

async function mountPanel(
  feed: ReturnType<typeof controllableFeed>,
  contractTradingSymbols: ContractTradingSymbol[] = [buildContractTradingSymbol('BTCUSDT'), buildContractTradingSymbol('ETHUSDT')],
  findKCandleContractSeries = vi.fn().mockImplementation(async ({ symbol }: { symbol: string }) =>
    new KCandleContractSeriesVo(
      [buildKCandleContract(symbol, '2026-09-23T11:45:00.000Z', '64000')], aggregationIntervalOf('15m'))),
) {
  const wrapper = mount(KCandleContractChartPanel, {
    props: {
      kCandleChartApplication: new KCandleChartApplication(
        new KCandleChartService(buildSpotProxy(), buildKCandleContractProxy({ findKCandleContractSeries }))),
      tradingSymbolApplication: new TradingSymbolApplication(new TradingSymbolService(
        { findTradingSymbols: vi.fn() }, buildContractTradingSymbolProxy(contractTradingSymbols))),
      liveKCandleContractApplication: buildLiveKCandleContractApplication({ followKCandles: feed.followKCandles }),
      timeZone: buildTimeZone('UTC'),
      layoutDensity: onADesktop(),
    },
    global: { stubs: { KCandleChart: true } },
  })
  await flushPromises()

  return wrapper
}

function drawnCloses(wrapper: Awaited<ReturnType<typeof mountPanel>>): string[] {
  return (wrapper.findComponent(KCandleChart).props('chart')?.kCandles ?? [])
    .map(kCandle => kCandle.close.toString())
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(CURRENT_TIME)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('合約圖表看著就跟', () => {
  it('畫出一個名單上的合約標的就開始跟它的合約即時更新', async () => {
    const feed = controllableFeed()
    await mountPanel(feed)

    expect(feed.followKCandles).toHaveBeenCalledTimes(1)
    expect(feed.follows[0]!.symbol).toBe('BTCUSDT')
  })

  it('還在走的那一根跟著動：最新那一根與最新價都變成 64050', async () => {
    const feed = controllableFeed()
    const wrapper = await mountPanel(feed)

    feed.report('forming', '2026-09-23T12:00:00.000Z', '64050')
    await flushPromises()

    expect(drawnCloses(wrapper).at(-1)).toBe('64050')
    expect(wrapper.get('[data-testid="k-candle-quote"]').text()).toContain('64050')
  })

  it('走完一根、下一根開始，圖上多出一根新的', async () => {
    const feed = controllableFeed()
    const wrapper = await mountPanel(feed)

    feed.report('closed', '2026-09-23T12:00:00.000Z', '64050')
    feed.report('forming', '2026-09-23T12:15:00.000Z', '64100')
    await flushPromises()

    expect(drawnCloses(wrapper)).toEqual(['64000', '64050', '64100'])
  })

  it('即時更新只併進圖：不為了它重新取行情', async () => {
    const feed = controllableFeed()
    const findKCandleContractSeries = vi.fn().mockResolvedValue(new KCandleContractSeriesVo(
      [buildKCandleContract('BTCUSDT', '2026-09-23T11:45:00.000Z', '64000')], aggregationIntervalOf('15m')))
    await mountPanel(feed, undefined, findKCandleContractSeries)
    const loadsBefore = findKCandleContractSeries.mock.calls.length

    feed.report('closed', '2026-09-23T12:00:00.000Z', '64050')
    feed.report('forming', '2026-09-23T12:15:00.000Z', '64100')
    await flushPromises()

    expect(findKCandleContractSeries.mock.calls.length).toBe(loadsBefore)
  })

  it('換合約標的就改跟新的那一個，之後才到的舊更新不改圖', async () => {
    const feed = controllableFeed()
    const wrapper = await mountPanel(feed)

    await wrapper.get('[data-testid="contract-symbol-select"]').setValue('ETHUSDT')
    await flushPromises()

    expect(feed.stopped.count).toBeGreaterThanOrEqual(1)
    expect(feed.follows.at(-1)!.symbol).toBe('ETHUSDT')

    feed.reportTo(0, 'forming', '2026-09-23T12:00:00.000Z', '99999')
    await flushPromises()

    expect(drawnCloses(wrapper)).not.toContain('99999')
    expect(wrapper.findComponent(KCandleChart).props('chart')?.symbol).toBe('ETHUSDT')
  })

  it('離開就停', async () => {
    const feed = controllableFeed()
    const wrapper = await mountPanel(feed)
    const stoppedBefore = feed.stopped.count

    wrapper.unmount()

    expect(feed.stopped.count).toBe(stoppedBefore + 1)
  })

  it('圖取不到就不跟，圖清空並說出被拒絕的原因', async () => {
    const feed = controllableFeed()
    const wrapper = await mountPanel(feed, undefined,
      vi.fn().mockRejectedValue(new BackendRequestRejectedError('區間不合法')))

    expect(feed.followKCandles).not.toHaveBeenCalled()
    expect(wrapper.findComponent(KCandleChart).exists()).toBe(false)
    expect(wrapper.get('[data-testid="rejected-alert"]').text()).toContain('區間不合法')
  })
})

describe('圖放掉時跟盤一起放掉', () => {
  it('換到一個取不到圖的合約標的，原本那一條停掉，之後到的舊更新不讓圖復活', async () => {
    const feed = controllableFeed()
    const findKCandleContractSeries = vi.fn().mockImplementation(async ({ symbol }: { symbol: string }) => {
      if (symbol === 'ETHUSDT') {
        throw new BackendRequestRejectedError('這個合約還沒有資料')
      }

      return new KCandleContractSeriesVo(
        [buildKCandleContract(symbol, '2026-09-23T11:45:00.000Z', '64000')], aggregationIntervalOf('15m'))
    })
    const wrapper = await mountPanel(feed, undefined, findKCandleContractSeries)
    const stoppedBefore = feed.stopped.count

    await wrapper.get('[data-testid="contract-symbol-select"]').setValue('ETHUSDT')
    await flushPromises()

    expect(feed.stopped.count).toBeGreaterThan(stoppedBefore)

    feed.reportTo(0, 'forming', '2026-09-23T12:00:00.000Z', '64050')
    await flushPromises()

    expect(wrapper.findComponent(KCandleChart).exists()).toBe(false)
  })
})

describe('不在合約追蹤名單上的沒有即時更新', () => {
  it('不跟、圖照樣畫出，並說加進合約追蹤名單就會即時跟盤', async () => {
    const feed = controllableFeed()
    const wrapper = await mountPanel(feed, [buildContractTradingSymbol('DOGEUSDT', false)])

    expect(feed.follows.filter(follow => follow.symbol === 'DOGEUSDT')).toHaveLength(0)
    expect(wrapper.findComponent(KCandleChart).props('chart')?.symbol).toBe('DOGEUSDT')
    expect(wrapper.get('[data-testid="live-update-noLivePlace-alert"]').text()).toBe(
      '這個合約標的不在合約追蹤名單上，沒有即時更新——把它加進合約追蹤名單就會即時跟盤。')
  })

  it('名單上的合約標的沒有那一句', async () => {
    const feed = controllableFeed()
    const wrapper = await mountPanel(feed)

    expect(wrapper.find('[data-testid="live-update-noLivePlace-alert"]').exists()).toBe(false)
  })

  it('換到一個不在名單上的就停掉原本那一條', async () => {
    const feed = controllableFeed()
    const wrapper = await mountPanel(feed,
      [buildContractTradingSymbol('BTCUSDT'), buildContractTradingSymbol('DOGEUSDT', false)])
    const stoppedBefore = feed.stopped.count

    await wrapper.get('[data-testid="contract-symbol-select"]').setValue('DOGEUSDT')
    await flushPromises()

    expect(feed.stopped.count).toBeGreaterThan(stoppedBefore)
    expect(feed.follows.filter(follow => follow.symbol === 'DOGEUSDT')).toHaveLength(0)
    expect(wrapper.find('[data-testid="live-update-noLivePlace-alert"]').exists()).toBe(true)
  })
})

describe('不知道在不在名單上時照常跟', () => {
  it('合約標的清單取不到時照常跟，也不說它不在名單上', async () => {
    const feed = controllableFeed()
    const wrapper = mount(KCandleContractChartPanel, {
      props: {
        kCandleChartApplication: new KCandleChartApplication(new KCandleChartService(buildSpotProxy(),
          buildKCandleContractProxy({ findKCandleContractSeries: vi.fn().mockResolvedValue(new KCandleContractSeriesVo(
            [buildKCandleContract('BTCUSDT', '2026-09-23T11:45:00.000Z', '64000')], aggregationIntervalOf('15m'))) }))),
        tradingSymbolApplication: new TradingSymbolApplication(new TradingSymbolService(
          { findTradingSymbols: vi.fn() },
          { findContractTradingSymbols: vi.fn().mockRejectedValue(new Error('後端沒有回應')) })),
        liveKCandleContractApplication: buildLiveKCandleContractApplication({ followKCandles: feed.followKCandles }),
        timeZone: buildTimeZone('UTC'),
        layoutDensity: onADesktop(),
      },
      global: { stubs: { KCandleChart: true } },
    })
    await flushPromises()

    expect(feed.follows.map(follow => follow.symbol)).toEqual(['BTCUSDT'])
    expect(feed.stopped.count).toBe(0)
    expect(wrapper.find('[data-testid="live-update-noLivePlace-alert"]').exists()).toBe(false)
  })

  it('圖先畫出來、清單後來才說它不在名單上時，停掉已經開的那一條', async () => {
    const feed = controllableFeed()
    let resolveSymbols: (symbols: ContractTradingSymbol[]) => void = () => {}
    const wrapper = mount(KCandleContractChartPanel, {
      props: {
        kCandleChartApplication: new KCandleChartApplication(new KCandleChartService(buildSpotProxy(),
          buildKCandleContractProxy({ findKCandleContractSeries: vi.fn().mockResolvedValue(new KCandleContractSeriesVo(
            [buildKCandleContract('BTCUSDT', '2026-09-23T11:45:00.000Z', '64000')], aggregationIntervalOf('15m'))) }))),
        tradingSymbolApplication: new TradingSymbolApplication(new TradingSymbolService(
          { findTradingSymbols: vi.fn() },
          { findContractTradingSymbols: vi.fn().mockReturnValue(new Promise((resolve) => { resolveSymbols = resolve })) })),
        liveKCandleContractApplication: buildLiveKCandleContractApplication({ followKCandles: feed.followKCandles }),
        timeZone: buildTimeZone('UTC'),
        layoutDensity: onADesktop(),
      },
      global: { stubs: { KCandleChart: true } },
    })
    await flushPromises()
    expect(feed.follows.map(follow => follow.symbol)).toEqual(['BTCUSDT'])

    resolveSymbols([buildContractTradingSymbol('BTCUSDT', false)])
    await flushPromises()

    expect(feed.stopped.count).toBe(1)
    expect(wrapper.find('[data-testid="live-update-noLivePlace-alert"]').exists()).toBe(true)
  })
})

describe('換走又換回來', () => {
  it('換到不在名單上的、圖還沒回來就換回原本那一個：原本那一個接著跟', async () => {
    const feed = controllableFeed()
    const findKCandleContractSeries = vi.fn().mockImplementation(({ symbol }: { symbol: string }) => {
      if (symbol === 'DOGEUSDT') {
        return new Promise(() => {})
      }

      return Promise.resolve(new KCandleContractSeriesVo(
        [buildKCandleContract(symbol, '2026-09-23T11:45:00.000Z', '64000')], aggregationIntervalOf('15m')))
    })
    const wrapper = await mountPanel(feed,
      [buildContractTradingSymbol('BTCUSDT'), buildContractTradingSymbol('DOGEUSDT', false)],
      findKCandleContractSeries)
    expect(feed.followKCandles).toHaveBeenCalledTimes(1)

    await wrapper.get('[data-testid="contract-symbol-select"]').setValue('DOGEUSDT')
    await flushPromises()
    await wrapper.get('[data-testid="contract-symbol-select"]').setValue('BTCUSDT')
    await flushPromises()

    expect(feed.followKCandles).toHaveBeenCalledTimes(2)
    expect(feed.follows.at(-1)!.symbol).toBe('BTCUSDT')

    feed.report('forming', '2026-09-23T12:00:00.000Z', '64050')
    await flushPromises()

    expect(drawnCloses(wrapper).at(-1)).toBe('64050')
  })
})

describe('跟不動時明說', () => {
  it('斷了就說已停止，圖照樣顯示；重新跟上後那一句消失', async () => {
    const feed = controllableFeed()
    const wrapper = await mountPanel(feed)

    feed.report('stalled')
    await flushPromises()

    expect(wrapper.get('[data-testid="live-update-stalled-alert"]').text()).toBe(
      '即時更新已停止，正在重新連上。圖表顯示的是目前手上的資料。')
    expect(drawnCloses(wrapper)).toEqual(['64000'])

    feed.report('forming', '2026-09-23T12:00:00.000Z', '64050')
    await flushPromises()

    expect(wrapper.find('[data-testid="live-update-stalled-alert"]').exists()).toBe(false)
    expect(drawnCloses(wrapper).at(-1)).toBe('64050')
  })

  it('通道結束了：說不會自己重新連上、要確認合約追蹤名單再重新整理，圖照樣顯示', async () => {
    const feed = controllableFeed()
    const wrapper = await mountPanel(feed)

    feed.report('ended')
    await flushPromises()

    expect(wrapper.get('[data-testid="live-update-ended-alert"]').text()).toBe(
      '即時更新已中斷，不會自己重新連上——確認這個合約標的還在合約追蹤名單上，再重新整理頁面。圖表顯示的是目前手上的資料。')
    expect(wrapper.find('[data-testid="live-update-stalled-alert"]').exists()).toBe(false)
    expect(drawnCloses(wrapper)).toEqual(['64000'])
  })

  it('合約從不說收盤中', async () => {
    const feed = controllableFeed()
    const wrapper = await mountPanel(feed)

    feed.report('stalled')
    await flushPromises()

    expect(wrapper.find('[data-testid="live-update-marketClosed-alert"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('收盤中')
  })
})
