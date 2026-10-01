import Decimal from 'decimal.js'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import TradePricePathChart from '~/components/molecules/TradePricePathChart.vue'
import { TradePricePathDto } from '~/domain/models/dto/trade-price-path-dto'
import { TradePricePathCandleDto } from '~/domain/models/dto/trade-price-path-candle-dto'
import { TradePricePathMarkerDto } from '~/domain/models/dto/trade-price-path-marker-dto'
import { TradePricePathLineDto } from '~/domain/models/dto/trade-price-path-line-dto'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { buildTimeZone } from '../../fixtures/time-zone'

const chartLibrary = vi.hoisted(() => {
  const candlestickSeries = {
    setData: vi.fn(),
    applyOptions: vi.fn(),
    createPriceLine: vi.fn((options: { title: string }) => ({ title: options.title })),
    removePriceLine: vi.fn(),
  }
  const markers = { setMarkers: vi.fn() }
  const timeScale = { fitContent: vi.fn() }
  const chart = {
    addSeries: vi.fn(() => candlestickSeries),
    applyOptions: vi.fn(),
    timeScale: vi.fn(() => timeScale),
    remove: vi.fn(),
  }

  return {
    candlestickSeries,
    markers,
    timeScale,
    chart,
    createChart: vi.fn(() => chart),
    createSeriesMarkers: vi.fn(() => markers),
  }
})

vi.mock('lightweight-charts', () => ({
  createChart: chartLibrary.createChart,
  createSeriesMarkers: chartLibrary.createSeriesMarkers,
  CandlestickSeries: 'CandlestickSeries',
  TickMarkType: { Year: 0, Month: 1, DayOfMonth: 2, Time: 3, TimeWithSeconds: 4 },
}))

const FIRST_MOMENT = new Date('2026-09-25T06:00:00Z')

function pricePath(lines = [
  new TradePricePathLineDto('plannedStopLossPrice', new Decimal('96380'), new LocalizedTextVo('計畫止損', 'Planned stop loss'), 'danger', '96,380'),
  new TradePricePathLineDto('plannedTakeProfitPrice', new Decimal('100785'), new LocalizedTextVo('計畫止盈', 'Planned take profit'), 'success', '100,785'),
]) {
  return new TradePricePathDto(
    [new TradePricePathCandleDto(FIRST_MOMENT, new Decimal('97850'), new Decimal('98010'), new Decimal('97780'), new Decimal('97960'))],
    [
      new TradePricePathMarkerDto(FIRST_MOMENT, 'entry', new LocalizedTextVo('進場 97,905', 'Entry 97,905')),
      new TradePricePathMarkerDto(new Date('2026-09-26T08:40:00Z'), 'exit', new LocalizedTextVo('出場 100,420', 'Exit 100,420')),
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

  it('換成英文時圖例、價位線與標記都換成英文', async () => {
    const wrapper = await mountChart()

    wrapper.vm.$i18n.locale = 'en'
    await nextTick()

    const drawnMarkers = chartLibrary.markers.setMarkers.mock.calls.at(-1)?.[0] as { text: string }[]
    expect(wrapper.get('[data-testid="price-path-legend"]').text()).toContain('Planned stop loss 96,380')
    expect(drawnMarkers.map(marker => marker.text)).toEqual(['Entry 97,905', 'Exit 100,420'])
    expect(chartLibrary.candlestickSeries.createPriceLine.mock.calls.slice(-2).map(call => (call as [{ title: string }])[0].title))
      .toEqual(['Planned stop loss', 'Planned take profit'])
  })

  it('換語言時不重畫蠟燭、不把使用者拉好的縮放還原', async () => {
    const wrapper = await mountChart()
    chartLibrary.candlestickSeries.setData.mockClear()
    chartLibrary.timeScale.fitContent.mockClear()

    wrapper.vm.$i18n.locale = 'en'
    await nextTick()

    expect(chartLibrary.candlestickSeries.setData).not.toHaveBeenCalled()
    expect(chartLibrary.timeScale.fitContent).not.toHaveBeenCalled()
  })

  it.each([
    { name: '標月的那一格', tickMarkType: 1, expected: '2026-09' },
    { name: '標日的那一格', tickMarkType: 2, expected: '09-25' },
    { name: '標時分的那一格', tickMarkType: 3, expected: '06:00' },
  ])('時間軸上$name寫成不分語言的數字', async ({ tickMarkType, expected }) => {
    await mountChart()
    const options = chartLibrary.createChart.mock.calls[0] as unknown as [HTMLElement, { timeScale: { tickMarkFormatter: (time: number, tickMarkType: number) => string } }]

    expect(options[1].timeScale.tickMarkFormatter(FIRST_MOMENT.getTime() / 1000, tickMarkType)).toBe(expected)
  })

  it('畫出計畫止損與止盈兩條線；換一份資料時換掉舊的線', async () => {
    const wrapper = await mountChart()

    await wrapper.setProps({ pricePath: pricePath([new TradePricePathLineDto('maximumAdversePrice', new Decimal('97110'), new LocalizedTextVo('最大不利', 'Max adverse'), 'muted', '97,110')]) })

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

  it('換外觀只重新上色，不重畫 K 線、不把使用者縮放過的範圍拉回整段', async () => {
    const wrapper = await mountChart()
    chartLibrary.candlestickSeries.setData.mockClear()
    chartLibrary.timeScale.fitContent.mockClear()

    document.documentElement.dataset.theme = 'light'
    await flushPromises()
    wrapper.unmount()

    expect(chartLibrary.candlestickSeries.setData).not.toHaveBeenCalled()
    expect(chartLibrary.timeScale.fitContent).not.toHaveBeenCalled()
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
