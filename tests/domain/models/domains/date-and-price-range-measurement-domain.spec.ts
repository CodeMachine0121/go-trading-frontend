import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { DateAndPriceRangeMeasurementDomain } from '~/domain/models/domains/date-and-price-range-measurement-domain'
import { ChartDrawingAnchorDto } from '~/domain/models/dto/chart-drawing-anchor-dto'
import { KCandleSpec, kCandleChartOf } from '../../../fixtures/k-candle-chart'

/** 二十五根一小時 K 線，每根量 2，序位 0 到 24。 */
const HOURS = kCandleChartOf('1h', Array.from({ length: 25 }, (_, hour) => new KCandleSpec(
  new Date(Date.UTC(2026, 9, 15, hour)).toISOString(), '100', '100', '100', '100', '2')))

function anchorAt(logicalIndex: number, price: string): ChartDrawingAnchorDto {
  return new ChartDrawingAnchorDto(new Date(Date.UTC(2026, 9, 15, logicalIndex)), new Decimal(price), logicalIndex)
}

function measure(first: ChartDrawingAnchorDto, second: ChartDrawingAnchorDto) {
  return new DateAndPriceRangeMeasurementDomain(first, second, HOURS.kCandles).toDto()
}

describe('DateAndPriceRangeMeasurementDomain', () => {
  it('從 100 量到 110、跨 24 根一小時：價差 10、10.00%、24 根、1 天、量是那 25 根的合計，往上', () => {
    const measurement = measure(anchorAt(0, '100'), anchorAt(24, '110'))

    expect(measurement.priceDifference.toString()).toBe('10')
    expect(measurement.percentText).toBe('10.00')
    expect(measurement.kCandleCount).toBe(24)
    expect(measurement.duration.traditionalChinese).toBe('1天')
    expect(measurement.volume.toString()).toBe('50')
    expect(measurement.rising).toBe(true)
  })

  it('從 110 量到 99：負的價差與負的百分比，往下', () => {
    const measurement = measure(anchorAt(0, '110'), anchorAt(3, '99'))

    expect(measurement.priceDifference.toString()).toBe('-11')
    expect(measurement.percentText).toBe('-10.00')
    expect(measurement.duration.traditionalChinese).toBe('3小時')
    expect(measurement.rising).toBe(false)
  })

  it('兩點在同一根上：0 根、經過 0 分', () => {
    const measurement = measure(anchorAt(5, '100'), anchorAt(5, '100'))

    expect(measurement.kCandleCount).toBe(0)
    expect(measurement.duration.traditionalChinese).toBe('0分')
    expect(measurement.duration.english).toBe('0m')
  })

  it('跨天又跨小時又有零頭的分：依天、小時、分說', () => {
    const first = new ChartDrawingAnchorDto(new Date('2026-10-15T00:00:00.000Z'), new Decimal('100'), 0)
    const second = new ChartDrawingAnchorDto(new Date('2026-10-16T02:05:00.000Z'), new Decimal('100'), 26)

    expect(measure(first, second).duration.traditionalChinese).toBe('1天 2小時 5分')
  })

  it('第一點價格為零時算不出百分比', () => {
    expect(measure(anchorAt(0, '0'), anchorAt(1, '5')).percentText).toBeNull()
  })

  it('落在還沒取回或還沒發生的那幾根上：只加手上有的', () => {
    expect(measure(anchorAt(23, '100'), anchorAt(30, '100')).volume.toString()).toBe('4')
  })
})
