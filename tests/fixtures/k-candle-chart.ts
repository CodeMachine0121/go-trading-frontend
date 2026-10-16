import Decimal from 'decimal.js'
import { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import { KCandle } from '~/domain/models/entities/k-candle'
import { DEFAULT_AGGREGATION_INTERVAL_CHOICE } from './aggregation-interval-choice'
import { aggregationIntervalNamed } from './aggregation-interval'

/** 一根 K 線要的那幾個價；沒說的都是 100、量是 1。 */
export class KCandleSpec {
  constructor(
    public readonly openTime: string,
    public readonly open = '100',
    public readonly high = '100',
    public readonly low = '100',
    public readonly close = '100',
    public readonly volume = '1',
  ) {}
}

/** 一張圖：指定彙總刻度與那幾根。 */
export function kCandleChartOf(intervalValue: string, kCandleSpecs: readonly KCandleSpec[]): KCandleChartDto {
  return new KCandleChartDto(
    'BTCUSDT',
    aggregationIntervalNamed(intervalValue),
    new Date(kCandleSpecs[0]?.openTime ?? '2026-10-16T00:00:00.000Z'),
    new Date(kCandleSpecs.at(-1)?.openTime ?? '2026-10-16T00:00:00.000Z'),
    kCandleSpecs.map(spec => new KCandle(
      'BTCUSDT', new Date(spec.openTime),
      new Decimal(spec.open), new Decimal(spec.high), new Decimal(spec.low), new Decimal(spec.close),
      new Decimal(spec.volume), new Decimal('1'), new Decimal('1'), new Decimal('1'),
    ).toDomain().toDto()),
    DEFAULT_AGGREGATION_INTERVAL_CHOICE,
  )
}
