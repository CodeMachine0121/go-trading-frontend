import Decimal from 'decimal.js'
import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import { ChartDrawingAnchorDto } from '~/domain/models/dto/chart-drawing-anchor-dto'

const MILLISECONDS_PER_MINUTE = 60_000

/**
 * Domain Model：一張圖上「第幾根」與「哪一刻」互換。
 *
 * 繪圖錨在時間上、畫在第幾根上，兩邊要互相說得通：
 *
 * - **資料裡的那幾根**：第幾根就是那一根的起始時間。
 * - **最新那一根之後**：以這張圖的彙總刻度往後推——那裡還沒有 K 線，
 *   但「之後會出現的那一根」的起始時間是說得出來的。
 * - **最早那一根之前**：同樣往前推，所以畫在已取回區間之前的點不會被收到最早那一根。
 */
export class KCandleTimelineDomain {
  private readonly openTimes: readonly number[]
  private readonly intervalMilliseconds: number

  constructor(private readonly kCandleChartDto: KCandleChartDto) {
    this.openTimes = kCandleChartDto.kCandles.map(kCandle => kCandle.openTime.getTime())
    this.intervalMilliseconds = kCandleChartDto.interval.minutes * MILLISECONDS_PER_MINUTE
  }

  /** 第幾根（整數）的起始時間。 */
  openTimeAt(logicalIndex: number): Date {
    // 一根都沒有的圖沒有任何一刻可以當基準：以時間原點當第 0 根，只求不壞。
    if (this.openTimes.length === 0) {
      return new Date(logicalIndex * this.intervalMilliseconds)
    }

    const lastIndex = this.openTimes.length - 1
    const firstOpenTime = this.openTimes[0] ?? 0
    const lastOpenTime = this.openTimes[lastIndex] ?? 0

    if (logicalIndex < 0) {
      return new Date(firstOpenTime + logicalIndex * this.intervalMilliseconds)
    }
    if (logicalIndex > lastIndex) {
      return new Date(lastOpenTime + (logicalIndex - lastIndex) * this.intervalMilliseconds)
    }

    return new Date(this.openTimes[logicalIndex] ?? lastOpenTime)
  }

  /**
   * 某一刻落在第幾根上。
   *
   * 資料範圍內取**涵蓋它的那一根**（起始時間不晚於它、且它還沒收完），
   * 所以五分鐘圖上畫的點換到一小時圖時，落在包含它的那一小時上。
   * 落在兩根之間沒有交易的空檔（例如收盤後）時，對到之後那一根——那是空檔之後第一個有價的地方。
   */
  logicalIndexOf(openTime: Date): number {
    const time = openTime.getTime()
    const lastIndex = this.openTimes.length - 1
    const firstOpenTime = this.openTimes[0] ?? 0
    const lastOpenTime = this.openTimes[lastIndex] ?? 0

    if (lastIndex < 0 || time < firstOpenTime) {
      return -Math.ceil((firstOpenTime - time) / this.intervalMilliseconds)
    }
    if (time >= lastOpenTime) {
      return lastIndex + Math.floor((time - lastOpenTime) / this.intervalMilliseconds)
    }

    const containingIndex = this.containingIndexOf(time)
    const containingOpenTime = this.openTimes[containingIndex] ?? firstOpenTime

    return time < containingOpenTime + this.intervalMilliseconds ? containingIndex : containingIndex + 1
  }

  /**
   * 某一刻落在第幾根的**哪個位置**：涵蓋它的那一根，加上它在那一根裡走了幾成。
   * 奇異筆的點不對齊到整根，換刻度、縮放之後才仍畫在原本那一刻。
   * 落在休市空檔時與 `logicalIndexOf` 一樣對到之後那一根。
   */
  fractionalLogicalIndexOf(time: Date): number {
    const milliseconds = time.getTime()
    const lastIndex = this.openTimes.length - 1
    const firstOpenTime = this.openTimes[0] ?? 0
    const lastOpenTime = this.openTimes[lastIndex] ?? 0

    if (lastIndex < 0 || milliseconds < firstOpenTime) {
      return (milliseconds - firstOpenTime) / this.intervalMilliseconds
    }
    if (milliseconds >= lastOpenTime) {
      return lastIndex + (milliseconds - lastOpenTime) / this.intervalMilliseconds
    }

    const containingIndex = this.containingIndexOf(milliseconds)
    const offsetWithinKCandle = milliseconds - (this.openTimes[containingIndex] ?? firstOpenTime)

    return offsetWithinKCandle < this.intervalMilliseconds
      ? containingIndex + offsetWithinKCandle / this.intervalMilliseconds
      : containingIndex + 1
  }

  /** 奇異筆的一個點：第幾根的哪個位置換成那一刻，價格原樣——不對齊、不吸磁鐵。 */
  freehandAnchor(logicalIndex: number, price: Decimal): ChartDrawingAnchorDto {
    const kCandleIndex = Math.floor(logicalIndex)
    const offsetWithinKCandle = Math.round((logicalIndex - kCandleIndex) * this.intervalMilliseconds)

    return new ChartDrawingAnchorDto(
      new Date(this.openTimeAt(kCandleIndex).getTime() + offsetWithinKCandle), price, logicalIndex)
  }

  /**
   * 把指標所在的位置對齊成一個錨點：時間對齊到最近的那一根；
   * 開著磁鐵模式且那裡真的有一根時，價格吸到那一根開高低收裡最接近的那一個。
   * 右側留白裡沒有 K 線，所以不吸。
   */
  alignAnchor(logicalIndex: number, price: Decimal, magnet: boolean): ChartDrawingAnchorDto {
    const alignedIndex = Math.round(logicalIndex)
    const kCandle = this.kCandleChartDto.kCandles[alignedIndex]

    const alignedPrice = magnet && kCandle !== undefined
      ? [kCandle.open, kCandle.high, kCandle.low, kCandle.close].reduce((nearest, candidate) =>
          candidate.minus(price).abs().lessThan(nearest.minus(price).abs()) ? candidate : nearest)
      : price

    return new ChartDrawingAnchorDto(this.openTimeAt(alignedIndex), new Decimal(alignedPrice), alignedIndex)
  }

  /**
   * 把一個錨點平移幾根：落到那一根上，並保留它原本在自己那一根裡的哪個時刻。
   *
   * 細刻度畫的點（五分鐘圖上的 10:05）在粗刻度上只是「10:00 那一根裡的某一刻」；
   * 平移之後若直接對齊到那一根的起始時間，那五分鐘就悄悄不見了，換回細刻度時點會跑掉。
   * 一根都沒平移時時間原樣不動。
   */
  shiftedAnchor(openTime: Date, kCandleShift: number, price: Decimal): ChartDrawingAnchorDto {
    const logicalIndex = this.logicalIndexOf(openTime)
    const offsetWithinKCandle = openTime.getTime() - this.openTimeAt(logicalIndex).getTime()
    const shiftedIndex = logicalIndex + kCandleShift

    return new ChartDrawingAnchorDto(
      new Date(this.openTimeAt(shiftedIndex).getTime() + offsetWithinKCandle), price, shiftedIndex)
  }

  /** 起始時間不晚於這一刻的最後一根；呼叫端保證它落在第一根與最後一根之間。 */
  private containingIndexOf(time: number): number {
    let low = 0
    let high = this.openTimes.length - 1
    while (low < high) {
      const middle = Math.ceil((low + high) / 2)
      if ((this.openTimes[middle] ?? 0) <= time) {
        low = middle
      }
      else {
        high = middle - 1
      }
    }

    return low
  }
}
