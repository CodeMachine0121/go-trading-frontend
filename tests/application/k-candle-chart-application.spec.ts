import Decimal from 'decimal.js'
import { seriesOf } from '../fixtures/k-candle-series'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { KCandleChartApplication } from '~/application/k-candle-chart-application'
import { KCandleChartService } from '~/domain/service/k-candle-chart-service'
import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import { KCandle } from '~/domain/models/entities/k-candle'
import { KCandleChartViewportDto } from '~/domain/models/dto/k-candle-chart-viewport-dto'
import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import { KCandleQueryValidationError } from '~/domain/errors/k-candle-query-validation-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'

// 只 mock 最外層的 proxy 介面；application、domain service 與 domain model 都是真的。
const CURRENT_TIME = new Date('2026-09-02T12:00:00.000Z')
const MILLISECONDS_PER_MINUTE = 60 * 1000

function buildKCandle(openTime: string, open: string, closePrice: string): KCandle {
  return new KCandle(
    'BTCUSDT', new Date(openTime),
    new Decimal(open), new Decimal('999'), new Decimal('1'), new Decimal(closePrice),
    new Decimal('1'), new Decimal('1'), new Decimal('1'), new Decimal('1'),
  )
}

function buildProxy(overrides: Partial<IKCandleProxy> = {}): IKCandleProxy {
  return {
    findKCandlesInRange: vi.fn(),
    findKCandleSeries: vi.fn().mockResolvedValue(seriesOf([])),
    saveKCandle: vi.fn(),
    updateKCandle: vi.fn(),
    deleteKCandle: vi.fn(),
    catchUpSymbol: vi.fn().mockResolvedValue(0),
    ...overrides,
  }
}

function buildApplication(kCandleProxy: IKCandleProxy): KCandleChartApplication {
  return new KCandleChartApplication(new KCandleChartService(kCandleProxy))
}

