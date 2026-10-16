import Decimal from 'decimal.js'
import { seriesOf } from '../fixtures/k-candle-series'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { KCandleSpec, kCandleChartOf } from '../fixtures/k-candle-chart'
import { KCandleChartApplication } from '~/application/k-candle-chart-application'
import { KCandleChartService } from '~/domain/service/k-candle-chart-service'
import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import { KCandle } from '~/domain/models/entities/k-candle'
import { KCandleChartViewportDto } from '~/domain/models/dto/k-candle-chart-viewport-dto'
import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import { KCandleQueryValidationError } from '~/domain/errors/k-candle-query-validation-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import type { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'
import {
  DEFAULT_AGGREGATION_INTERVAL_CHOICE, aggregationIntervalChoiceOf,
} from '../fixtures/aggregation-interval-choice'
import { buildKCandleContractProxy } from '../fixtures/contract-proxies'
import { KCandleContract } from '~/domain/models/entities/k-candle-contract'
import { ContractPriceLineVo } from '~/domain/models/vo/contract-price-line-vo'
import { KCandleContractSeriesVo } from '~/domain/models/vo/k-candle-contract-series-vo'
import { aggregationIntervalOf } from '~/domain/models/vo/aggregation-interval-vo'
import type { IKCandleContractProxy } from '~/domain/interface/i-k-candle-contract-proxy'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

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
  return new KCandleChartApplication(new KCandleChartService(kCandleProxy, buildKCandleContractProxy()))
}

