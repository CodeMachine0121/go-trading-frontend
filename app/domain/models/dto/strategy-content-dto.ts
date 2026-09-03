import type { IndicatorResultType } from '~/domain/models/vo/indicator-result-type'
import type { AggregationIntervalValue } from '~/domain/models/vo/aggregation-interval-vo'

/**
 * DTO：一支策略記著的四樣東西——算式內容、指標值種類、彙總刻度、計算根數。
 *
 * **這四樣只有這一種形狀。** 它同時是「載入時帶進畫面的東西」、「儲存時送出去的東西」、
 * 以及「拿來比對有沒有被改過的東西」。四處各自定義一份就有四份會漂移的複本，
 * 而「有沒有改過」一旦漏比一個欄位，使用者寫的東西就會被靜靜蓋掉。
 *
 * **不含交易標的**——同一支策略要能套用在不同市場上，市場是計算當下才指定的。
 */
export class StrategyContentDto {
  constructor(
    public readonly scriptBody: string,
    public readonly resultType: IndicatorResultType,
    public readonly aggregationInterval: AggregationIntervalValue,
    public readonly candleCount: number,
  ) {}
}
