import Decimal from 'decimal.js'
import { seriesOf } from '../../fixtures/k-candle-series'
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
import { buildStrategyScriptApplication, buildStoredStrategyScript } from '../../fixtures/strategy-script-application'
import { buildChartIndicatorApplication } from '../../fixtures/chart-indicator-application'
import { buildLiveKCandleApplication } from '../../fixtures/live-k-candle-application'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { buildTimeZone } from '../../fixtures/time-zone'
import { onADesktop } from '../../fixtures/layout-density'
import { buildKCandleContractProxy } from '../../fixtures/contract-proxies'

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
    findKCandleSeries: vi.fn().mockResolvedValue(seriesOf([buildKCandle('2026-09-03T11:55:00.000Z', '110')])),
    findKCandlesInRange: vi.fn(),
    saveKCandle: vi.fn(),
    updateKCandle: vi.fn(),
    deleteKCandle: vi.fn(),
    catchUpSymbol: vi.fn().mockResolvedValue(0),
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
    const carriesACandle = status === 'forming' || status === 'closed'
    const kCandle = carriesACandle
      ? buildKCandle('2026-09-03T12:00:00.000Z', closePrice)
      : null
    for (const listener of listeners) {
      listener(new LiveKCandleUpdate('BTCUSDT', status, kCandle))
    }
  }

  return { followKCandles, report, stopped, followerCount: () => listeners.length }
}

