import Decimal from 'decimal.js'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import KCandleChart from '~/components/molecules/KCandleChart.vue'
import { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import { KCandleDto } from '~/domain/models/dto/k-candle-dto'
import { AggregationIntervalVo } from '~/domain/models/vo/aggregation-interval-vo'
import { KCandleTrendVo } from '~/domain/models/vo/k-candle-trend-vo'
import { buildTimeZone } from '../../fixtures/time-zone'

// 繪圖函式庫是最外層的邊界，比照 proxy 用 mocking 套件替身，不手刻假實作。
// 它需要真正的畫布，測試環境沒有；而我們要驗的也不是它畫得對不對，
// 是我們餵給它的東西對不對。
const chartLibrary = vi.hoisted(() => {
  const candlestickSeries = { setData: vi.fn(), kind: 'Candlestick' }
  const lineSeries = { setData: vi.fn(), kind: 'Line' }

  // 真的那個函式庫對**任何**區間變動都會回頭通知，包含 setData 與我們自己發出的
  // setVisibleRange，而且回報的區間會被對齊到真實的 bar 上。替身照做——
  // 一個什麼都不回呼的替身，正好看不見這個元件最容易出錯的那條路。
  let notifyRangeChange: ((range: { from: number, to: number } | null) => void) | null = null
  let lastReported: { from: number, to: number } | null = null
  // 真的那個函式庫回報的是**真實 bar 的時間**，也就是往內對齊到資料上；
  // 資料稀疏時，換一段要看的區間可能被對齊回完全相同的位置——那時它一聲都不會吭。
  let snapEveryRangeTo: { from: number, to: number } | null = null

  const timeScale = {
    subscribeVisibleTimeRangeChange: vi.fn((handler) => {
      notifyRangeChange = handler
    }),
    setVisibleRange: vi.fn((range: { from: number, to: number }) => {
      const snapped = snapEveryRangeTo ?? range
      if (lastReported !== null
        && lastReported.from === snapped.from && lastReported.to === snapped.to) {
        return
      }

      lastReported = { ...snapped }
      notifyRangeChange?.({ ...snapped })
    }),
  }
  const chartApi = {
    addSeries: vi.fn(),
    applyOptions: vi.fn(),
    removeSeries: vi.fn(),
    timeScale: () => timeScale,
    remove: vi.fn(),
  }

  return {
    candlestickSeries,
    lineSeries,
    timeScale,
    chartApi,
    createChart: vi.fn(() => chartApi),
    /** 讓替身像使用者拖出一段那樣回報一個區間。 */
    reportRange(range: { from: number, to: number }) {
      lastReported = range === null ? lastReported : { ...range }
      notifyRangeChange?.(range)
    },
    /** 讓替身把之後每一次要求的區間都對齊到同一個位置（模擬資料稀疏）。 */
    snapEveryRangeTo(range: { from: number, to: number } | null) {
      snapEveryRangeTo = range
    },
    reset() {
      lastReported = null
      snapEveryRangeTo = null
    },
  }
})

vi.mock('lightweight-charts', () => ({
  createChart: chartLibrary.createChart,
  CandlestickSeries: 'CandlestickSeries',
  LineSeries: 'LineSeries',
  // 真的那個函式庫用這組列舉告訴我們這一格刻度該說到多細。
  TickMarkType: { Year: 0, Month: 1, DayOfMonth: 2, Time: 3, TimeWithSeconds: 4 },
}))

const UP_TREND = new KCandleTrendVo('up', '上漲', 'success')
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

/** 最後一次真的交給函式庫的那幾根。 */
function drawnRows(): { time: number }[] {
  const [rows] = chartLibrary.candlestickSeries.setData.mock.calls.at(-1) as [{ time: number }[]]

  return rows
}

/** 最後一次交給函式庫的「時間怎麼寫」。 */
function latestTimeFormatting() {
  const options = chartLibrary.chartApi.applyOptions.mock.calls.at(-1)?.[0] as {
    localization: { timeFormatter: (time: number) => string }
    timeScale: { tickMarkFormatter: (time: number, tickMarkType: number) => string }
  }

  return {
    formatCrosshair: options.localization.timeFormatter,
    formatTickMark: options.timeScale.tickMarkFormatter,
  }
}

async function mountChart(chart: KCandleChartDto | null, drawing: 'candlestick' | 'line' = 'candlestick', timeZoneIdentifier = 'UTC') {
  const wrapper = mount(KCandleChart, {
    props: {
      chart,
      drawing,
      visibleStartTime: VISIBLE_START_TIME,
      visibleEndTime: VISIBLE_END_TIME,
      timeZone: buildTimeZone(timeZoneIdentifier),
    },
  })
  await flushPromises()

  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
  chartLibrary.reset()
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
    // 掛載時自己擺過一次位置，先讓那一次走完
    vi.advanceTimersByTime(300)
    wrapper.get('[data-testid="k-candle-chart"]').element.dispatchEvent(new Event('wheel'))

    chartLibrary.reportRange({ from: 1788343200, to: 1788350400 })
    chartLibrary.reportRange({ from: 1788346800, to: 1788350400 })

    // 手還在動的時候什麼都不說
    vi.advanceTimersByTime(100)
    expect(wrapper.emitted('rangeChange')).toBeUndefined()

    vi.advanceTimersByTime(300)

    expect(wrapper.emitted('rangeChange')).toEqual([[{
      startTime: new Date('2026-09-02T11:00:00.000Z'),
      endTime: new Date('2026-09-02T12:00:00.000Z'),
    }]])
  })

  it('圖自己換位置不算使用者拖曳，不送回去', async () => {
    vi.useFakeTimers()
    const wrapper = await mountChart(chartDto([]))

    // 掛載時畫了一次、也擺了一次位置，替身照真的那樣回頭通知了
    vi.advanceTimersByTime(300)

    expect(wrapper.emitted('rangeChange')).toBeUndefined()
  })

  it('外面換了要看的那一段時，就算資料沒換也把位置移過去', async () => {
    const wrapper = await mountChart(chartDto([]))
    chartLibrary.timeScale.setVisibleRange.mockClear()

    await wrapper.setProps({
      visibleStartTime: new Date('2026-09-02T11:00:00.000Z'),
      visibleEndTime: new Date('2026-09-02T12:00:00.000Z'),
    })

    expect(chartLibrary.timeScale.setVisibleRange).toHaveBeenCalledWith({
      from: 1788346800,
      to: 1788350400,
    })
    expect(chartLibrary.candlestickSeries.setData).toHaveBeenCalledTimes(1)
  })

  it('自己移動位置之後，使用者真的拖曳仍然送得回去', async () => {
    vi.useFakeTimers()
    const wrapper = await mountChart(chartDto([]))
    vi.advanceTimersByTime(300)

    wrapper.get('[data-testid="k-candle-chart"]').element.dispatchEvent(new Event('pointerdown'))
    chartLibrary.reportRange({ from: 1788343200, to: 1788350400 })
    vi.advanceTimersByTime(300)

    expect(wrapper.emitted('rangeChange')).toHaveLength(1)
  })

  it('函式庫還沒載完使用者就離開時，不建立圖表', async () => {
    const wrapper = mount(KCandleChart, {
      props: {
        chart: chartDto([]),
        drawing: 'candlestick',
        visibleStartTime: VISIBLE_START_TIME,
        visibleEndTime: VISIBLE_END_TIME,
        timeZone: buildTimeZone(),
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
        timeZone: buildTimeZone(),
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
    vi.advanceTimersByTime(300)
    wrapper.get('[data-testid="k-candle-chart"]').element.dispatchEvent(new Event('wheel'))

    chartLibrary.reportRange({ from: 1788343200, to: 1788350400 })
    wrapper.unmount()
    vi.advanceTimersByTime(300)

    expect(wrapper.emitted('rangeChange')).toBeUndefined()
  })

  it('自己移動位置卻沒有造成任何變化時，使用者的下一次拖曳仍然送得回去', async () => {
    vi.useFakeTimers()
    const wrapper = await mountChart(chartDto([]))
    vi.advanceTimersByTime(300)

    // 換了要看的一段，但被對齊回原本的位置——函式庫因此完全沒有通知
    chartLibrary.snapEveryRangeTo({ from: 1788343200, to: 1788350400 })
    await wrapper.setProps({
      visibleStartTime: new Date('2026-09-02T11:00:00.000Z'),
      visibleEndTime: new Date('2026-09-02T12:00:00.000Z'),
    })
    vi.advanceTimersByTime(300)
    expect(wrapper.emitted('rangeChange')).toBeUndefined()

    chartLibrary.snapEveryRangeTo(null)
    wrapper.get('[data-testid="k-candle-chart"]').element.dispatchEvent(new Event('wheel'))
    chartLibrary.reportRange({ from: 1788346800, to: 1788350400 })
    vi.advanceTimersByTime(300)

    expect(wrapper.emitted('rangeChange')).toHaveLength(1)
  })

  it('繪圖函式庫說不出正在看哪一段時，什麼都不送出', async () => {
    vi.useFakeTimers()
    const wrapper = await mountChart(chartDto([]))
    vi.advanceTimersByTime(300)
    wrapper.get('[data-testid="k-candle-chart"]').element.dispatchEvent(new Event('wheel'))

    chartLibrary.reportRange(null as unknown as { from: number, to: number })
    vi.advanceTimersByTime(300)

    expect(wrapper.emitted('rangeChange')).toBeUndefined()
  })

  it.each([
    { identifier: 'UTC', expectedCrosshair: '2026-09-02 10:00', expectedTime: '10:00' },
    { identifier: 'Asia/Taipei', expectedCrosshair: '2026-09-02 18:00', expectedTime: '18:00' },
  ])('時間軸與十字準星照選定的 $identifier 說時間', async ({ identifier, expectedCrosshair, expectedTime }) => {
    await mountChart(
      chartDto([kCandleDto('2026-09-02T10:00:00.000Z', '110', UP_TREND)]), 'candlestick', identifier)

    // 用的是真正交給函式庫的那個時間值——標籤與分格看的是同一份東西。
    const drawnTime = drawnRows()[0].time
    const { formatCrosshair, formatTickMark } = latestTimeFormatting()

    expect(formatCrosshair(drawnTime)).toBe(expectedCrosshair)
    expect(formatTickMark(drawnTime, 3)).toBe(expectedTime)
  })

  it.each([
    { identifier: 'UTC', expectedDrawnTime: '2026-09-02T10:00:00.000Z' },
    { identifier: 'Asia/Taipei', expectedDrawnTime: '2026-09-02T18:00:00.000Z' },
    { identifier: 'America/New_York', expectedDrawnTime: '2026-09-02T06:00:00.000Z' },
  ])('交給函式庫的是 $identifier 的當地時鐘讀數，不是那個瞬間', async ({ identifier, expectedDrawnTime }) => {
    await mountChart(
      chartDto([kCandleDto('2026-09-02T10:00:00.000Z', '110', UP_TREND)]), 'candlestick', identifier)

    expect(new Date(drawnRows()[0].time * 1000).toISOString()).toBe(expectedDrawnTime)
  })

  it('分格因此落在當地的元旦上，而不是世界標準時間的那一個', async () => {
    // 函式庫用它收到的時間的**世界標準時間**年月日決定哪一格標年（weightByTime）。
    // 紐約的跨年在世界標準時間是一月一日的清晨五點——餵瞬間進去，
    // 十二月三十一日晚上七點那一根就會被當成新的一年並標上前一年的年份。
    await mountChart(chartDto([
      kCandleDto('2027-01-01T00:00:00.000Z', '110', UP_TREND),
      kCandleDto('2027-01-01T05:00:00.000Z', '110', UP_TREND),
    ]), 'candlestick', 'America/New_York')

    const drawnYears = drawnRows().map(
      row => new Date(row.time * 1000).toISOString().slice(0, 4))

    expect(drawnYears).toEqual(['2026', '2027'])
  })

  it.each([
    { description: '年', tickMarkType: 0, expected: '2026' },
    { description: '月', tickMarkType: 1, expected: '2026-09' },
    { description: '日', tickMarkType: 2, expected: '09-02' },
    { description: '時分', tickMarkType: 3, expected: '10:00' },
  ])('$description 這一格刻度只說到該說的粗細', async ({ tickMarkType, expected }) => {
    await mountChart(chartDto([]))

    expect(latestTimeFormatting().formatTickMark(VISIBLE_START_TIME.getTime() / 1000, tickMarkType))
      .toBe(expected)
  })

  it('換時區時整批讀數與標籤一起重講，看的還是同一根', async () => {
    const wrapper = await mountChart(
      chartDto([kCandleDto('2026-09-02T10:00:00.000Z', '110', UP_TREND)]))
    expect(new Date(drawnRows()[0].time * 1000).toISOString()).toBe('2026-09-02T10:00:00.000Z')

    await wrapper.setProps({ timeZone: buildTimeZone('Asia/Taipei') })

    const drawnTime = drawnRows()[0].time
    expect(new Date(drawnTime * 1000).toISOString()).toBe('2026-09-02T18:00:00.000Z')
    expect(latestTimeFormatting().formatCrosshair(drawnTime)).toBe('2026-09-02 18:00')
  })

  it('使用者在別的時區拉出一段時，送回去的是那一段真正的瞬間', async () => {
    vi.useFakeTimers()
    const wrapper = await mountChart(
      chartDto([kCandleDto('2026-09-02T10:00:00.000Z', '110', UP_TREND)]), 'candlestick', 'Asia/Taipei')
    // 掛載時自己擺過一次位置，先讓那一次走完
    vi.advanceTimersByTime(300)
    wrapper.get('[data-testid="k-candle-chart"]').element.dispatchEvent(new Event('pointerdown'))

    // 函式庫回報的是它手上那份讀數（台北的當地時鐘），不是瞬間。
    chartLibrary.reportRange({
      from: new Date('2026-09-02T18:00:00.000Z').getTime() / 1000,
      to: new Date('2026-09-02T20:00:00.000Z').getTime() / 1000,
    })
    vi.advanceTimersByTime(300)

    expect(wrapper.emitted('rangeChange')?.at(-1)).toEqual([{
      startTime: new Date('2026-09-02T10:00:00.000Z'),
      endTime: new Date('2026-09-02T12:00:00.000Z'),
    }])
  })
})
