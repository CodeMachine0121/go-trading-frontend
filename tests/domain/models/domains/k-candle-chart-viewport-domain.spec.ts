import Decimal from 'decimal.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { KCandleChartViewportDomain } from '~/domain/models/domains/k-candle-chart-viewport-domain'
import { KCandleChartViewportDto } from '~/domain/models/dto/k-candle-chart-viewport-dto'
import { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import { KCandleDto } from '~/domain/models/dto/k-candle-dto'
import { KCandleTrendVo } from '~/domain/models/vo/k-candle-trend-vo'
import { KCandleQueryValidationError } from '~/domain/errors/k-candle-query-validation-error'
import type { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'
import {
  DEFAULT_AGGREGATION_INTERVAL_CHOICE, aggregationIntervalChoiceOf,
} from '../../../fixtures/aggregation-interval-choice'
import { aggregationIntervalNamed as intervalFor } from '../../../fixtures/aggregation-interval'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const NOW = new Date('2026-09-02T12:00:00.000Z')

/** 只給會影響行為的資料：手上這批的交易標的、挑的粗細、涵蓋範圍與那一頭到底了沒有。 */
function loadedChart(
  { symbol = 'BTCUSDT', coveredStartTime, coveredEndTime,
    choice = DEFAULT_AGGREGATION_INTERVAL_CHOICE, reachedEarliest = false }:
  {
    symbol?: string
    coveredStartTime: string
    coveredEndTime: string
    choice?: AggregationIntervalChoiceDto
    reachedEarliest?: boolean
  },
): KCandleChartDto {
  return new KCandleChartDto(
    symbol,
    intervalFor(choice.value),
    new Date(coveredStartTime),
    new Date(coveredEndTime),
    [new KCandleDto(
      symbol, new Date(coveredStartTime),
      new Decimal('100'), new Decimal('110'), new Decimal('90'), new Decimal('105'),
      new Decimal('1'), new Decimal('1'), new Decimal('1'), new Decimal('1'),
      new KCandleTrendVo('up', new LocalizedTextVo('上漲', 'Up'), 'success'),
      new Decimal('5'),
      new Decimal('5'),
    )],
    choice,
    null,
    reachedEarliest,
  )
}

/** 一天、每根一小時那一次整批取回來的：涵蓋 9/1 00:00 到 9/3 00:00。 */
const ONE_DAY_LOADED = { coveredStartTime: '2026-09-01T00:00:00.000Z', coveredEndTime: '2026-09-03T00:00:00.000Z' }

function viewport(
  visibleStartTime: string, visibleEndTime: string, loaded: KCandleChartDto | null = null,
  { symbol = 'BTCUSDT', choice = DEFAULT_AGGREGATION_INTERVAL_CHOICE } = {},
): KCandleChartViewportDomain {
  return new KCandleChartViewportDomain(new KCandleChartViewportDto(
    symbol, new Date(visibleStartTime), new Date(visibleEndTime), loaded, choice))
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('KCandleChartViewportDomain', () => {
  describe('整批換一批', () => {
    it('手上什麼都沒有時，取看的那一段兩側各多半段', () => {
      const loadPlan = viewport('2026-09-02T10:00:00.000Z', '2026-09-02T12:00:00.000Z').toLoadPlan()

      expect(loadPlan.kind).toBe('replace')
      expect(loadPlan.fetchStartTime.toISOString()).toBe('2026-09-02T09:00:00.000Z')
      expect(loadPlan.fetchEndTime.toISOString()).toBe('2026-09-02T13:00:00.000Z')
    })

    it.each([
      ['換了標的', { symbol: 'ETHUSDT' }],
      ['換了粗細', { choice: aggregationIntervalChoiceOf('4h') }],
    ])('%s：手上這批涵蓋得再廣都不算數', (_reason, override) => {
      const loadPlan = viewport('2026-09-01T12:00:00.000Z', '2026-09-02T12:00:00.000Z',
        loadedChart(ONE_DAY_LOADED), override).toLoadPlan()

      expect(loadPlan.kind).toBe('replace')
    })

    it.each([
      ['整個在左邊之外', '2026-08-30T00:00:00.000Z', '2026-09-01T00:00:00.000Z'],
      ['整個在右邊之外', '2026-09-03T00:00:00.000Z', '2026-09-04T00:00:00.000Z'],
    ])('看的那一段%s', (_where, start, end) => {
      expect(viewport(start, end, loadedChart(ONE_DAY_LOADED)).toLoadPlan().kind).toBe('replace')
    })

    it('手上這批涵蓋不到任何時間時整批換', () => {
      const empty = loadedChart({ coveredStartTime: '2026-09-02T00:00:00.000Z', coveredEndTime: '2026-09-02T00:00:00.000Z' })

      expect(viewport('2026-09-01T12:00:00.000Z', '2026-09-02T12:00:00.000Z', empty).toLoadPlan().kind)
        .toBe('replace')
    })

    it('超過九百根時，先把落在未來的那半段收回到現在，再收左邊', () => {
      // 一個月、每根一小時：兩側各多半段是一千四百四十根
      const loadPlan = viewport('2026-08-03T12:00:00.000Z', '2026-09-02T12:00:00.000Z').toLoadPlan()

      expect(loadPlan.fetchEndTime).toEqual(NOW)
      expect(loadPlan.fetchStartTime.toISOString()).toBe('2026-07-27T00:00:00.000Z')
    })

    it('看的那一段本身超過九百根時，保留較晚那一端，不切掉看的那一段的結尾', () => {
      // 每根一分鐘看一整天：一千四百四十根
      const loadPlan = viewport('2026-09-01T12:00:00.000Z', '2026-09-02T12:00:00.000Z', null,
        { choice: aggregationIntervalChoiceOf('1m') }).toLoadPlan()

      expect(loadPlan.fetchEndTime).toEqual(NOW)
      expect(loadPlan.fetchEndTime.getTime() - loadPlan.fetchStartTime.getTime()).toBe(900 * 60 * 1000)
    })
  })

  describe('手上的夠畫就不去要', () => {
    it.each([
      ['拉近', '2026-09-02T00:00:00.000Z', '2026-09-02T12:00:00.000Z'],
      ['拉遠到剛好離最早那一根半個畫面寬', '2026-09-01T09:00:00.000Z', '2026-09-02T03:00:00.000Z'],
      ['左右拖一點', '2026-09-01T14:00:00.000Z', '2026-09-02T14:00:00.000Z'],
    ])('%s', (_gesture, start, end) => {
      expect(viewport(start, end, loadedChart(ONE_DAY_LOADED)).toLoadPlan().kind).toBe('none')
    })

    it('不取時仍說得出看的那一段——畫面照它算指標', () => {
      const loadPlan = viewport('2026-09-02T00:00:00.000Z', '2026-09-02T12:00:00.000Z',
        loadedChart(ONE_DAY_LOADED)).toLoadPlan()

      expect(loadPlan.visibleStartTime.toISOString()).toBe('2026-09-02T00:00:00.000Z')
      expect(loadPlan.visibleEndTime).toEqual(NOW)
      expect(loadPlan.needsReload).toBe(false)
    })
  })

  describe('往左接上更早的一段', () => {
    it('看的最早那一刻離手上最早那一根不到半個畫面寬：取緊接在左邊的九百根', () => {
      const loadPlan = viewport('2026-09-01T06:00:00.000Z', '2026-09-02T06:00:00.000Z',
        loadedChart(ONE_DAY_LOADED)).toLoadPlan()

      expect(loadPlan.kind).toBe('extendEarlier')
      expect(loadPlan.fetchStartTime.toISOString()).toBe('2026-07-25T12:00:00.000Z')
      expect(loadPlan.fetchEndTime.toISOString()).toBe('2026-09-01T00:00:00.000Z')
      // 看的那一段不動
      expect(loadPlan.visibleStartTime.toISOString()).toBe('2026-09-01T06:00:00.000Z')
    })

    it('那一頭已經到底時不再去要', () => {
      const loadPlan = viewport('2026-09-01T06:00:00.000Z', '2026-09-02T06:00:00.000Z',
        loadedChart({ ...ONE_DAY_LOADED, reachedEarliest: true })).toLoadPlan()

      expect(loadPlan.kind).toBe('none')
    })
  })

  describe('往右接上更晚的一段', () => {
    // 看過 8/31 那一天：手上這批涵蓋 8/30 12:00 到 9/1 12:00，比現在早一整天
    const PAST_LOADED = { coveredStartTime: '2026-08-30T12:00:00.000Z', coveredEndTime: '2026-09-01T12:00:00.000Z' }

    it('看的最晚那一刻離手上最新那一刻不到半個畫面寬：取緊接在右邊的，接到現在為止', () => {
      const loadPlan = viewport('2026-08-31T06:00:00.000Z', '2026-09-01T06:00:00.000Z',
        loadedChart(PAST_LOADED)).toLoadPlan()

      expect(loadPlan.kind).toBe('extendLater')
      expect(loadPlan.fetchStartTime.toISOString()).toBe('2026-09-01T12:00:00.000Z')
      expect(loadPlan.fetchEndTime).toEqual(NOW)
    })

    it('每根一分鐘時，右邊一次至多接九百根', () => {
      const oneMinute = aggregationIntervalChoiceOf('1m')
      const loadPlan = viewport('2026-08-31T06:00:00.000Z', '2026-09-01T06:00:00.000Z',
        loadedChart({ ...PAST_LOADED, choice: oneMinute }), { choice: oneMinute }).toLoadPlan()

      expect(loadPlan.fetchEndTime.getTime() - loadPlan.fetchStartTime.getTime()).toBe(900 * 60 * 1000)
    })

    it('手上最新那一刻離現在不到一整根時不去要——那一點點由即時更新補上', () => {
      const loadPlan = viewport('2026-09-01T12:30:00.000Z', '2026-09-02T12:30:00.000Z',
        loadedChart({ coveredStartTime: '2026-08-01T00:00:00.000Z', coveredEndTime: '2026-09-02T11:30:00.000Z' })).toLoadPlan()

      expect(loadPlan.kind).toBe('none')
    })

    it('離手上最新那一刻還有半個畫面寬以上時不去要', () => {
      const loadPlan = viewport('2026-08-31T00:00:00.000Z', '2026-08-31T12:00:00.000Z',
        loadedChart(PAST_LOADED)).toLoadPlan()

      expect(loadPlan.kind).toBe('none')
    })
  })

  describe('使用者挑的粗細', () => {
    it('把使用者挑的那一種原樣交出去給取資料的人', () => {
      const fiveMinutes = aggregationIntervalChoiceOf('5m')

      expect(viewport('2026-09-02T10:00:00.000Z', '2026-09-02T12:00:00.000Z', null, { choice: fiveMinutes })
        .toLoadPlan().aggregationIntervalChoice).toBe(fiveMinutes)
    })

    it('縮放不換粗細：看的那一段變長變短本身不是重新取的理由', () => {
      const loadPlan = viewport('2026-09-01T12:00:00.000Z', '2026-09-02T00:00:00.000Z',
        loadedChart(ONE_DAY_LOADED)).toLoadPlan()

      expect(loadPlan.kind).toBe('none')
      expect(loadPlan.aggregationIntervalChoice.value).toBe('1h')
    })
  })

  describe('交易標的', () => {
    it('帶著去取資料的是去掉前後空白的交易標的', () => {
      expect(viewport('2026-09-02T10:00:00.000Z', '2026-09-02T12:00:00.000Z', null, { symbol: '  BTCUSDT ' })
        .toLoadPlan().symbol).toBe('BTCUSDT')
    })

    it.each([
      { name: '沒填', symbol: '' },
      { name: '只填了空白字元', symbol: '   ' },
    ])('$name 就不成立，並指名是交易標的這一欄', ({ symbol }) => {
      expect(() => viewport('2026-09-02T10:00:00.000Z', '2026-09-02T12:00:00.000Z', null, { symbol }))
        .toThrowError(new KCandleQueryValidationError('symbol', new LocalizedTextVo('請指定交易標的', 'Symbol is required')))
    })
  })
})
