/** 六種可選的彙總刻度，與後端同名。 */
export type AggregationIntervalValue = '1m' | '5m' | '15m' | '1h' | '4h' | '1d'

/**
 * VO：一種彙總刻度——一根 K 線涵蓋多久。不可變、無行為。
 *
 * 圖表不挑它：圖上一律畫最細的那一種，也就是後端存下來的一分鐘。
 * 會挑的是指標計算，那裡由使用者自己指定。
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
 * 順序是規則的一部分——「最細的那一種」是從頭讀出來的，指標計算的選單也照這個序排，
 * 所以多支援一種刻度就是在這裡多一列（前提是後端也認得同一個代號）。
 */
export const AGGREGATION_INTERVALS: AggregationIntervalVo[] = [
  new AggregationIntervalVo('1m', '一分鐘', 1),
  new AggregationIntervalVo('5m', '五分鐘', 5),
  new AggregationIntervalVo('15m', '十五分鐘', 15),
  new AggregationIntervalVo('1h', '一小時', 60),
  new AggregationIntervalVo('4h', '四小時', 240),
  new AggregationIntervalVo('1d', '一天', 24 * 60),
]

/**
 * 最細的那一種，也是任何地方「沒特別指定」時的意思——它剛好等於一根 K 線本來的長度，
 * 所以以它彙總等於不彙總。名字寫在這裡，用到的地方就不必各自記得「第一個就是預設」。
 */
export const FINEST_AGGREGATION_INTERVAL = AGGREGATION_INTERVALS[0]
