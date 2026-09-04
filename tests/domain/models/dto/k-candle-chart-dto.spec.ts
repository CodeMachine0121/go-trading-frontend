import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import { KCandle } from '~/domain/models/entities/k-candle'
import { AGGREGATION_INTERVALS } from '~/domain/models/vo/aggregation-interval-vo'

function chartOf(openTimes: string[]): KCandleChartDto {
  const interval = AGGREGATION_INTERVALS[0]
  if (interval === undefined) {
    throw new Error('沒有任何彙總刻度')
  }

  return new KCandleChartDto(
    'BTCUSDT',
    interval,
    new Date('2026-09-03T00:00:00.000Z'),
    new Date('2026-09-03T23:59:00.000Z'),
    openTimes.map(openTime => new KCandle(
      'BTCUSDT', new Date(openTime),
      new Decimal('100'), new Decimal('120'), new Decimal('90'), new Decimal('110'),
      new Decimal('1'), new Decimal('1'), new Decimal('1'), new Decimal('1'),
    ).toDomain().toDto()),
  )
}

describe('這批 K 線裡最新那一根是幾點開始的', () => {
  it('是最後那一根的起始時間，不是第一根的', () => {
    // 它是判斷「使用者看的是不是現在」的另一半資料，拿錯一根就會答錯。
    const chart = chartOf(['2026-09-03T09:30:00.000Z', '2026-09-03T11:55:00.000Z'])

    expect(chart.latestKCandleOpenTime).toEqual(new Date('2026-09-03T11:55:00.000Z'))
  })

  it('一根都沒有時是「沒有」，與這批是空的是同一件事', () => {
    const chart = chartOf([])

    expect(chart.latestKCandleOpenTime).toBeNull()
    expect(chart.isEmpty).toBe(true)
  })
})
