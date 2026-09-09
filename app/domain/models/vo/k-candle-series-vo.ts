import type { AggregationIntervalVo } from '~/domain/models/vo/aggregation-interval-vo'
import type { KCandle } from '~/domain/models/entities/k-candle'

/**
 * VO：一次取回的成果——那批 K 線，以及**系統說它用了哪一種刻度**。不可變、無行為。
 *
 * 兩者一起回來，是因為它們只有配成一對才說得出一句完整的話：
 * 同一段時間以兩種刻度取回，會得到兩批都正確、卻完全不同的 K 線。
 * 拆成兩個回傳值，每個呼叫端就得自己記得把它們配好——而漏配的症狀是
 * 一張畫得很正常、但每根其實不是那麼長的圖。
 *
 * 刻度**只能**從這裡進到 domain。圖表這一側不推導它、也不指定它。
 */
export class KCandleSeriesVo {
  constructor(
    public readonly kCandles: KCandle[],
    public readonly interval: AggregationIntervalVo,
  ) {}
}
