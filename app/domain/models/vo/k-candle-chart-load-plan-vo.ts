import type { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'

/**
 * 一次跟後端要的那一段最多涵蓋幾根。
 *
 * 後端單次至多一千根，而它數的是那一段時間裡有幾格；我們只用「每根多久」去換算，
 * 所以留一成，不貼著上限走。後端那一側的上限若調整，這裡要跟著改——它是兩份設定，不是一份。
 * 圖表的整批取、接上一段，與交易走勢挑粗細，說的都是這一個數字。
 */
export const MAXIMUM_FETCHED_CANDLE_COUNT = 900

/**
 * 這一次要怎麼取：
 * - `none`：手上這批夠畫，什麼都不要。
 * - `replace`：整批換一批（換檔、換粗細、看的那一段整個在手上這批之外）。
 * - `extendEarlier` / `extendLater`：在左邊／右邊接上一段，併進手上這批，畫面不動。
 */
export type KCandleChartLoadKind = 'none' | 'replace' | 'extendEarlier' | 'extendLater'

/**
 * VO：對照過「正在看哪一段」與「手上有什麼」之後得出的結論。不可變、無行為。
 *
 * 它同時就是取資料時要帶的條件，所以不可能發生「判斷說不用取、卻還是取了」——
 * 要取什麼跟要不要取是同一個物件回答的。
 *
 * 兩組時間刻意分開命名：
 * - **visible** 是使用者正在看的那一段，畫面要照它擺位置（需要擺的時候）；
 * - **fetch** 是要跟後端要的那一段：整批換時是看的那一段兩側各多半段，
 *   接上一段時是手上這批左邊（或右邊）緊接著的那一段。
 *
 * kind 為 `none` 時 fetch 那一組仍然填著，只是沒有人會拿去用。
 */
export class KCandleChartLoadPlanVo {
  constructor(
    public readonly kind: KCandleChartLoadKind,
    public readonly symbol: string,
    public readonly visibleStartTime: Date,
    public readonly visibleEndTime: Date,
    public readonly fetchStartTime: Date,
    public readonly fetchEndTime: Date,
    public readonly aggregationIntervalChoice: AggregationIntervalChoiceDto,
  ) {}

  /** 這一次要不要跟後端要東西。 */
  get needsReload(): boolean {
    return this.kind !== 'none'
  }
}
