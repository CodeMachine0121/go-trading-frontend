import type Decimal from 'decimal.js'
import { KCandle } from '~/domain/models/entities/k-candle'
import type { LiveKCandleUpdate } from '~/domain/models/entities/live-k-candle-update'
import { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import type { KCandleDto } from '~/domain/models/dto/k-candle-dto'

const MILLISECONDS_PER_MINUTE = 60 * 1000

/**
 * Domain Model：圖上那批 K 線，加上市場正在發生的事。
 *
 * 市場送來的一律是五分鐘一根，而畫面可能正在看一小時一根，所以每一根即時 K 線
 * 都要歸到它所屬的那一格；歸不到既有的那一格時，圖上就多一根。
 *
 * **「同一根反覆更新不重複累加成交量」由結構保證，不靠呼叫端記帳。**
 * 它持有的是「五分鐘那一根的起始時間 → 那一根最新的樣子」的對照表，
 * 而不是一個累加中的數字：同一根再送一次是**取代**那一筆，不是加上去。
 * 重複累加因此在結構上不可能發生。
 */
export class LiveKCandleChartDomain {
  constructor(
    private readonly chart: KCandleChartDto,
    private readonly liveKCandles: ReadonlyMap<number, KCandle> = new Map(),
  ) {}

  /**
   * 收下一則更新，回傳併入之後的新的一份。
   *
   * 不改自己——一份圖被誰看到就是那個樣子，換一份是換一個實例。
   * 沒有 K 線可談的那一則（即時已停止）與不屬於這張圖的交易標的一律原樣退回：
   * 它們要說的事不在這張圖上。
   */
  applying(update: LiveKCandleUpdate): LiveKCandleChartDomain {
    if (update.kCandle === null || update.symbol !== this.chart.symbol) {
      return this
    }

    const merged = new Map(this.liveKCandles)
    merged.set(update.kCandle.openTime.getTime(), update.kCandle)

    return new LiveKCandleChartDomain(this.chart, merged)
  }

  /** 併好之後這張圖的樣子，也是畫面拿得到的唯一形狀。 */
  toChartDto(): KCandleChartDto {
    if (this.liveKCandles.size === 0) {
      return this.chart
    }

    const byBucketStart = new Map<number, KCandleDto>()
    for (const kCandleDto of this.chart.kCandles) {
      byBucketStart.set(kCandleDto.openTime.getTime(), kCandleDto)
    }

    for (const [openTimeMilliseconds, liveKCandle] of this.sortedLiveKCandles()) {
      const bucketStart = this.bucketStartOf(openTimeMilliseconds)
      const bucket = byBucketStart.get(bucketStart)

      byBucketStart.set(bucketStart, bucket === undefined
        ? this.openedBucket(bucketStart, liveKCandle)
        : this.widenedBucket(bucket, liveKCandle))
    }

    return new KCandleChartDto(
      this.chart.symbol,
      this.chart.interval,
      this.chart.coveredStartTime,
      this.chart.coveredEndTime,
      [...byBucketStart.values()].sort(
        (earlier, later) => earlier.openTime.getTime() - later.openTime.getTime()),
    )
  }

  /**
   * 由早到晚，因為收盤價取的是最晚那一根的——依序套用，最後留下的自然就是它。
   * 開盤價同理留下最早那一根的。
   */
  private sortedLiveKCandles(): [number, KCandle][] {
    return [...this.liveKCandles.entries()].sort(
      ([earlier], [later]) => earlier - later)
  }

  /** 一根五分鐘 K 線屬於哪一格，由畫面正在看的彙總刻度決定。 */
  private bucketStartOf(openTimeMilliseconds: number): number {
    const bucketMilliseconds = this.chart.interval.minutes * MILLISECONDS_PER_MINUTE

    return Math.floor(openTimeMilliseconds / bucketMilliseconds) * bucketMilliseconds
  }

  /** 這一格圖上還沒有：這根即時 K 線就是它的全部，只是起始時間對齊到格子的起點。 */
  private openedBucket(bucketStart: number, liveKCandle: KCandle): KCandleDto {
    return new KCandle(
      liveKCandle.symbol,
      new Date(bucketStart),
      liveKCandle.open,
      liveKCandle.high,
      liveKCandle.low,
      liveKCandle.close,
      liveKCandle.volume,
      liveKCandle.quoteVolume,
      liveKCandle.takerBuyBaseVolume,
      liveKCandle.takerBuyQuoteVolume,
    ).toDomain().toDto()
  }

  /**
   * 這一格圖上已經有：最高取較高、最低取較低、收盤換成這一根的、成交量加上這一根。
   * 開盤價不動——它是這一格最早那一筆成交，即時更新永遠比它晚。
   */
  private widenedBucket(bucket: KCandleDto, liveKCandle: KCandle): KCandleDto {
    return new KCandle(
      bucket.symbol,
      bucket.openTime,
      bucket.open,
      this.higher(bucket.high, liveKCandle.high),
      this.lower(bucket.low, liveKCandle.low),
      liveKCandle.close,
      bucket.volume.plus(liveKCandle.volume),
      bucket.quoteVolume.plus(liveKCandle.quoteVolume),
      bucket.takerBuyBaseVolume.plus(liveKCandle.takerBuyBaseVolume),
      bucket.takerBuyQuoteVolume.plus(liveKCandle.takerBuyQuoteVolume),
    ).toDomain().toDto()
  }

  private higher(left: Decimal, right: Decimal): Decimal {
    return left.greaterThan(right) ? left : right
  }

  private lower(left: Decimal, right: Decimal): Decimal {
    return left.lessThan(right) ? left : right
  }
}