function viewportSpanning(
  visibleMinutes: number, loadedChart: KCandleChartDto | null = null, symbol = 'BTCUSDT',
): KCandleChartViewportDto {
  return new KCandleChartViewportDto(
    symbol,
    new Date(CURRENT_TIME.getTime() - visibleMinutes * MILLISECONDS_PER_MINUTE),
    CURRENT_TIME,
    loadedChart,
  )
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(CURRENT_TIME)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('KCandleChartApplication', () => {
  describe('loadKCandleChart', () => {
    it('第一次進畫面時去取，只帶那一段與兩側預取', async () => {
      const findKCandleSeries = vi.fn().mockResolvedValue(seriesOf([]))
      const kCandleChartApplication = buildApplication(buildProxy({ findKCandleSeries }))

      await kCandleChartApplication.loadKCandleChart(viewportSpanning(24 * 60))

      // 問的是一整天，一天都沒被收；前後再各多取半天
      const loadPlan = findKCandleSeries.mock.calls[0]?.[0]
      expect(loadPlan.symbol).toBe('BTCUSDT')
      expect(loadPlan.fetchStartTime.toISOString()).toBe('2026-09-01T00:00:00.000Z')
      expect(loadPlan.fetchEndTime.toISOString()).toBe('2026-09-03T00:00:00.000Z')
      // 交出去的條件裡沒有彙總刻度——那不是畫面決定的事
      expect('interval' in loadPlan).toBe(false)
    })

    it('把取回的每一根都算好漲跌交給畫面', async () => {
      const kCandleChartApplication = buildApplication(buildProxy({
        findKCandleSeries: vi.fn().mockResolvedValue(seriesOf([
          buildKCandle('2026-09-02T10:00:00.000Z', '100', '110'),
          buildKCandle('2026-09-02T10:05:00.000Z', '100', '90'),
        ])),
      }))

      const chartView = await kCandleChartApplication.loadKCandleChart(viewportSpanning(24 * 60))

      expect(chartView.reloadedChart?.count).toBe(2)
      expect(chartView.reloadedChart?.kCandles.map(kCandle => kCandle.trend.tone))
        .toEqual(['success', 'danger'])
      expect(chartView.reloadedChart?.interval.label).toBe('一分鐘')
    })

    it('取回一根都沒有時是空的一批，不是錯誤', async () => {
      const kCandleChartApplication = buildApplication(buildProxy())

      const chartView = await kCandleChartApplication.loadKCandleChart(viewportSpanning(24 * 60))

      expect(chartView.reloadedChart?.isEmpty).toBe(true)
    })

    it('顯示區間仍落在手上那批之內時不再去取，並回覆「沒事」', async () => {
      const findKCandleSeries = vi.fn().mockResolvedValue(seriesOf([]))
      const kCandleChartApplication = buildApplication(buildProxy({ findKCandleSeries }))
      const loaded = await kCandleChartApplication.loadKCandleChart(viewportSpanning(24 * 60))

      // 小幅拉寬一成：仍落在手上這批之內，長度變化也在門檻之內
      const nextView = await kCandleChartApplication.loadKCandleChart(
        viewportSpanning(26.4 * 60, loaded.reloadedChart))

      expect(nextView.reloadedChart).toBeNull()
      expect(findKCandleSeries).toHaveBeenCalledTimes(1)
      // 不必換資料，但仍然說得出該看哪一段——按快捷區間才不會像壞掉
      expect(nextView.visibleEndTime.toISOString()).toBe('2026-09-02T12:00:00.000Z')
      expect(nextView.visibleStartTime.toISOString()).toBe('2026-09-01T09:36:00.000Z')
    })

    it('拉遠就重新取——長度變了，系統挑的刻度可能跟著變', async () => {
      const findKCandleSeries = vi.fn().mockResolvedValue(seriesOf([]))
      const kCandleChartApplication = buildApplication(buildProxy({ findKCandleSeries }))
      const loaded = await kCandleChartApplication.loadKCandleChart(viewportSpanning(24 * 60))

      await kCandleChartApplication.loadKCandleChart(
        viewportSpanning(5 * 24 * 60, loaded.reloadedChart))

      // 畫面算不出「刻度該不該變」，只算得出「我看的長度變了」——變了就重新問一次
      expect(findKCandleSeries).toHaveBeenCalledTimes(2)
      expect(findKCandleSeries.mock.calls[1]?.[0].fetchStartTime.toISOString())
        .toBe('2026-08-26T00:00:00.000Z')
    })

    it('換一個交易標的就重新取', async () => {
      const findKCandleSeries = vi.fn().mockResolvedValue(seriesOf([]))
      const kCandleChartApplication = buildApplication(buildProxy({ findKCandleSeries }))
      const loaded = await kCandleChartApplication.loadKCandleChart(viewportSpanning(24 * 60))

      await kCandleChartApplication.loadKCandleChart(
        viewportSpanning(24 * 60, loaded.reloadedChart, 'ETHUSDT'))

      expect(findKCandleSeries).toHaveBeenCalledTimes(2)
      expect(findKCandleSeries.mock.calls[1]?.[0].symbol).toBe('ETHUSDT')
    })

    it('未指定交易標的時不去取，並指名是交易標的這一欄', async () => {
      const findKCandleSeries = vi.fn()
      const kCandleChartApplication = buildApplication(buildProxy({ findKCandleSeries }))

      await expect(kCandleChartApplication.loadKCandleChart(viewportSpanning(24 * 60, null, ' ')))
        .rejects.toThrowError(new KCandleQueryValidationError('symbol', '請指定交易標的'))
      expect(findKCandleSeries).not.toHaveBeenCalled()
    })

    it('拉得比五百天還遠時，回覆的是被收回之後該看的那一段', async () => {
      const kCandleChartApplication = buildApplication(buildProxy())

      const chartView = await kCandleChartApplication.loadKCandleChart(
        viewportSpanning(501 * 24 * 60))

      // 問的是五百零一天，該看的被收回五百天，結束的那一端不變。
      // 上限是五百而不是一千，因為問出去的那一段是它的兩倍
      expect(chartView.visibleEndTime.toISOString()).toBe('2026-09-02T12:00:00.000Z')
      expect(chartView.visibleStartTime.toISOString()).toBe('2025-04-20T12:00:00.000Z')
    })

    it('後端拒絕時如實往上拋，讓畫面轉達原因', async () => {
      const kCandleChartApplication = buildApplication(buildProxy({
        findKCandleSeries: vi.fn().mockRejectedValue(
          new BackendRequestRejectedError('時間區間過大，請縮小區間或改用更長的彙總刻度')),
      }))

      await expect(kCandleChartApplication.loadKCandleChart(viewportSpanning(24 * 60)))
        .rejects.toThrow('時間區間過大，請縮小區間或改用更長的彙總刻度')
    })
  })

  describe('listRangePresets', () => {
    it('列出一鍵可切換的幾個長度，由短到長', () => {
      const presets = buildApplication(buildProxy()).listRangePresets()

      expect(presets.map(preset => preset.label))
        .toEqual([
          '一小時', '五小時', '十小時',
          '一天', '五天', '一個月', '三個月', '六個月', '一年',
        ])
    })

    it('選一個長度就等於「以目前時間為結束、往前這麼長」', () => {
      const presets = buildApplication(buildProxy()).listRangePresets()
      const oneMonth = presets[5]

      const viewport = oneMonth?.toViewportDto('BTCUSDT', null)

      expect(viewport?.visibleEndTime.toISOString()).toBe('2026-09-02T12:00:00.000Z')
      expect(viewport?.visibleStartTime.toISOString()).toBe('2026-08-03T12:00:00.000Z')
      expect(viewport?.symbol).toBe('BTCUSDT')
      expect(viewport?.loadedChart).toBeNull()
    })

    it('不足一天的那幾個一樣是「往前這麼長」，不會被當成整天', () => {
      const presets = buildApplication(buildProxy()).listRangePresets()

      const viewport = presets[1]?.toViewportDto('BTCUSDT', null)

      expect(viewport?.visibleEndTime.toISOString()).toBe('2026-09-02T12:00:00.000Z')
      expect(viewport?.visibleStartTime.toISOString()).toBe('2026-09-02T07:00:00.000Z')
    })
  })

  describe('defaultRangePreset', () => {
    it('一進畫面看的是一天，不是那一排最短的一段', () => {
      const kCandleChartApplication = buildApplication(buildProxy())

      expect(kCandleChartApplication.defaultRangePreset().label).toBe('一天')
      expect(kCandleChartApplication.listRangePresets()[0]?.label).toBe('一小時')
    })
  })
})
