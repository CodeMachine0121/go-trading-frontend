import Decimal from 'decimal.js'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import KCandleChart from '~/components/molecules/KCandleChart.vue'
import { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import { KCandleDto } from '~/domain/models/dto/k-candle-dto'
import { AggregationIntervalVo } from '~/domain/models/vo/aggregation-interval-vo'
import { KCandleTrendVo } from '~/domain/models/vo/k-candle-trend-vo'

// 繪圖函式庫是最外層的邊界，比照 proxy 用 mocking 套件替身，不手刻假實作。
// 它需要真正的畫布，測試環境沒有；而我們要驗的也不是它畫得對不對，
// 是我們餵給它的東西對不對。
const chartLibrary = vi.hoisted(() => {
  const candlestickSeries = { setData: vi.fn(), kind: 'Candlestick' }
  const lineSeries = { setData: vi.fn(), kind: 'Line' }
  const timeScale = {
    subscribeVisibleTimeRangeChange: vi.fn(),
    setVisibleRange: vi.fn(),
  }
  const chartApi = {
    addSeries: vi.fn(),
    removeSeries: vi.fn(),
    timeScale: () => timeScale,
    remove: vi.fn(),
  }

  return { candlestickSeries, lineSeries, timeScale, chartApi, createChart: vi.fn(() => chartApi) }
})

vi.mock('lightweight-charts', () => ({
  createChart: chartLibrary.createChart,
  CandlestickSeries: 'CandlestickSeries',
  LineSeries: 'LineSeries',
}))

const VISIBLE_START_TIME = new Date('2026-09-02T10:00:00.000Z')
const VISIBLE_END_TIME = new Date('2026-09-02T12:00:00.000Z')

function kCandleDto(openTime: string, closePrice: string, trend: KCandleTrendVo): KCandleDto {
  return new KCandleDto(
    'BTCUSDT', new Date(openTime),
    new Decimal('100'), new Decimal('130'), new Decimal('90'), new Decimal(closePrice),
    new Decimal('1'), new Decimal('1'), new Decimal('1'), new Decimal('1'),
    trend,
  )
}

function chartDto(kCandles: KCandleDto[]): KCandleChartDto {
  return new KCandleChartDto(
    'BTCUSDT',
    new AggregationIntervalVo('5m', '五分鐘', 5),
    VISIBLE_START_TIME,
    VISIBLE_END_TIME,
    kCandles,
  )
}

async function mountChart(chart: KCandleChartDto | null, drawing: 'candlestick' | 'line' = 'candlestick') {
  const wrapper = mount(KCandleChart, {
    props: {
      chart,
      drawing,
      visibleStartTime: VISIBLE_START_TIME,
      visibleEndTime: VISIBLE_END_TIME,
    },
  })
  await flushPromises()

  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
  chartLibrary.chartApi.addSeries.mockImplementation(
    (definition: string) => definition === 'LineSeries' ? chartLibrary.lineSeries : chartLibrary.candlestickSeries)
  // 顏色從 token 展開的 CSS 變數讀；測試環境沒有樣式表，因此把讀到的值換成 token 名稱本身，
  // 才驗得出「這一根用的是哪一個 token」。
  vi.stubGlobal('getComputedStyle', () => ({
    getPropertyValue: (tokenName: string) => tokenName,
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('KCandleChart', () => {
  it('把拿到的每一根都畫出去，開高低收原樣帶過去', async () => {
    await mountChart(chartDto([
      kCandleDto('2026-09-02T10:00:00.000Z', '110', new KCandleTrendVo('up', '上漲', 'success')),
      kCandleDto('2026-09-02T10:05:00.000Z', '90', new KCandleTrendVo('down', '下跌', 'danger')),
    ]))

    const rows = chartLibrary.candlestickSeries.setData.mock.calls.at(-1)?.[0]
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ time: 1788343200, open: 100, high: 130, low: 90, close: 110 })
    expect(rows[1]).toMatchObject({ time: 1788343500, close: 90 })
  })

  it('每一根用領域算好的漲跌語氣上色', async () => {
    await mountChart(chartDto([
      kCandleDto('2026-09-02T10:00:00.000Z', '110', new KCandleTrendVo('up', '上漲', 'success')),
      kCandleDto('2026-09-02T10:05:00.000Z', '90', new KCandleTrendVo('down', '下跌', 'danger')),
      kCandleDto('2026-09-02T10:10:00.000Z', '100', new KCandleTrendVo('flat', '持平', 'neutral')),
    ]))

    const rows = chartLibrary.candlestickSeries.setData.mock.calls.at(-1)?.[0]
    expect(rows.map((row: { color: string }) => row.color))
      .toEqual(['--color-success', '--color-danger', '--color-text-muted'])
  })

  it('圖上不擺繪圖函式庫的商標', async () => {
    await mountChart(chartDto([]))

    expect(chartLibrary.createChart).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        layout: expect.objectContaining({ attributionLogo: false }),
      }),
    )
  })

  it('沒有資料時畫的是空的一批', async () => {
    await mountChart(null)

    expect(chartLibrary.candlestickSeries.setData).toHaveBeenCalledWith([])
  })

  it('換上新的一批之後，看的位置回到使用者原本在看的那一段', async () => {
    await mountChart(chartDto([kCandleDto('2026-09-02T10:00:00.000Z', '110', new KCandleTrendVo('up', '上漲', 'success'))]))

    expect(chartLibrary.timeScale.setVisibleRange).toHaveBeenLastCalledWith({
      from: 1788343200,
      to: 1788350400,
    })
  })

  it('換成曲線畫法時，改以收盤價連成一條線', async () => {
    const wrapper = await mountChart(chartDto([
      kCandleDto('2026-09-02T10:00:00.000Z', '110', new KCandleTrendVo('up', '上漲', 'success')),
    ]))

    await wrapper.setProps({ drawing: 'line' })

    expect(chartLibrary.chartApi.addSeries).toHaveBeenLastCalledWith('LineSeries', expect.anything())
    expect(chartLibrary.lineSeries.setData.mock.calls.at(-1)?.[0])
      .toEqual([{ time: 1788343200, value: 110 }])
  })

  it('使用者停手之後才送出一次新的顯示區間', async () => {
    vi.useFakeTimers()
    const wrapper = await mountChart(chartDto([]))
    const notifyRangeChange = chartLibrary.timeScale.subscribeVisibleTimeRangeChange.mock.calls[0]?.[0]

    notifyRangeChange({ from: 1788343200, to: 1788350400 })
    notifyRangeChange({ from: 1788346800, to: 1788350400 })

    // 手還在動的時候什麼都不說
    vi.advanceTimersByTime(100)
    expect(wrapper.emitted('rangeChange')).toBeUndefined()

    vi.advanceTimersByTime(300)

    expect(wrapper.emitted('rangeChange')).toEqual([[{
      startTime: new Date('2026-09-02T11:00:00.000Z'),
      endTime: new Date('2026-09-02T12:00:00.000Z'),
    }]])
  })

  it('函式庫還沒載完使用者就離開時，不建立圖表', async () => {
    const wrapper = mount(KCandleChart, {
      props: {
        chart: chartDto([]),
        drawing: 'candlestick',
        visibleStartTime: VISIBLE_START_TIME,
        visibleEndTime: VISIBLE_END_TIME,
      },
    })
    wrapper.unmount()
    await flushPromises()

    expect(chartLibrary.createChart).not.toHaveBeenCalled()
  })

  it('函式庫還沒載完就換了一批資料時，什麼也不畫', async () => {
    const wrapper = mount(KCandleChart, {
      props: {
        chart: null,
        drawing: 'candlestick',
        visibleStartTime: VISIBLE_START_TIME,
        visibleEndTime: VISIBLE_END_TIME,
      },
    })

    await wrapper.setProps({ chart: chartDto([]) })

    expect(chartLibrary.candlestickSeries.setData).not.toHaveBeenCalled()
  })

  it('離開畫面時把圖收掉', async () => {
    const wrapper = await mountChart(chartDto([]))

    wrapper.unmount()

    expect(chartLibrary.chartApi.remove).toHaveBeenCalled()
  })

  it('手還在動就離開畫面時，不會再送出那一次', async () => {
    vi.useFakeTimers()
    const wrapper = await mountChart(chartDto([]))
    const notifyRangeChange = chartLibrary.timeScale.subscribeVisibleTimeRangeChange.mock.calls[0]?.[0]

    notifyRangeChange({ from: 1788343200, to: 1788350400 })
    wrapper.unmount()
    vi.advanceTimersByTime(300)

    expect(wrapper.emitted('rangeChange')).toBeUndefined()
  })

  it('繪圖函式庫說不出正在看哪一段時，什麼都不送出', async () => {
    vi.useFakeTimers()
    const wrapper = await mountChart(chartDto([]))
    const notifyRangeChange = chartLibrary.timeScale.subscribeVisibleTimeRangeChange.mock.calls[0]?.[0]

    notifyRangeChange(null)
    vi.advanceTimersByTime(300)

    expect(wrapper.emitted('rangeChange')).toBeUndefined()
  })
})
