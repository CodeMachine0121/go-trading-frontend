import type { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'

/**
 * VO：對照過「正在看哪一段」與「手上有什麼」之後得出的結論。不可變、無行為。
 *
 * 它同時就是取資料時要帶的條件，所以不可能發生「判斷說不用取、卻還是取了」——
 * 要取什麼跟要不要取是同一個物件回答的。
 *
 * **它帶的是使用者宣告的粗細，不是推導出來的刻度。** 一根該多粗需要交易時段與
 * 休市日才算得對，那是系統知道的事；畫面**說得出**「我要這麼粗」，
 * 卻仍然**推導不出**「這一段該多粗」。型別上這裡放的是
 * `AggregationIntervalChoiceDto`（一個選擇，可能是「沒挑」）而不是
 * `AggregationIntervalVo`（一個刻度），所以「畫面算出了刻度」這件事
 * 依舊表達不出來——它曾經在這裡表達出來過三次，每次都是錯的。
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
    public readonly visibleStartTime: Date,
    public readonly visibleEndTime: Date,
    public readonly fetchStartTime: Date,
    public readonly fetchEndTime: Date,
    public readonly aggregationIntervalChoice: AggregationIntervalChoiceDto,
  ) {}
}
