import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'

/**
 * DTO：一則即時更新之後的結果，也是畫面拿得到的唯一形狀。
 *
 * 除了圖變成什麼樣子，還帶四件圖本身答不出來的事：
 * 這一則是不是**一根走完了**（那一刻指標可用的資料真的多了一根，要重算），
 * 是不是**跟不動了**（會自己接回來），這一檔是不是**根本沒有即時更新可給**
 * （不會自己好），以及**這個市場是不是收盤了**（開盤就會自己好，誰都不必做什麼）。
 * 四者分開帶，因為看的人該做的事完全不同。
 *
 * 收盤要從這裡帶回來，而不是只看進畫面那一刻問到的那一份：市場會在人看著的時候收盤，
 * 那一刻唯一知道這件事的就是這則更新。
 */
export class LiveKCandleReportDto {
  /**
   * 這一則是市場真的動了。
   *
   * 它是唯一能**撤回**「收盤中」與「沒有即時更新」的證據：那兩句只由進畫面那一刻
   * 問到的那一份說出口，而那一份不會自己更新——沒有這個，開盤之後畫面會繼續說
   * 收盤中，一邊說一邊讓最後那一根在旁邊跳。
   *
   * 這不是畫面自己推算的：後端只在真的跟得動的時候才送得出一根 K 線。
   */
  get isTrading(): boolean {
    return !this.isStalled && !this.hasNoLivePlace && !this.isMarketClosed
  }

  constructor(
    public readonly chart: KCandleChartDto,
    public readonly hasClosedAKCandle: boolean,
    public readonly isStalled: boolean,
    public readonly hasNoLivePlace: boolean = false,
    public readonly isMarketClosed: boolean = false,
  ) {}
}
