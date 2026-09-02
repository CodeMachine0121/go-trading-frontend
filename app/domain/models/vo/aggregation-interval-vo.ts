/** 五種可選的彙總刻度，與後端同名。 */
export type AggregationIntervalValue = '5m' | '15m' | '1h' | '4h' | '1d'

/**
 * VO：一種彙總刻度——圖表上一根 K 線涵蓋多久。不可變、無行為。
 *
 * 使用者不直接選它：它是「正在看的區間有多長」推出來的結果，
 * 推法住在 KCandleChartViewportDomain，不在這裡。
 */
export class AggregationIntervalVo {
  constructor(
    public readonly value: AggregationIntervalValue,
    public readonly label: string,
    public readonly minutes: number,
  ) {}
}

/**
 * 可選的彙總刻度，**由細到粗**。
 *
 * 順序是規則的一部分——挑刻度就是從頭走過這條清單、取第一個夠粗的，
 * 所以多支援一種刻度就是在這裡多一列（前提是後端也認得同一個代號）。
 */
export const AGGREGATION_INTERVALS: AggregationIntervalVo[] = [
  new AggregationIntervalVo('5m', '五分鐘', 5),
  new AggregationIntervalVo('15m', '十五分鐘', 15),
  new AggregationIntervalVo('1h', '一小時', 60),
  new AggregationIntervalVo('4h', '四小時', 240),
  new AggregationIntervalVo('1d', '一天', 24 * 60),
]

/** 最粗的那一種。拉遠拉到連它都擺不下時，就是不能再遠了。 */
export const COARSEST_AGGREGATION_INTERVAL
  = AGGREGATION_INTERVALS[AGGREGATION_INTERVALS.length - 1]
