import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { KCandleChartViewportDomain } from '~/domain/models/domains/k-candle-chart-viewport-domain'
import { KCandleChartViewportDto } from '~/domain/models/dto/k-candle-chart-viewport-dto'
import { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import { KCandleDto } from '~/domain/models/dto/k-candle-dto'
import { AGGREGATION_INTERVALS } from '~/domain/models/vo/aggregation-interval-vo'
import { KCandleTrendVo } from '~/domain/models/vo/k-candle-trend-vo'
import { KCandleQueryValidationError } from '~/domain/errors/k-candle-query-validation-error'

const VISIBLE_END_TIME = new Date('2026-09-02T12:00:00.000Z')
const MILLISECONDS_PER_MINUTE = 60 * 1000

function intervalFor(value: string) {
  const aggregationInterval = AGGREGATION_INTERVALS.find(candidate => candidate.value === value)
  if (aggregationInterval === undefined) {
    throw new Error(`測試用了一個不存在的彙總刻度：${value}`)
  }
  return aggregationInterval
}

/** 只給會影響行為的資料：手上這批的交易標的、刻度與涵蓋範圍。 */
function loadedChart(
  { symbol = 'BTCUSDT', interval = '1m', coveredStartTime, coveredEndTime }:
  { symbol?: string, interval?: string, coveredStartTime: string, coveredEndTime: string },
): KCandleChartDto {
  return new KCandleChartDto(
    symbol,
    intervalFor(interval),
    new Date(coveredStartTime),
    new Date(coveredEndTime),
    [new KCandleDto(
      symbol, new Date(coveredStartTime),
      new Decimal('100'), new Decimal('110'), new Decimal('90'), new Decimal('105'),
      new Decimal('1'), new Decimal('1'), new Decimal('1'), new Decimal('1'),
      new KCandleTrendVo('up', '上漲', 'success'),
    )],
  )
}

/** 該看的那一段有多少分鐘長——收回上限那條規則說的就是這個。 */
function visibleMinutesOf(loadPlan: { visibleStartTime: Date, visibleEndTime: Date }): number {
  return (loadPlan.visibleEndTime.getTime() - loadPlan.visibleStartTime.getTime())
    / MILLISECONDS_PER_MINUTE
}

/**
 * 手上這批是「當初看這麼多分鐘」那一次取回來的。
 *
 * 兩側各多取半段，所以已取回區間恰好是當初顯示區間的兩倍——
 * 那也是畫面比對「長度變了沒有」時讀的東西，這裡照同一條關係造出來。
 */
function loadedChartFrom(
  visibleMinutes: number, { symbol = 'BTCUSDT', endTime = VISIBLE_END_TIME } = {},
): KCandleChartDto {
  const visibleMilliseconds = visibleMinutes * MILLISECONDS_PER_MINUTE
  const prefetchMilliseconds = visibleMilliseconds / 2

  return loadedChart({
    symbol,
    coveredStartTime: new Date(
      endTime.getTime() - visibleMilliseconds - prefetchMilliseconds).toISOString(),
    coveredEndTime: new Date(endTime.getTime() + prefetchMilliseconds).toISOString(),
  })
}

function viewportSpanning(
  visibleMinutes: number, loaded: KCandleChartDto | null = null, symbol = 'BTCUSDT',
): KCandleChartViewportDomain {
  return new KCandleChartViewportDomain(new KCandleChartViewportDto(
    symbol,
    new Date(VISIBLE_END_TIME.getTime() - visibleMinutes * MILLISECONDS_PER_MINUTE),
    VISIBLE_END_TIME,
    loaded,
  ))
}

describe('KCandleChartViewportDomain', () => {
  describe('刻度不由這裡決定', () => {
    it('取回計畫說得出要哪一段,但說不出要多粗——那是系統的事', () => {
      const loadPlan = viewportSpanning(30).toLoadPlan()

      expect(loadPlan.symbol).toBe('BTCUSDT')
      expect(loadPlan.visibleStartTime).toBeInstanceOf(Date)
      expect('interval' in loadPlan).toBe(false)
    })
  })

  describe('唯一的上限是一千天', () => {
    const MINUTES_PER_DAY = 24 * 60

    it.each([
      { name: '看三十分鐘', visibleMinutes: 30, expectedVisibleMinutes: 30 },
      { name: '看一天', visibleMinutes: MINUTES_PER_DAY, expectedVisibleMinutes: MINUTES_PER_DAY },
      {
        name: '看一年——以前會被收成四百分鐘,現在原樣看得到',
        visibleMinutes: 365 * MINUTES_PER_DAY,
        expectedVisibleMinutes: 365 * MINUTES_PER_DAY,
      },
      {
        name: '看恰好一千天',
        visibleMinutes: 1000 * MINUTES_PER_DAY,
        expectedVisibleMinutes: 1000 * MINUTES_PER_DAY,
      },
      {
        name: '看一千零一天:收回一千天',
        visibleMinutes: 1001 * MINUTES_PER_DAY,
        expectedVisibleMinutes: 1000 * MINUTES_PER_DAY,
      },
      {
        name: '看十年:一樣收回一千天',
        visibleMinutes: 10 * 365 * MINUTES_PER_DAY,
        expectedVisibleMinutes: 1000 * MINUTES_PER_DAY,
      },
    ])('$name', ({ visibleMinutes, expectedVisibleMinutes }) => {
      const loadPlan = viewportSpanning(visibleMinutes).toLoadPlan()

      expect(visibleMinutesOf(loadPlan)).toBe(expectedVisibleMinutes)
      // 收回時保留較晚的那一端
      expect(loadPlan.visibleEndTime.toISOString()).toBe('2026-09-02T12:00:00.000Z')
    })
  })

  describe('取資料時兩側各多取半段', () => {
    it('看兩小時就取回前後各多一小時的四小時', () => {
      const loadPlan = viewportSpanning(120).toLoadPlan()

      expect(loadPlan.fetchStartTime.toISOString()).toBe('2026-09-02T09:00:00.000Z')
      expect(loadPlan.fetchEndTime.toISOString()).toBe('2026-09-02T13:00:00.000Z')
    })
  })

  describe('什麼時候才重新取', () => {
    it('手上什麼都沒有時要取', () => {
      expect(viewportSpanning(120).toLoadPlan().needsReload).toBe(true)
    })

    it('正在看的那段完全落在手上這批之內、長度也沒變，就不取', () => {
      const loadPlan = viewportSpanning(120, loadedChartFrom(120)).toLoadPlan()

      expect(loadPlan.needsReload).toBe(false)
    })

    // 每一批的涵蓋範圍都是四小時,也就是「當初看兩小時」那一次取回來的——
    // 與這裡看的兩小時一樣長,所以會重新取的理由只剩下表格說的那一個。
    it.each([
      {
        name: '往前拖出手上這批的開頭',
        loaded: {
          coveredStartTime: '2026-09-02T10:30:00.000Z',
          coveredEndTime: '2026-09-02T14:30:00.000Z',
        },
      },
      {
        name: '往後拖出手上這批的結尾',
        loaded: {
          coveredStartTime: '2026-09-02T07:30:00.000Z',
          coveredEndTime: '2026-09-02T11:30:00.000Z',
        },
      },
      {
        name: '手上這批是別的交易標的',
        loaded: {
          symbol: 'ETHUSDT',
          coveredStartTime: '2026-09-02T09:00:00.000Z',
          coveredEndTime: '2026-09-02T13:00:00.000Z',
        },
      },
    ])('$name 就要重新取', ({ loaded }) => {
      const loadPlan = viewportSpanning(120, loadedChart(loaded)).toLoadPlan()

      expect(loadPlan.needsReload).toBe(true)
    })

    it('邊界剛好貼齊手上這批的結尾時仍然夠用', () => {
      // 手上這批是「當初看一小時」那一次的（涵蓋兩小時），這裡也看一小時、
      // 而且右緣正好貼在涵蓋範圍的結尾上。
      const loadPlan = viewportSpanning(60, loadedChart({
        coveredStartTime: '2026-09-02T10:00:00.000Z',
        coveredEndTime: '2026-09-02T12:00:00.000Z',
      })).toLoadPlan()

      expect(loadPlan.needsReload).toBe(false)
    })
  })

  describe('看的長度變了就要重新取', () => {
    // 畫面不再推導刻度，所以它算不出「刻度該不該變」——只算得出「我看的長度變了」。
    // 兩端都會出事：太鬆，每一格縮放都重新取、圖不停閃；
    // 太緊，放大之後仍然畫著粗刻度，放大這個動作看起來就是壞的。
    it.each([
      {
        name: '放大到一半:重新取,否則放大看不到更細的 K 線',
        visibleMinutes: 60,
        expectedNeedsReload: true,
      },
      {
        name: '拉遠到兩倍:重新取',
        visibleMinutes: 240,
        expectedNeedsReload: true,
      },
      {
        name: '只變一成:不重新取,那是同一個粗細',
        visibleMinutes: 132,
        expectedNeedsReload: false,
      },
      {
        name: '恰好變兩成半:還不算變了',
        visibleMinutes: 150,
        expectedNeedsReload: false,
      },
      {
        name: '變三成:超過門檻,重新取',
        visibleMinutes: 156,
        expectedNeedsReload: true,
      },
    ])('$name', ({ visibleMinutes, expectedNeedsReload }) => {
      // 手上這批是「當初看兩小時」那一次取回來的，涵蓋範圍前後各多半小時。
      const loadPlan
        = viewportSpanning(visibleMinutes, loadedChartFrom(120)).toLoadPlan()

      expect(loadPlan.needsReload).toBe(expectedNeedsReload)
    })

    it('手上這批涵蓋不到任何時間時就重新取，而不是拿它去除', () => {
      // 圖表函式庫在還沒擺好位置時會回報一段長度為零的區間，於是那一次取回來的
      // 涵蓋範圍也是零。拿它當分母算「長度變了幾成」會得出一個不是數字的答案，
      // 而那個答案比不出大小、於是永遠判定成「沒變」——圖就從此不再更新。
      const loadPlan = viewportSpanning(0, loadedChart({
        coveredStartTime: '2026-09-02T12:00:00.000Z',
        coveredEndTime: '2026-09-02T12:00:00.000Z',
      })).toLoadPlan()

      expect(loadPlan.needsReload).toBe(true)
    })
  })

  describe('交易標的', () => {
    it('帶著去取資料的是去掉前後空白的交易標的', () => {
      expect(viewportSpanning(120, null, '  BTCUSDT ').toLoadPlan().symbol).toBe('BTCUSDT')
    })

    it.each([
      { name: '沒填', symbol: '' },
      { name: '只填了空白字元', symbol: '   ' },
    ])('$name 就不成立，並指名是交易標的這一欄', ({ symbol }) => {
      expect(() => viewportSpanning(120, null, symbol))
        .toThrowError(new KCandleQueryValidationError('symbol', '請指定交易標的'))
    })
  })
})