function viewportSpanning(
  visibleMinutes: number, loadedChart: KCandleChartDto | null = null, symbol = 'BTCUSDT',
  aggregationIntervalChoice: AggregationIntervalChoiceDto
    = DEFAULT_AGGREGATION_INTERVAL_CHOICE,
): KCandleChartViewportDto {
  return new KCandleChartViewportDto(
    symbol,
    new Date(CURRENT_TIME.getTime() - visibleMinutes * MILLISECONDS_PER_MINUTE),
    CURRENT_TIME,
    loadedChart,
    aggregationIntervalChoice,
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
      // 沒特別挑時是一進畫面的那一種：一小時
      expect(loadPlan.aggregationIntervalChoice.declaredInterval).toBe('1h')
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
      expect(chartView.reloadedChart?.interval.label.in('zh-TW')).toBe('一分鐘')
    })

    it('取回一根都沒有時是空的一批，不是錯誤', async () => {
      const kCandleChartApplication = buildApplication(buildProxy())

      const chartView = await kCandleChartApplication.loadKCandleChart(viewportSpanning(24 * 60))

      expect(chartView.reloadedChart?.isEmpty).toBe(true)
    })

    it('回來的答案說得出圖上要從第幾根畫到第幾根，右邊還留著一段空白', async () => {
      // 三根都在畫面上（序位 0 到 2），而且看得到最新那一根——
      // 右邊因此多留三根的一成。最新那一根整根看得見，不會被右緣切掉半根。
      const kCandleChartApplication = buildApplication(buildProxy({
        findKCandleSeries: vi.fn().mockResolvedValue(seriesOf([
          buildKCandle('2026-09-02T10:00:00.000Z', '100', '110'),
          buildKCandle('2026-09-02T11:00:00.000Z', '100', '120'),
          buildKCandle('2026-09-02T12:00:00.000Z', '100', '130'),
        ])),
      }))

      const chartView = await kCandleChartApplication.loadKCandleChart(viewportSpanning(24 * 60))

      expect(chartView.drawnRange).toEqual({ from: 0, to: 2.3 })
    })

    it('取回一根都沒有時，說不出要從第幾根畫到第幾根', async () => {
      const kCandleChartApplication = buildApplication(buildProxy())

      const chartView = await kCandleChartApplication.loadKCandleChart(viewportSpanning(24 * 60))

      expect(chartView.drawnRange).toBeNull()
    })

    it('不必重新取時，照手上那批算出要畫的那一段——按快捷區間才不會像壞掉', async () => {
      const findKCandleSeries = vi.fn().mockResolvedValue(seriesOf([
        buildKCandle('2026-09-02T10:00:00.000Z', '100', '110'),
        buildKCandle('2026-09-02T11:00:00.000Z', '100', '120'),
        buildKCandle('2026-09-02T12:00:00.000Z', '100', '130'),
      ]))
      const kCandleChartApplication = buildApplication(buildProxy({ findKCandleSeries }))
      const loaded = await kCandleChartApplication.loadKCandleChart(viewportSpanning(24 * 60))

      // 拉近到半天：仍整個落在手上這批之內，離最早那一根還遠
      const nextView = await kCandleChartApplication.loadKCandleChart(
        viewportSpanning(12 * 60, loaded.reloadedChart))

      expect(nextView.reloadedChart).toBeNull()
      expect(findKCandleSeries).toHaveBeenCalledTimes(1)
      expect(nextView.drawnRange).toEqual({ from: 0, to: 2.3 })
    })

    it.each([
      ['拉近到半天', CURRENT_TIME.getTime() - 12 * 60 * MILLISECONDS_PER_MINUTE, CURRENT_TIME.getTime()],
      ['往左拖到剛好離最早那一根半個畫面寬', new Date('2026-09-01T12:00:00.000Z').getTime(), new Date('2026-09-02T12:00:00.000Z').getTime()],
      ['往左拖一點，離最早那一根還有一個畫面寬', new Date('2026-09-01T12:00:00.000Z').getTime(), new Date('2026-09-02T00:00:00.000Z').getTime()],
    ])('手上的夠畫就不去要：%s', async (_gesture, startMilliseconds, endMilliseconds) => {
      const findKCandleSeries = vi.fn().mockResolvedValue(seriesOf([]))
      const kCandleChartApplication = buildApplication(buildProxy({ findKCandleSeries }))
      // 一天、每根一小時：手上這批涵蓋 9/1 00:00 到 9/3 00:00
      const loaded = await kCandleChartApplication.loadKCandleChart(viewportSpanning(24 * 60))

      const nextView = await kCandleChartApplication.loadKCandleChart(new KCandleChartViewportDto(
        'BTCUSDT', new Date(startMilliseconds), new Date(endMilliseconds),
        loaded.reloadedChart, DEFAULT_AGGREGATION_INTERVAL_CHOICE))

      expect(findKCandleSeries).toHaveBeenCalledTimes(1)
      expect(nextView.reloadedChart).toBeNull()
      // 不必換資料，但仍然說得出正在看哪一段
      expect(nextView.visibleRange.startTime.getTime()).toBe(startMilliseconds)
      expect(nextView.visibleRange.endTime.getTime()).toBe(endMilliseconds)
    })

    it('拖到離最早那一根不到半個畫面寬時，在左邊接上更早的九百根，看的那一段不動', async () => {
      const findKCandleSeries = vi.fn()
        .mockResolvedValueOnce(seriesOf([
          buildKCandle('2026-09-01T00:00:00.000Z', '100', '110'),
          buildKCandle('2026-09-01T01:00:00.000Z', '110', '120'),
        ], '1h'))
        .mockResolvedValueOnce(seriesOf([
          buildKCandle('2026-08-31T23:00:00.000Z', '90', '100'),
          // 交界那一根兩批都有：以接上來的那一段為準
          buildKCandle('2026-09-01T00:00:00.000Z', '100', '105'),
        ], '1h'))
      const kCandleChartApplication = buildApplication(buildProxy({ findKCandleSeries }))
      // 手上這批涵蓋 9/1 00:00 到 9/3 00:00
      const loaded = await kCandleChartApplication.loadKCandleChart(viewportSpanning(24 * 60))

      // 看 9/1 06:00 到 9/2 06:00：離最早那一根六小時，不到半個畫面寬（十二小時）
      const nextView = await kCandleChartApplication.loadKCandleChart(new KCandleChartViewportDto(
        'BTCUSDT', new Date('2026-09-01T06:00:00.000Z'), new Date('2026-09-02T06:00:00.000Z'),
        loaded.reloadedChart, DEFAULT_AGGREGATION_INTERVAL_CHOICE))

      const extendPlan = findKCandleSeries.mock.calls[1]?.[0]
      // 九百根一小時：往前三十七天半，接到手上最早那一刻為止
      expect(extendPlan.fetchStartTime.toISOString()).toBe('2026-07-25T12:00:00.000Z')
      expect(extendPlan.fetchEndTime.toISOString()).toBe('2026-09-01T00:00:00.000Z')
      expect(nextView.reloadedChart?.kCandles.map(kCandle => kCandle.openTime.toISOString())).toEqual([
        '2026-08-31T23:00:00.000Z', '2026-09-01T00:00:00.000Z', '2026-09-01T01:00:00.000Z',
      ])
      expect(nextView.reloadedChart?.kCandles[1]?.close.toString()).toBe('105')
      expect(nextView.reloadedChart?.coveredStartTime.toISOString()).toBe('2026-07-25T12:00:00.000Z')
      expect(nextView.reloadedChart?.coveredEndTime.toISOString()).toBe('2026-09-03T00:00:00.000Z')
      expect(nextView.visibleRange.startTime.toISOString()).toBe('2026-09-01T06:00:00.000Z')
    })

    it('每根一分鐘時，往左接上的一段至多九百分鐘', async () => {
      const findKCandleSeries = vi.fn().mockResolvedValue(seriesOf([]))
      const oneMinute = aggregationIntervalChoiceOf('1m')
      const kCandleChartApplication = buildApplication(buildProxy({ findKCandleSeries }))
      const loaded = await kCandleChartApplication.loadKCandleChart(
        viewportSpanning(60, null, 'BTCUSDT', oneMinute))

      // 手上這批涵蓋 10:30 到 12:30；看 10:40 到 11:40，離最早那一根十分鐘
      await kCandleChartApplication.loadKCandleChart(new KCandleChartViewportDto(
        'BTCUSDT', new Date('2026-09-02T10:40:00.000Z'), new Date('2026-09-02T11:40:00.000Z'),
        loaded.reloadedChart, oneMinute))

      const extendPlan = findKCandleSeries.mock.calls[1]?.[0]
      expect(extendPlan.fetchEndTime.getTime() - extendPlan.fetchStartTime.getTime())
        .toBe(900 * MILLISECONDS_PER_MINUTE)
    })

    it('往左接上來的一段一根都沒有時，那一頭到底了，再往左拖不再去要', async () => {
      const findKCandleSeries = vi.fn()
        .mockResolvedValueOnce(seriesOf([buildKCandle('2026-09-01T00:00:00.000Z', '100', '110')], '1h'))
        .mockResolvedValueOnce(seriesOf([], '1h'))
      const kCandleChartApplication = buildApplication(buildProxy({ findKCandleSeries }))
      const loaded = await kCandleChartApplication.loadKCandleChart(viewportSpanning(24 * 60))
      const extended = await kCandleChartApplication.loadKCandleChart(new KCandleChartViewportDto(
        'BTCUSDT', new Date('2026-09-01T06:00:00.000Z'), new Date('2026-09-02T06:00:00.000Z'),
        loaded.reloadedChart, DEFAULT_AGGREGATION_INTERVAL_CHOICE))

      // 繼續往左拖到手上最早那一刻的附近
      const nextView = await kCandleChartApplication.loadKCandleChart(new KCandleChartViewportDto(
        'BTCUSDT', new Date('2026-07-25T13:00:00.000Z'), new Date('2026-07-26T13:00:00.000Z'),
        extended.reloadedChart, DEFAULT_AGGREGATION_INTERVAL_CHOICE))

      expect(extended.reloadedChart?.reachedEarliest).toBe(true)
      expect(findKCandleSeries).toHaveBeenCalledTimes(2)
      expect(nextView.reloadedChart).toBeNull()
    })

    it('看過一段過去、往右拖到快沒資料時，在右邊接上更晚的一段，接到現在為止', async () => {
      const findKCandleSeries = vi.fn()
        .mockResolvedValueOnce(seriesOf([buildKCandle('2026-09-01T00:00:00.000Z', '100', '110')], '1h'))
        .mockResolvedValueOnce(seriesOf([buildKCandle('2026-09-02T00:00:00.000Z', '110', '120')], '1h'))
      const kCandleChartApplication = buildApplication(buildProxy({ findKCandleSeries }))
      // 看 8/31 00:00 到 9/1 00:00：手上這批涵蓋 8/30 12:00 到 9/1 12:00，早於現在一整天
      const loaded = await kCandleChartApplication.loadKCandleChart(new KCandleChartViewportDto(
        'BTCUSDT', new Date('2026-08-31T00:00:00.000Z'), new Date('2026-09-01T00:00:00.000Z'),
        null, DEFAULT_AGGREGATION_INTERVAL_CHOICE))

      // 往右拖六小時：看的最晚那一刻離手上最新那一刻六小時，不到半個畫面寬
      const nextView = await kCandleChartApplication.loadKCandleChart(new KCandleChartViewportDto(
        'BTCUSDT', new Date('2026-08-31T06:00:00.000Z'), new Date('2026-09-01T06:00:00.000Z'),
        loaded.reloadedChart, DEFAULT_AGGREGATION_INTERVAL_CHOICE))

      const extendPlan = findKCandleSeries.mock.calls[1]?.[0]
      expect(extendPlan.fetchStartTime.toISOString()).toBe('2026-09-01T12:00:00.000Z')
      expect(extendPlan.fetchEndTime.toISOString()).toBe('2026-09-02T12:00:00.000Z')
      expect(nextView.reloadedChart?.count).toBe(2)
      expect(nextView.reloadedChart?.coveredEndTime.toISOString()).toBe('2026-09-02T12:00:00.000Z')
    })

    it.each([
      ['過了半小時（還不到一整根）', 30, 1],
      ['過了兩小時', 120, 2],
    ])('手上最新那一刻是當時的現在，%s往右拖到底：缺一整根以上才去要', async (_elapsed, elapsedMinutes, expectedCalls) => {
      const findKCandleSeries = vi.fn().mockResolvedValue(seriesOf([]))
      const kCandleChartApplication = buildApplication(buildProxy({ findKCandleSeries }))
      // 二十天、每根一小時：兩側各多半段超過九百根，右邊落在未來的那半段被收回到現在
      const loaded = await kCandleChartApplication.loadKCandleChart(viewportSpanning(20 * 24 * 60))
      vi.setSystemTime(new Date(CURRENT_TIME.getTime() + elapsedMinutes * MILLISECONDS_PER_MINUTE))

      await kCandleChartApplication.loadKCandleChart(new KCandleChartViewportDto(
        'BTCUSDT', new Date(Date.now() - 20 * 24 * 60 * MILLISECONDS_PER_MINUTE), new Date(),
        loaded.reloadedChart, DEFAULT_AGGREGATION_INTERVAL_CHOICE))

      expect(loaded.reloadedChart?.coveredEndTime).toEqual(CURRENT_TIME)
      expect(findKCandleSeries).toHaveBeenCalledTimes(expectedCalls)
    })

    it('整批取超過九百根時，先收掉落在未來的那半段，再收左邊，保留較晚那一端', async () => {
      const findKCandleSeries = vi.fn().mockResolvedValue(seriesOf([]))
      const kCandleChartApplication = buildApplication(buildProxy({ findKCandleSeries }))

      // 一個月、每根一小時：兩側各多半段是一千四百四十根
      await kCandleChartApplication.loadKCandleChart(viewportSpanning(30 * 24 * 60))

      const loadPlan = findKCandleSeries.mock.calls[0]?.[0]
      expect(loadPlan.fetchEndTime.toISOString()).toBe('2026-09-02T12:00:00.000Z')
      expect(loadPlan.fetchStartTime.toISOString()).toBe('2026-07-27T00:00:00.000Z')
    })

    it('看的那一段整個在手上這批之外時，整批換一批', async () => {
      const findKCandleSeries = vi.fn().mockResolvedValue(seriesOf([]))
      const kCandleChartApplication = buildApplication(buildProxy({ findKCandleSeries }))
      const loaded = await kCandleChartApplication.loadKCandleChart(viewportSpanning(24 * 60))

      await kCandleChartApplication.loadKCandleChart(new KCandleChartViewportDto(
        'BTCUSDT', new Date('2026-08-01T00:00:00.000Z'), new Date('2026-08-02T00:00:00.000Z'),
        loaded.reloadedChart, DEFAULT_AGGREGATION_INTERVAL_CHOICE))

      const replacePlan = findKCandleSeries.mock.calls[1]?.[0]
      expect(replacePlan.kind).toBe('replace')
      expect(replacePlan.fetchStartTime.toISOString()).toBe('2026-07-31T12:00:00.000Z')
      expect(replacePlan.fetchEndTime.toISOString()).toBe('2026-08-02T12:00:00.000Z')
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
        .rejects.toThrowError(new KCandleQueryValidationError('symbol', new LocalizedTextVo('請指定交易標的', 'Symbol is required')))
      expect(findKCandleSeries).not.toHaveBeenCalled()
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

      expect(presets.map(preset => preset.label.in('zh-TW')))
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

  describe('挑一根 K 線涵蓋多久', () => {
    it('列出六種可挑的粗細，由細到粗，沒有自動', () => {
      const choices = buildApplication(buildProxy()).listAggregationIntervalChoices()

      expect(choices.map(choice => choice.label.in('zh-TW')))
        .toEqual(['一分鐘', '五分鐘', '十五分鐘', '一小時', '四小時', '一天'])
    })

    it('一進畫面每根一小時', () => {
      expect(buildApplication(buildProxy()).defaultAggregationIntervalChoice().declaredInterval).toBe('1h')
    })

    it('挑了固定的一種時，那一種一路帶到取行情的條件上', async () => {
      const findKCandleSeries = vi.fn().mockResolvedValue(seriesOf([], '5m'))
      const kCandleChartApplication = buildApplication(buildProxy({ findKCandleSeries }))

      await kCandleChartApplication.loadKCandleChart(
        viewportSpanning(24 * 60, null, 'BTCUSDT', aggregationIntervalChoiceOf('5m')))

      expect(findKCandleSeries.mock.calls[0]?.[0].aggregationIntervalChoice.declaredInterval)
        .toBe('5m')
    })

    it('換一種粗細就重新取——手上這批是另一種粗細的，涵蓋得再廣都不算數', async () => {
      const findKCandleSeries = vi.fn().mockResolvedValue(seriesOf([], '5m'))
      const kCandleChartApplication = buildApplication(buildProxy({ findKCandleSeries }))
      const loaded = await kCandleChartApplication.loadKCandleChart(
        viewportSpanning(24 * 60, null, 'BTCUSDT', aggregationIntervalChoiceOf('5m')))

      await kCandleChartApplication.loadKCandleChart(viewportSpanning(
        24 * 60, loaded.reloadedChart, 'BTCUSDT', aggregationIntervalChoiceOf('1h')))

      expect(findKCandleSeries).toHaveBeenCalledTimes(2)
      expect(findKCandleSeries.mock.calls[1]?.[0].aggregationIntervalChoice.declaredInterval)
        .toBe('1h')
    })

    it('挑到同一個不重新取', async () => {
      const findKCandleSeries = vi.fn().mockResolvedValue(seriesOf([], '5m'))
      const kCandleChartApplication = buildApplication(buildProxy({ findKCandleSeries }))
      const loaded = await kCandleChartApplication.loadKCandleChart(
        viewportSpanning(24 * 60, null, 'BTCUSDT', aggregationIntervalChoiceOf('5m')))

      const nextView = await kCandleChartApplication.loadKCandleChart(viewportSpanning(
        24 * 60, loaded.reloadedChart, 'BTCUSDT', aggregationIntervalChoiceOf('5m')))

      expect(nextView.reloadedChart).toBeNull()
      expect(findKCandleSeries).toHaveBeenCalledTimes(1)
    })

    it('系統回報的刻度與挑的不同時，下一次不會又重新取一遍', async () => {
      // 拿後端回報的刻度去比對就會在這裡永遠不相等，於是每一次都重取。
      const findKCandleSeries = vi.fn().mockResolvedValue(seriesOf([], '1m'))
      const kCandleChartApplication = buildApplication(buildProxy({ findKCandleSeries }))
      const loaded = await kCandleChartApplication.loadKCandleChart(viewportSpanning(24 * 60))

      const nextView = await kCandleChartApplication.loadKCandleChart(
        viewportSpanning(24 * 60, loaded.reloadedChart))

      expect(nextView.reloadedChart).toBeNull()
      expect(findKCandleSeries).toHaveBeenCalledTimes(1)
    })

    it('換粗細不改變使用者看的那一段', async () => {
      const findKCandleSeries = vi.fn().mockResolvedValue(seriesOf([], '5m'))
      const kCandleChartApplication = buildApplication(buildProxy({ findKCandleSeries }))
      const loaded = await kCandleChartApplication.loadKCandleChart(
        viewportSpanning(4 * 60, null, 'BTCUSDT', aggregationIntervalChoiceOf('5m')))

      const nextView = await kCandleChartApplication.loadKCandleChart(viewportSpanning(
        4 * 60, loaded.reloadedChart, 'BTCUSDT', aggregationIntervalChoiceOf('1h')))

      expect(nextView.visibleRange.startTime).toEqual(loaded.visibleRange.startTime)
      expect(nextView.visibleRange.endTime).toEqual(loaded.visibleRange.endTime)
    })

    it.each([
      ['一小時', '1m'], ['五小時', '1m'], ['十小時', '1m'], ['一天', '5m'], ['五天', '15m'],
      ['一個月', '1h'], ['三個月', '4h'], ['六個月', '1d'], ['一年', '1d'],
    ])('按「%s」一併換成每根 %s', (label, interval) => {
      const preset = buildApplication(buildProxy()).listRangePresets()
        .find(candidate => candidate.label.in('zh-TW') === label)

      const viewport = preset?.toViewportDto('BTCUSDT', null)

      expect(preset?.aggregationIntervalChoice.declaredInterval).toBe(interval)
      expect(viewport?.aggregationIntervalChoice.declaredInterval).toBe(interval)
    })
  })

  describe('defaultRangePreset', () => {
    it('一進畫面看的是一個月（每根一小時），不是那一排最短的一段', () => {
      const kCandleChartApplication = buildApplication(buildProxy())

      expect(kCandleChartApplication.defaultRangePreset().label.in('zh-TW')).toBe('一個月')
      expect(kCandleChartApplication.defaultRangePreset().aggregationIntervalChoice.declaredInterval).toBe('1h')
      expect(kCandleChartApplication.listRangePresets()[0]?.label.in('zh-TW')).toBe('一小時')
    })
  })

  describe('loadKCandleContractChart', () => {
    function buildKCandleContract(openTime: string, open: string, closePrice: string): KCandleContract {
      const markLine = new ContractPriceLineVo(
        new Decimal('1'), new Decimal('1'), new Decimal('1'), new Decimal('7777'))

      return new KCandleContract(
        'BTCUSDT', new Date(openTime),
        new Decimal(open), new Decimal('999'), new Decimal('1'), new Decimal(closePrice),
        new Decimal('1'), new Decimal('1'), new Decimal('1'), new Decimal('1'),
        3, markLine, null, null,
      )
    }

    function contractSeriesOf(kCandleContracts: KCandleContract[], interval = '1m'): KCandleContractSeriesVo {
      return new KCandleContractSeriesVo(kCandleContracts, aggregationIntervalOf(interval))
    }

    function buildContractChartApplication(
      kCandleContractProxy: IKCandleContractProxy, kCandleProxy: IKCandleProxy = buildProxy(),
    ): KCandleChartApplication {
      return new KCandleChartApplication(new KCandleChartService(kCandleProxy, kCandleContractProxy))
    }

    it('一進來取合約那一條的序列，畫的是成交價，標系統說的每根涵蓋', async () => {
      const spotProxy = buildProxy()
      const findKCandleContractSeries = vi.fn().mockResolvedValue(contractSeriesOf([
        buildKCandleContract('2026-09-02T11:00:00.000Z', '100', '110'),
        buildKCandleContract('2026-09-02T11:15:00.000Z', '110', '105'),
      ], '15m'))
      const kCandleChartApplication = buildContractChartApplication(
        buildKCandleContractProxy({ findKCandleContractSeries }), spotProxy)

      const chartView = await kCandleChartApplication.loadKCandleContractChart(viewportSpanning(24 * 60))

      // 一整天，前後再各多取半天——與現貨圖表同一套取法
      const loadPlan = findKCandleContractSeries.mock.calls[0]?.[0]
      expect(loadPlan.symbol).toBe('BTCUSDT')
      expect(loadPlan.fetchStartTime.toISOString()).toBe('2026-09-01T00:00:00.000Z')
      expect(spotProxy.findKCandleSeries).not.toHaveBeenCalled()
      expect(chartView.reloadedChart?.interval.label.in('zh-TW')).toBe('十五分鐘')
      expect(chartView.reloadedChart?.latestKCandle?.close.toString()).toBe('105')
      expect(chartView.reloadedChart?.kCandles.map(kCandle => kCandle.trend.label.in('zh-TW')))
        .toEqual(['上漲', '下跌'])
    })

    it('換成五分鐘時把那一種說出去，看的那一段不動', async () => {
      const findKCandleContractSeries = vi.fn().mockResolvedValue(contractSeriesOf([], '5m'))
      const kCandleChartApplication = buildContractChartApplication(
        buildKCandleContractProxy({ findKCandleContractSeries }))

      const chartView = await kCandleChartApplication.loadKCandleContractChart(
        viewportSpanning(24 * 60, null, 'BTCUSDT', aggregationIntervalChoiceOf('5m')))

      const loadPlan = findKCandleContractSeries.mock.calls[0]?.[0]
      expect(loadPlan.aggregationIntervalChoice.declaredInterval).toBe('5m')
      expect(chartView.visibleRange.startTime.toISOString()).toBe('2026-09-01T12:00:00.000Z')
      expect(chartView.visibleRange.endTime.toISOString()).toBe('2026-09-02T12:00:00.000Z')
      expect(chartView.reloadedChart?.interval.label.in('zh-TW')).toBe('五分鐘')
    })

    it('手上那批還夠用時不重新取——與現貨圖表同一條規則', async () => {
      const findKCandleContractSeries = vi.fn().mockResolvedValue(contractSeriesOf([
        buildKCandleContract('2026-09-02T11:00:00.000Z', '100', '110'),
      ]))
      const kCandleChartApplication = buildContractChartApplication(
        buildKCandleContractProxy({ findKCandleContractSeries }))
      const first = await kCandleChartApplication.loadKCandleContractChart(viewportSpanning(24 * 60))

      const second = await kCandleChartApplication.loadKCandleContractChart(
        viewportSpanning(24 * 60, first.reloadedChart))

      expect(findKCandleContractSeries).toHaveBeenCalledTimes(1)
      expect(second.reloadedChart).toBeNull()
      expect(second.drawnRange).not.toBeNull()
    })

    it('那段時間一根都沒有時是一張空的圖，不是錯誤', async () => {
      const kCandleChartApplication = buildContractChartApplication(buildKCandleContractProxy({
        findKCandleContractSeries: vi.fn().mockResolvedValue(contractSeriesOf([])),
      }))

      const chartView = await kCandleChartApplication.loadKCandleContractChart(viewportSpanning(60))

      expect(chartView.reloadedChart?.isEmpty).toBe(true)
    })

    it('固定粗細而那一段太長時，系統說的原因原封往上傳', async () => {
      const kCandleChartApplication = buildContractChartApplication(buildKCandleContractProxy({
        findKCandleContractSeries: vi.fn().mockRejectedValue(new BackendRequestRejectedError(
          '時間區間過大，請縮小區間；若指定了彙總刻度，也可以改用更長的一種')),
      }))

      await expect(kCandleChartApplication.loadKCandleContractChart(
        viewportSpanning(30 * 24 * 60, null, 'BTCUSDT', aggregationIntervalChoiceOf('1m'))))
        .rejects.toThrow('也可以改用更長的一種')
    })
  })
})

describe('KCandleChartApplication：圖例', () => {
  it('說的是十字線那一根，並帶最新那一根的收盤倒數', () => {
    const chart = kCandleChartOf('1h', [
      new KCandleSpec('2026-10-16T10:00:00.000Z', '100', '100', '100', '110'),
      new KCandleSpec('2026-10-16T11:00:00.000Z', '110', '110', '100', '105'),
    ])

    const readout = buildApplication(buildProxy()).describeReadout(chart, 1, new Date('2026-10-16T11:59:30.000Z'))

    expect(readout?.change.toString()).toBe('-5')
    expect(readout?.countdown).toBe('00:30')
  })
})
