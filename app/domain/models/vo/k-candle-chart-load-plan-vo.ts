import type { AggregationIntervalVo } from '~/domain/models/vo/aggregation-interval-vo'

/**
 * VO：對照過「正在看哪一段」與「手上有什麼」之後得出的結論。不可變、無行為。
 *
 * 它同時就是取資料時要帶的條件，所以不可能發生「判斷說不用取、卻還是取了」——
 * 要取什麼跟要不要取是同一個物件回答的。
 * needsReload 為否時其餘欄位仍然填著，只是沒有人會拿去用。
 */
export class KCandleChartLoadPlanVo {
  constructor(
    public readonly needsReload: boolean,
    public readonly symbol: string,
    public readonly interval: AggregationIntervalVo,
    public readonly startTime: Date,
    public readonly endTime: Date,
  ) {}
}
