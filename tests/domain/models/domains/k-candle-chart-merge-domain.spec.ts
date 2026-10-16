import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { KCandleChartMergeDomain } from '~/domain/models/domains/k-candle-chart-merge-domain'
import { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import { KCandleContractPricesDto } from '~/domain/models/dto/k-candle-contract-prices-dto'
import { KCandle } from '~/domain/models/entities/k-candle'
import { DEFAULT_AGGREGATION_INTERVAL_CHOICE } from '../../../fixtures/aggregation-interval-choice'
import { aggregationIntervalNamed } from '../../../fixtures/aggregation-interval'

function pricesAt(mark: string): KCandleContractPricesDto {
  return new KCandleContractPricesDto(new Decimal(mark), null, null, new Date('2026-09-01T00:00:00.000Z'))
}

/** 只給會影響結果的：涵蓋範圍、那幾根的起始時間與收盤價、合約價、到底了沒有。 */
function chartOf(
  coveredStartTime: string, coveredEndTime: string, kCandles: [string, string][],
  { latestContractPrices = null, reachedEarliest = false }:
  { latestContractPrices?: KCandleContractPricesDto | null, reachedEarliest?: boolean } = {},
): KCandleChartDto {
  return new KCandleChartDto(
    'BTCUSDT', aggregationIntervalNamed('1h'),
    new Date(coveredStartTime), new Date(coveredEndTime),
    kCandles.map(([openTime, close]) => new KCandle(
      'BTCUSDT', new Date(openTime), new Decimal('100'), new Decimal('100'), new Decimal('100'), new Decimal(close),
      new Decimal('1'), new Decimal('1'), new Decimal('1'), new Decimal('1')).toDomain().toDto()),
    DEFAULT_AGGREGATION_INTERVAL_CHOICE, latestContractPrices, reachedEarliest)
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

  it('左邊接上來的一根都沒有：那一頭到底了', () => {
    const merged = new KCandleChartMergeDomain(LOADED,
      chartOf('2026-09-01T00:00:00.000Z', '2026-09-02T00:00:00.000Z', [])).toDto()

    expect(merged.reachedEarliest).toBe(true)
    expect(merged.count).toBe(2)
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
