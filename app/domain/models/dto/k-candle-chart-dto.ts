import type { AggregationIntervalVo } from '~/domain/models/vo/aggregation-interval-vo'
import type { KCandleDto } from '~/domain/models/dto/k-candle-dto'

/**
 * DTO：圖表這一次要畫的東西，也是畫面拿得到的唯一形狀。
 *
 * coveredStartTime / coveredEndTime 是這批資料涵蓋的範圍——比使用者正在看的那一段更寬，
 * 因為取的時候兩側各多取了半段。下次使用者小幅拖動時，就是靠它判斷不必重新取。
 */
export class KCandleChartDto {
  constructor(
    public readonly symbol: string,
    public readonly interval: AggregationIntervalVo,
    public readonly coveredStartTime: Date,
    public readonly coveredEndTime: Date,
    public readonly kCandles: KCandleDto[],
  ) {}

  get count(): number {
    return this.kCandles.length
  }

  /**
   * 當初取這一批時，使用者正在看的那一段有多長（毫秒）。
   *
   * 不必另外記下來：取的時候兩側各多取半段，所以涵蓋範圍恰好是當初顯示區間的兩倍。
   * 那個關係寫在這裡而不是問的人身上——涵蓋範圍是這一批自己的事，
   * 讓外面去減它的兩個端點再除以二，就是把一批資料的內部關係搬到別人家裡。
   */
  get visibleSpanMilliseconds(): number {
    return (this.coveredEndTime.getTime() - this.coveredStartTime.getTime()) / 2
  }

  get isEmpty(): boolean {
    return this.kCandles.length === 0
  }

  /**
   * 最新那一根是幾點開始的。空的時候是 `null`——與 `isEmpty` 是同一件事的兩種問法。
   * 它是判斷「使用者看的是不是現在」的另一半資料。
   */
  get latestKCandleOpenTime(): Date | null {
    return this.kCandles[this.kCandles.length - 1]?.openTime ?? null
  }
}
