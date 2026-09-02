import type { AggregationIntervalVo } from '~/domain/models/vo/aggregation-interval-vo'

/**
 * VO：對照過「正在看哪一段」與「手上有什麼」之後得出的結論。不可變、無行為。
 *
 * 它同時就是取資料時要帶的條件，所以不可能發生「判斷說不用取、卻還是取了」——
 * 要取什麼跟要不要取是同一個物件回答的。
 *
 * 兩組時間刻意分開命名：
 * - **visible** 是使用者**應該**看到的那一段，可能已經被收回上限，畫面要照它擺位置；
 * - **fetch** 是往兩側各多取半段之後要跟後端要的那一段。
 *
 * needsReload 為否時 fetch 那一組仍然填著，只是沒有人會拿去用；
 * visible 那一組**不論如何都要用**——收回上限這件事不會因為不必重新取就不發生。
 */
export class KCandleChartLoadPlanVo {
  constructor(
    public readonly needsReload: boolean,
    public readonly symbol: string,
    public readonly interval: AggregationIntervalVo,
    public readonly visibleStartTime: Date,
    public readonly visibleEndTime: Date,
    public readonly fetchStartTime: Date,
    public readonly fetchEndTime: Date,
  ) {}
}