async function mountPanel(
  feed: ReturnType<typeof controllableFeed>,
  kCandleProxy: Partial<IKCandleProxy> = {},
  tradingSymbolApplication = buildTradingSymbolApplication(),
) {
  const calculateIndicator = vi.fn().mockResolvedValue(new IndicatorCalculation(
    'BTCUSDT', '5m', 1, 'float', [new IndicatorValueVo('均價', [115])]))
  // 一根走完後的重算走背景那一條：使用者什麼都沒按。
  const recalculateIndicator = vi.fn().mockResolvedValue(new IndicatorCalculation(
    'BTCUSDT', '5m', 1, 'float', [new IndicatorValueVo('均價', [115])]))

  const wrapper = mount(KCandleChartPanel, {
    props: {
      kCandleChartApplication: new KCandleChartApplication(
        new KCandleChartService({ ...buildKCandleProxy(), ...kCandleProxy }, buildKCandleContractProxy())),
      tradingSymbolApplication,
      liveKCandleApplication: buildLiveKCandleApplication(
        { followKCandles: feed.followKCandles }),
      chartIndicatorApplication: buildChartIndicatorApplication({ calculateIndicator, recalculateIndicator }),
      strategyScriptApplication: buildStrategyScriptApplication({
        listAvailableStrategyScripts: vi.fn().mockResolvedValue({ mine: [buildStoredStrategyScript(7, '二十根均線', { resultType: 'float' })], adopted: [] }),
      }),
      timeZone: buildTimeZone(),
      layoutDensity: onADesktop(),
    },
    global: { stubs: { KCandleChart: true } },
  })
  await flushPromises()

  return { wrapper, calculateIndicator, recalculateIndicator }
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(CURRENT_TIME)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('圖跟著市場走', () => {
  it('市場動了，圖上就多出正在走的那一根，最上面的行情摘要也跟著報新價', async () => {
    const feed = controllableFeed()
    const { wrapper } = await mountPanel(feed)
    expect(wrapper.get('[data-testid="k-candle-quote"]').text()).toContain('110')
    expect(wrapper.get('[data-testid="k-candle-quote"]').text()).not.toContain('118')

    feed.report('forming', '118')
    await flushPromises()

    const kCandles = wrapper.findComponent(KCandleChart).props('chart')?.kCandles ?? []
    expect(kCandles[kCandles.length - 1]?.close.toString()).toBe('118')
    expect(wrapper.get('[data-testid="k-candle-quote"]').text()).toContain('118')
  })

  it('新的一根進來時畫面不重新擺位——它長進右邊那段留白裡', async () => {
    // 留白存在的理由之一就是給新的一根長。每分鐘把讀圖的人的畫面推一下，
    // 比留白被慢慢吃掉難受得多；而這件事改壞了不會有任何畫面報錯，
    // 所以這一條站在這裡：交給圖的那一段，在市場動過之後必須逐字相同。
    const feed = controllableFeed()
    const { wrapper } = await mountPanel(feed)
    const before = wrapper.findComponent(KCandleChart).props('drawnRange')

    feed.report('closed', '118')
    await flushPromises()

    const kCandles = wrapper.findComponent(KCandleChart).props('chart')?.kCandles ?? []
    expect(kCandles[kCandles.length - 1]?.close.toString()).toBe('118')
    expect(wrapper.findComponent(KCandleChart).props('drawnRange')).toEqual(before)
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

describe('取行情失敗之後', () => {
  it('不再跟上一檔的市場，圖也不會被它復活', async () => {
    // 留著跟盤，上一檔的下一則更新就會把圖畫回來——而畫面上同時說著取行情失敗。
    const feed = controllableFeed()
    const { wrapper } = await mountPanel(feed, {
      findKCandleSeries: vi.fn()
        .mockResolvedValueOnce(seriesOf([buildKCandle('2026-09-03T11:55:00.000Z', '110')]))
        .mockRejectedValue(new BackendServerError('後端出錯了')),
    })

    await wrapper.get('[data-testid="symbol-select"]').setValue('ETHUSDT')
    await flushPromises()
    expect(feed.stopped.count).toBe(1)

    feed.report('forming', '118')
    await flushPromises()

    expect(wrapper.findComponent(KCandleChart).exists()).toBe(false)
    expect(wrapper.find('[data-testid="server-error-alert"]').exists()).toBe(true)
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
    const { wrapper, calculateIndicator, recalculateIndicator } = await mountPanel(feed)
    await wrapper.get('[data-testid="chart-indicator-picker"]').setValue('7')
    await flushPromises()

    feed.report('closed', '118')
    await flushPromises()

    // 加進來那一次是使用者在等的；走完那一根之後的重算是畫面自己做的。
    expect(calculateIndicator).toHaveBeenCalledTimes(1)
    expect(recalculateIndicator).toHaveBeenCalledTimes(1)
  })

  it('一支都沒套用時，一根走完也不發生任何計算', async () => {
    const feed = controllableFeed()
    const { calculateIndicator, recalculateIndicator } = await mountPanel(feed)

    feed.report('closed', '118')
    await flushPromises()

    expect(calculateIndicator).not.toHaveBeenCalled()
    expect(recalculateIndicator).not.toHaveBeenCalled()
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

describe('圖表上那一句話：三種原因共用一個位置，一次只說一句', () => {
  it('這一檔沒有即時更新時，說的是它不會自己好', async () => {
    // 「等到明天也一樣」與「等一下會自己好」是兩句話。給錯那一句，
    // 看的人會一直等一件不會發生的事。
    const feed = controllableFeed()
    const { wrapper } = await mountPanel(feed)

    feed.report('unavailable')
    await flushPromises()

    expect(wrapper.find('[data-testid="live-update-noLivePlace-alert"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="live-update-stalled-alert"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('每分鐘更新一次')
  })

  it('市場收盤時說收盤，而不是那幾則故障', async () => {
    // 收盤時沒有新資料是正常的。說成故障，等於每天晚上謊報一次。
    const feed = controllableFeed()
    const { wrapper } = await mountPanel(feed, {}, buildTradingSymbolApplication(
      ['BTCUSDT'], { isWithinTradingSession: false }))

    expect(wrapper.find('[data-testid="live-update-marketClosed-alert"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('收盤中')
  })

  it('收盤時不再多說一次即時已停止', async () => {
    const feed = controllableFeed()
    const { wrapper } = await mountPanel(feed, {}, buildTradingSymbolApplication(
      ['BTCUSDT'], { isWithinTradingSession: false }))

    feed.report('stalled')
    await flushPromises()

    expect(wrapper.find('[data-testid="live-update-marketClosed-alert"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="live-update-stalled-alert"]').exists()).toBe(false)
  })

  it('一切正常時一句話都不說', async () => {
    const feed = controllableFeed()
    const { wrapper } = await mountPanel(feed)

    feed.report('forming')
    await flushPromises()

    expect(wrapper.find('[data-testid="live-update-marketClosed-alert"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="live-update-noLivePlace-alert"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="live-update-stalled-alert"]').exists()).toBe(false)
  })

  it('看著市場收盤的那一刻，說的是收盤，不是即時已停止', async () => {
    // 這一刻的收盤只有更新說得出來：進畫面時問到的那一份說的是「還在交易時段內」。
    // 讀不出這一則的話，畫面會說「正在重新連上」——承諾一個要等到明天的恢復。
    const feed = controllableFeed()
    const { wrapper } = await mountPanel(feed, {}, buildTradingSymbolApplication(
      ['BTCUSDT'], { isWithinTradingSession: true }))
    expect(wrapper.find('[data-testid="live-update-marketClosed-alert"]').exists()).toBe(false)

    feed.report('marketClosed')
    await flushPromises()

    expect(wrapper.find('[data-testid="live-update-marketClosed-alert"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="live-update-stalled-alert"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="live-update-noLivePlace-alert"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('收盤中')
  })

  it('收盤那一刻，圖照樣顯示收盤前的最後那一根', async () => {
    const feed = controllableFeed()
    const { wrapper } = await mountPanel(feed)
    feed.report('closed', '118')
    await flushPromises()

    feed.report('marketClosed')
    await flushPromises()

    const kCandles = wrapper.findComponent(KCandleChart).props('chart')?.kCandles ?? []
    expect(kCandles[kCandles.length - 1]?.close.toString()).toBe('118')
  })

  it('開盤之後那一句自己消失，不必重新整理', async () => {
    // 進畫面那一刻問到的那一份不會自己更新。少了這一條，八點五十打開圖表的人
    // 會在九點之後繼續看到「收盤中」——一邊看著最後那一根在旁邊跳。
    const feed = controllableFeed()
    const { wrapper } = await mountPanel(feed, {}, buildTradingSymbolApplication(
      ['BTCUSDT'], { isWithinTradingSession: false }))
    expect(wrapper.find('[data-testid="live-update-marketClosed-alert"]').exists()).toBe(true)

    feed.report('forming')
    await flushPromises()

    expect(wrapper.find('[data-testid="live-update-marketClosed-alert"]').exists()).toBe(false)
  })

  it('拿到名額之後那一句自己消失', async () => {
    // 同一個道理：名額也是那一刻問到的，而它會變。
    const feed = controllableFeed()
    const { wrapper } = await mountPanel(feed, {}, buildTradingSymbolApplication(
      ['BTCUSDT'], { hasLiveUpdates: false }))
    expect(wrapper.find('[data-testid="live-update-noLivePlace-alert"]').exists()).toBe(true)

    feed.report('forming')
    await flushPromises()

    expect(wrapper.find('[data-testid="live-update-noLivePlace-alert"]').exists()).toBe(false)
  })

  it('沒有即時更新時圖照樣顯示手上有的', async () => {
    // 沒有的是「即時」，不是「圖表」。
    const feed = controllableFeed()
    const { wrapper } = await mountPanel(feed)

    feed.report('unavailable')
    await flushPromises()

    expect(wrapper.findComponent(KCandleChart).exists()).toBe(true)
  })
})

describe('通道結束了', () => {
  it('說不會自己重新連上、要重新整理，不說正在重新連上；圖照樣顯示', async () => {
    const feed = controllableFeed()
    const { wrapper } = await mountPanel(feed)

    feed.report('ended')
    await flushPromises()

    expect(wrapper.get('[data-testid="live-update-ended-alert"]').text()).toBe(
      '即時更新已中斷，不會自己重新連上。重新整理頁面再試一次；圖表顯示的是目前手上的資料。')
    expect(wrapper.find('[data-testid="live-update-stalled-alert"]').exists()).toBe(false)
    expect(wrapper.findComponent(KCandleChart).exists()).toBe(true)
  })
})
