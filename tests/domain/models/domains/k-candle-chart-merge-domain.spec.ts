import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { KCandleChartMergeDomain } from '~/domain/models/domains/k-candle-chart-merge-domain'
import { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import { KCandleContractPricesDto } from '~/domain/models/dto/k-candle-contract-prices-dto'
import { KCandle } from '~/domain/models/entities/k-candle'
import { DEFAULT_AGGREGATION_INTERVAL_CHOICE } from '../../../fixtures/aggregation-interval-choice'
import { aggregationIntervalNamed } from '../../../fixtures/aggregation-interval'

const DAY = 24 * 60 * 60 * 1000

function pricesAt(mark: string): KCandleContractPricesDto {
  return new KCandleContractPricesDto(new Decimal(mark), null, null, new Date('2026-09-01T00:00:00.000Z'))
}

/** 只給會影響結果的：涵蓋範圍、那幾根的起始時間與收盤價、合約價、到底了沒有。 */
function chartOf(
  coveredStartTime: string, coveredEndTime: string, kCandles: [string, string][],
  { latestContractPrices = null, reachedEarliest = false, emptyEarlierDays = 0 }:
  { latestContractPrices?: KCandleContractPricesDto | null, reachedEarliest?: boolean, emptyEarlierDays?: number } = {},
): KCandleChartDto {
  return new KCandleChartDto(
    'BTCUSDT', aggregationIntervalNamed('1h'),
    new Date(coveredStartTime), new Date(coveredEndTime),
    kCandles.map(([openTime, close]) => new KCandle(
      'BTCUSDT', new Date(openTime), new Decimal('100'), new Decimal('100'), new Decimal('100'), new Decimal(close),
      new Decimal('1'), new Decimal('1'), new Decimal('1'), new Decimal('1')).toDomain().toDto()),
    DEFAULT_AGGREGATION_INTERVAL_CHOICE, latestContractPrices, reachedEarliest, emptyEarlierDays * DAY)
}

const LOADED = chartOf('2026-09-02T00:00:00.000Z', '2026-09-03T00:00:00.000Z',
  [['2026-09-02T00:00:00.000Z', '110'], ['2026-09-02T01:00:00.000Z', '120']],
  { latestContractPrices: pricesAt('200') })

describe('手上這批接上一段', () => {
  it('左邊接上來的：依起始時間排好、交界那一根以接上來的為準，涵蓋範圍往左長', () => {
    const merged = new KCandleChartMergeDomain(LOADED, chartOf(
      '2026-09-01T00:00:00.000Z', '2026-09-02T00:00:00.000Z',
      [['2026-09-01T23:00:00.000Z', '90'], ['2026-09-02T00:00:00.000Z', '115']])).toDto()

    expect(merged.kCandles.map(kCandle => [kCandle.openTime.toISOString(), kCandle.close.toString()])).toEqual([
      ['2026-09-01T23:00:00.000Z', '90'],
      ['2026-09-02T00:00:00.000Z', '115'],
      ['2026-09-02T01:00:00.000Z', '120'],
    ])
    expect(merged.coveredStartTime.toISOString()).toBe('2026-09-01T00:00:00.000Z')
    expect(merged.coveredEndTime.toISOString()).toBe('2026-09-03T00:00:00.000Z')
    expect(merged.reachedEarliest).toBe(false)
  })

  it('左邊接上來的一天一根都沒有：可能只是休市，還不算到底，記下空了多久', () => {
    const merged = new KCandleChartMergeDomain(LOADED,
      chartOf('2026-09-01T00:00:00.000Z', '2026-09-02T00:00:00.000Z', [])).toDto()

    expect(merged.reachedEarliest).toBe(false)
    expect(merged.emptyEarlierSpanMilliseconds).toBe(DAY)
    expect(merged.count).toBe(2)
  })

  it.each([
    ['接連空了十三天又空一天：滿兩週，到底了', 13, true],
    ['接連空了十二天又空一天：還不到兩週', 12, false],
  ])('%s', (_case, emptyDaysBefore, expected) => {
    const loaded = chartOf('2026-09-02T00:00:00.000Z', '2026-09-03T00:00:00.000Z',
      [['2026-09-02T00:00:00.000Z', '110']], { emptyEarlierDays: emptyDaysBefore })

    const merged = new KCandleChartMergeDomain(loaded,
      chartOf('2026-09-01T00:00:00.000Z', '2026-09-02T00:00:00.000Z', [])).toDto()

    expect(merged.reachedEarliest).toBe(expected)
  })

  it('左邊接到了東西：空了多久歸零', () => {
    const loaded = chartOf('2026-09-02T00:00:00.000Z', '2026-09-03T00:00:00.000Z',
      [['2026-09-02T00:00:00.000Z', '110']], { emptyEarlierDays: 5 })

    const merged = new KCandleChartMergeDomain(loaded, chartOf(
      '2026-09-01T00:00:00.000Z', '2026-09-02T00:00:00.000Z', [['2026-09-01T09:00:00.000Z', '100']])).toDto()

    expect(merged.emptyEarlierSpanMilliseconds).toBe(0)
  })

  it('往右接上一段：左邊空了多久不變', () => {
    const loaded = chartOf('2026-09-02T00:00:00.000Z', '2026-09-03T00:00:00.000Z',
      [['2026-09-02T00:00:00.000Z', '110']], { emptyEarlierDays: 5 })

    const merged = new KCandleChartMergeDomain(loaded,
      chartOf('2026-09-03T00:00:00.000Z', '2026-09-04T00:00:00.000Z', [])).toDto()

    expect(merged.emptyEarlierSpanMilliseconds).toBe(5 * DAY)
  })

  it('右邊接上來的一根都沒有：左邊到底了沒有不受影響', () => {
    const merged = new KCandleChartMergeDomain(LOADED,
      chartOf('2026-09-03T00:00:00.000Z', '2026-09-04T00:00:00.000Z', [])).toDto()

    expect(merged.reachedEarliest).toBe(false)
    expect(merged.coveredEndTime.toISOString()).toBe('2026-09-04T00:00:00.000Z')
  })

  it('已經到底的那一頭，接上右邊之後仍然是到底的', () => {
    const reached = chartOf('2026-09-02T00:00:00.000Z', '2026-09-03T00:00:00.000Z', [], { reachedEarliest: true })

    expect(new KCandleChartMergeDomain(reached,
      chartOf('2026-09-03T00:00:00.000Z', '2026-09-04T00:00:00.000Z', [['2026-09-03T00:00:00.000Z', '1']])).toDto().reachedEarliest)
      .toBe(true)
  })

  it.each([
    ['右邊接上來的帶著較新的合約價：用它的', '2026-09-03T00:00:00.000Z', '2026-09-04T00:00:00.000Z', pricesAt('300'), '300'],
    ['右邊接上來的沒有合約價：留著手上的', '2026-09-03T00:00:00.000Z', '2026-09-04T00:00:00.000Z', null, '200'],
    ['左邊接上來的比較舊：留著手上的', '2026-09-01T00:00:00.000Z', '2026-09-02T00:00:00.000Z', pricesAt('100'), '200'],
  ])('%s', (_case, start, end, prices, expectedMark) => {
    const merged = new KCandleChartMergeDomain(LOADED, chartOf(start, end, [], { latestContractPrices: prices })).toDto()

    expect(merged.latestContractPrices?.markPrice.toString()).toBe(expectedMark)
  })
})
