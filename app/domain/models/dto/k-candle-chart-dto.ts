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

  get isEmpty(): boolean {
    return this.kCandles.length === 0
  }
}
