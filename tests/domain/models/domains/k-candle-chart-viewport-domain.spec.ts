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

/** 該看的那一段裡會擺出幾根——這才是「畫面上最多 400 根」那條規則說的東西。 */
function visibleCandleCountOf(loadPlan: { visibleStartTime: Date, visibleEndTime: Date, interval: { minutes: number } }): number {
  return (loadPlan.visibleEndTime.getTime() - loadPlan.visibleStartTime.getTime())
    / (loadPlan.interval.minutes * MILLISECONDS_PER_MINUTE)
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
  describe('每一根都涵蓋一分鐘', () => {
    it.each([
      { name: '看三十分鐘：三十根', visibleMinutes: 30, expectedCandleCount: 30 },
      { name: '看四百分鐘：恰好 400 根', visibleMinutes: 400, expectedCandleCount: 400 },
      { name: '看四百零五分鐘：太擠，收回四百分鐘', visibleMinutes: 405, expectedCandleCount: 400 },
      { name: '看一天：收回四百分鐘，不改用更粗的刻度', visibleMinutes: 24 * 60, expectedCandleCount: 400 },
      { name: '看一年：一樣收回四百分鐘', visibleMinutes: 365 * 24 * 60, expectedCandleCount: 400 },
    ])('$name', ({ visibleMinutes, expectedCandleCount }) => {
      const loadPlan = viewportSpanning(visibleMinutes).toLoadPlan()

      expect(loadPlan.interval.value).toBe('1m')
      expect(visibleCandleCountOf(loadPlan)).toBe(expectedCandleCount)
    })

    it('恰好落在上限的四百分鐘不被收回', () => {
      const loadPlan = viewportSpanning(400).toLoadPlan()

      // 該看的仍是問的那四百分鐘，一分鐘都沒被收
      expect(loadPlan.visibleStartTime.toISOString()).toBe('2026-09-02T05:20:00.000Z')
      expect(loadPlan.visibleEndTime.toISOString()).toBe('2026-09-02T12:00:00.000Z')
      expect(visibleCandleCountOf(loadPlan)).toBe(400)
      // 前後各多取兩百分鐘
      expect(loadPlan.fetchStartTime.toISOString()).toBe('2026-09-02T02:00:00.000Z')
      expect(loadPlan.fetchEndTime.toISOString()).toBe('2026-09-02T15:20:00.000Z')
    })

    it('拉遠到五百分鐘時，該看的那一段被收回四百分鐘，結束的那一端不變', () => {
      const loadPlan = viewportSpanning(500).toLoadPlan()

      // 問的是五百分鐘（03:40 起），收回後該看的與四百分鐘那次完全相同
      expect(loadPlan.visibleStartTime.toISOString()).toBe('2026-09-02T05:20:00.000Z')
      expect(loadPlan.visibleEndTime.toISOString()).toBe('2026-09-02T12:00:00.000Z')
      expect(visibleCandleCountOf(loadPlan)).toBe(400)
      expect(loadPlan.fetchStartTime.toISOString()).toBe('2026-09-02T02:00:00.000Z')
      expect(loadPlan.fetchEndTime.toISOString()).toBe('2026-09-02T15:20:00.000Z')
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

    it('正在看的那段完全落在手上這批之內、刻度也沒變，就不取', () => {
      const loadPlan = viewportSpanning(120, loadedChart({
        coveredStartTime: '2026-09-02T06:00:00.000Z',
        coveredEndTime: '2026-09-02T18:00:00.000Z',
      })).toLoadPlan()

      expect(loadPlan.needsReload).toBe(false)
    })

    it.each([
      {
        name: '往前拖出手上這批的開頭',
        loaded: {
          coveredStartTime: '2026-09-02T10:30:00.000Z',
          coveredEndTime: '2026-09-02T18:00:00.000Z',
        },
      },
      {
        name: '往後拖出手上這批的結尾',
        loaded: {
          coveredStartTime: '2026-09-02T06:00:00.000Z',
          coveredEndTime: '2026-09-02T11:30:00.000Z',
        },
      },
      {
        name: '手上這批是別的交易標的',
        loaded: {
          symbol: 'ETHUSDT',
          coveredStartTime: '2026-09-02T06:00:00.000Z',
          coveredEndTime: '2026-09-02T18:00:00.000Z',
        },
      },
      {
        name: '手上這批的刻度跟這次該用的不一樣',
        loaded: {
          interval: '1h',
          coveredStartTime: '2026-09-02T06:00:00.000Z',
          coveredEndTime: '2026-09-02T18:00:00.000Z',
        },
      },
    ])('$name 就要重新取', ({ loaded }) => {
      const loadPlan = viewportSpanning(120, loadedChart(loaded)).toLoadPlan()

      expect(loadPlan.needsReload).toBe(true)
    })

    it('邊界剛好貼齊手上這批的兩端時仍然夠用', () => {
      const loadPlan = viewportSpanning(120, loadedChart({
        coveredStartTime: '2026-09-02T10:00:00.000Z',
        coveredEndTime: '2026-09-02T12:00:00.000Z',
      })).toLoadPlan()

      expect(loadPlan.needsReload).toBe(false)
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
