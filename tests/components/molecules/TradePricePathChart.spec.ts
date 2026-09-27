import Decimal from 'decimal.js'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import TradePricePathChart from '~/components/molecules/TradePricePathChart.vue'
import { TradePricePathDto } from '~/domain/models/dto/trade-price-path-dto'
import { TradePricePathCandleDto } from '~/domain/models/dto/trade-price-path-candle-dto'
import { TradePricePathMarkerDto } from '~/domain/models/dto/trade-price-path-marker-dto'
import { TradePricePathLineDto } from '~/domain/models/dto/trade-price-path-line-dto'
import { buildTimeZone } from '../../fixtures/time-zone'

const chartLibrary = vi.hoisted(() => {
  const candlestickSeries = {
    setData: vi.fn(),
    applyOptions: vi.fn(),
    createPriceLine: vi.fn((options: { title: string }) => ({ title: options.title })),
    removePriceLine: vi.fn(),
  }
  const markers = { setMarkers: vi.fn() }
  const chart = {
    addSeries: vi.fn(() => candlestickSeries),
    applyOptions: vi.fn(),
    timeScale: vi.fn(() => ({ fitContent: vi.fn() })),
    remove: vi.fn(),
  }

  return {
    candlestickSeries,
    markers,
    chart,
    createChart: vi.fn(() => chart),
    createSeriesMarkers: vi.fn(() => markers),
  }
})

vi.mock('lightweight-charts', () => ({
  createChart: chartLibrary.createChart,
  createSeriesMarkers: chartLibrary.createSeriesMarkers,
  CandlestickSeries: 'CandlestickSeries',
}))

const FIRST_MOMENT = new Date('2026-09-25T06:00:00Z')

function pricePath(lines = [
  new TradePricePathLineDto(new Decimal('96380'), '計畫止損', 'danger', '96,380'),
  new TradePricePathLineDto(new Decimal('100785'), '計畫止盈', 'success', '100,785'),
]) {
  return new TradePricePathDto(
    [new TradePricePathCandleDto(FIRST_MOMENT, new Decimal('97850'), new Decimal('98010'), new Decimal('97780'), new Decimal('97960'))],
    [
      new TradePricePathMarkerDto(FIRST_MOMENT, 'entry', '進場 97,905'),
      new TradePricePathMarkerDto(new Date('2026-09-26T08:40:00Z'), 'exit', '出場 100,420'),
    ],
    lines,
    null,
  )
}

async function mountChart() {
  vi.clearAllMocks()
  const wrapper = mount(TradePricePathChart, { props: { pricePath: pricePath(), timeZone: buildTimeZone('UTC') } })
  await flushPromises()

  return wrapper
}

describe('TradePricePathChart', () => {
  it('蠟燭以一般數值交給繪圖函式庫', async () => {
    await mountChart()

    expect(chartLibrary.candlestickSeries.setData.mock.calls.at(-1)?.[0]).toEqual([
      { time: FIRST_MOMENT.getTime() / 1000, open: 97850, high: 98010, low: 97780, close: 97960 },
    ])
  })

  it('標出每一筆進場與出場', async () => {
    await mountChart()

    const drawnMarkers = chartLibrary.markers.setMarkers.mock.calls.at(-1)?.[0] as { position: string, shape: string, text: string }[]
    expect(drawnMarkers.map(marker => [marker.position, marker.shape, marker.text])).toEqual([
      ['belowBar', 'arrowUp', '進場 97,905'],
      ['aboveBar', 'arrowDown', '出場 100,420'],
    ])
  })

  it('圖下列出每一條價位線與它的價格', async () => {
    const wrapper = await mountChart()

    expect(wrapper.get('[data-testid="price-path-legend"]').text()).toContain('計畫止損 96,380')
    expect(wrapper.get('[data-testid="price-path-legend"]').text()).toContain('計畫止盈 100,785')
  })

  it('畫出計畫止損與止盈兩條線；換一份資料時換掉舊的線', async () => {
    const wrapper = await mountChart()

    await wrapper.setProps({ pricePath: pricePath([new TradePricePathLineDto(new Decimal('97110'), '最大不利', 'muted', '97,110')]) })

    expect(chartLibrary.candlestickSeries.createPriceLine.mock.calls.map(call => (call as [{ title: string }])[0].title))
      .toEqual(['計畫止損', '計畫止盈', '最大不利'])
    expect(chartLibrary.candlestickSeries.removePriceLine).toHaveBeenCalledTimes(2)
  })

  it('外觀換了就重新上色；離開時收掉圖表', async () => {
    const wrapper = await mountChart()
    chartLibrary.candlestickSeries.applyOptions.mockClear()

    document.documentElement.dataset.theme = 'light'
    await flushPromises()
    wrapper.unmount()

    expect(chartLibrary.candlestickSeries.applyOptions).toHaveBeenCalled()
    expect(chartLibrary.chart.remove).toHaveBeenCalled()
    delete document.documentElement.dataset.theme
  })

  it('時間標籤以當地讀數顯示', async () => {
    await mountChart()

    const options = chartLibrary.createChart.mock.calls[0] as unknown as [HTMLElement, { localization: { timeFormatter: (time: number) => string } }]
    expect(options[1].localization.timeFormatter(FIRST_MOMENT.getTime() / 1000)).toBe('2026-09-25 06:00')
  })

  it('圖表還沒建好時換資料或換外觀不會出錯，建好後照最新的畫', async () => {
    vi.clearAllMocks()
    const wrapper = mount(TradePricePathChart, { props: { pricePath: pricePath(), timeZone: buildTimeZone('UTC') } })

    await wrapper.setProps({ pricePath: pricePath([]) })
    document.documentElement.dataset.theme = 'light'
    await flushPromises()

    expect(chartLibrary.createChart).toHaveBeenCalled()
    expect(chartLibrary.candlestickSeries.setData).toHaveBeenCalled()
    delete document.documentElement.dataset.theme
  })

  it('函式庫載完前就離開了不建立圖表', async () => {
    vi.clearAllMocks()
    const wrapper = mount(TradePricePathChart, { props: { pricePath: pricePath(), timeZone: buildTimeZone('UTC') } })
    wrapper.unmount()
    await flushPromises()

    expect(chartLibrary.createChart).not.toHaveBeenCalled()
  })
})
