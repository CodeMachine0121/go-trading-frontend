import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import Decimal from 'decimal.js'
import { ChartReadoutDto } from '~/domain/models/dto/chart-readout-dto'

const MILLISECONDS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const SECONDS_PER_HOUR = 3600

/** 成交量的單位，由大到小；未滿最小的那一個就寫原數。 */
const VOLUME_UNITS: readonly [Decimal, string][] = [
  [new Decimal('1e9'), 'B'],
  [new Decimal('1e6'), 'M'],
  [new Decimal('1e3'), 'K'],
]

/**
 * Domain Model：圖例要說的那一根，與最新那一根的收盤倒數。
 *
 * **漲跌相對前一根的收盤**，不是這一根自己的開盤：看盤的人問的是「這一根收完比上一根多了多少」，
 * 那才是 TradingView 圖例上的那個數。只有第一根沒有前一根，才退回相對它自己的開盤。
 */
export class ChartReadoutDomain {
  constructor(
    private readonly kCandleChartDto: KCandleChartDto,
    /** 十字線所在的第幾根；不在圖上時是 `null`。 */
    private readonly hoveredIndex: number | null,
    private readonly now: Date,
  ) {}

  /** 一根都沒有時沒有東西可說。 */
  toDto(): ChartReadoutDto | null {
    const kCandles = this.kCandleChartDto.kCandles
    const latest = kCandles.at(-1)
    if (latest === undefined) {
      return null
    }

    // 十字線在右側留白或已取回區間之外時，那裡沒有 K 線——說最新那一根。
    const hoveredIndex = this.hoveredIndex
    const index = hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < kCandles.length
      ? hoveredIndex
      : kCandles.length - 1
    const kCandle = kCandles[index] ?? latest

    const reference = kCandles[index - 1]?.close ?? kCandle.open
    const change = kCandle.close.minus(reference)
    const changePercentText = reference.isZero() ? null : change.dividedBy(reference).times(100).toFixed(2)
    const tone = change.isZero() ? 'neutral' : change.isNegative() ? 'danger' : 'success'

    // 最新那一根還有多久收完：一小時以上說時分秒，以下說分秒；已經收完時沒有倒數。
    const closesAt = latest.openTime.getTime()
      + this.kCandleChartDto.interval.minutes * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND
    const remainingSeconds = Math.ceil((closesAt - this.now.getTime()) / MILLISECONDS_PER_SECOND)
    const [hours, minutes, seconds] = [
      Math.floor(remainingSeconds / SECONDS_PER_HOUR),
      Math.floor((remainingSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE),
      remainingSeconds % SECONDS_PER_MINUTE,
    ].map(value => String(value).padStart(2, '0'))
    const countdown = remainingSeconds <= 0
      ? null
      : remainingSeconds >= SECONDS_PER_HOUR ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`

    const volumeUnit = VOLUME_UNITS.find(([size]) => kCandle.volume.greaterThanOrEqualTo(size))
    const volumeText = volumeUnit === undefined
      ? kCandle.volume.toDecimalPlaces(2).toString()
      : `${kCandle.volume.dividedBy(volumeUnit[0]).toFixed(2)}${volumeUnit[1]}`

    return new ChartReadoutDto(kCandle, change, changePercentText, tone, countdown, volumeText)
  }
}
