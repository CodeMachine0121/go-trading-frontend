import Decimal from 'decimal.js'
import type { ChartDrawingAnchorDto } from '~/domain/models/dto/chart-drawing-anchor-dto'
import type { KCandleDto } from '~/domain/models/dto/k-candle-dto'
import { DateAndPriceRangeMeasurementDto } from '~/domain/models/dto/date-and-price-range-measurement-dto'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { DRAWING_BLUE_TOKEN, DRAWING_RED_TOKEN } from '~/domain/models/vo/chart-drawing-color-vo'

const MINUTES_PER_HOUR = 60
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR

/**
 * Domain Model：日期與價格範圍量出來的那幾個數。
 *
 * - 價差＝第二點－第一點；百分比相對第一點，取到小數兩位。
 * - 根數是兩點相隔幾根，同一根上是零。
 * - 成交量是兩點之間（含兩端）**手上有的那幾根**的合計——還沒取回或還沒發生的那幾根沒有量可加。
 */
export class DateAndPriceRangeMeasurementDomain {
  constructor(
    private readonly firstAnchor: ChartDrawingAnchorDto,
    private readonly secondAnchor: ChartDrawingAnchorDto,
    private readonly kCandles: readonly KCandleDto[],
  ) {}

  toDto(): DateAndPriceRangeMeasurementDto {
    const priceDifference = this.secondAnchor.price.minus(this.firstAnchor.price)
    const percentText = this.firstAnchor.price.isZero()
      ? null
      : priceDifference.dividedBy(this.firstAnchor.price).times(100).toFixed(2)

    const fromIndex = Math.min(this.firstAnchor.logicalIndex, this.secondAnchor.logicalIndex)
    const toIndex = Math.max(this.firstAnchor.logicalIndex, this.secondAnchor.logicalIndex)
    const volume = this.kCandles
      .slice(Math.max(fromIndex, 0), Math.max(toIndex + 1, 0))
      .reduce((total, kCandle) => total.plus(kCandle.volume), new Decimal(0))

    const totalMinutes = Math.round(
      Math.abs(this.secondAnchor.openTime.getTime() - this.firstAnchor.openTime.getTime()) / 60_000)
    const days = Math.floor(totalMinutes / MINUTES_PER_DAY)
    const hours = Math.floor((totalMinutes % MINUTES_PER_DAY) / MINUTES_PER_HOUR)
    const minutes = totalMinutes % MINUTES_PER_HOUR
    const parts = [
      days > 0 ? new LocalizedTextVo(`${days}天`, `${days}d`) : null,
      hours > 0 ? new LocalizedTextVo(`${hours}小時`, `${hours}h`) : null,
      minutes > 0 ? new LocalizedTextVo(`${minutes}分`, `${minutes}m`) : null,
    ]
    const duration = totalMinutes === 0
      ? new LocalizedTextVo('0分', '0m')
      : new LocalizedTextVo(' ', ' ').join(parts)

    const rising = !priceDifference.isNegative()

    return new DateAndPriceRangeMeasurementDto(
      priceDifference, percentText, toIndex - fromIndex, duration, volume, rising,
      rising ? DRAWING_BLUE_TOKEN : DRAWING_RED_TOKEN)
  }
}
