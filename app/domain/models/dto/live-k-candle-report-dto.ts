import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'

/**
 * DTO：一則即時更新之後的結果，也是畫面拿得到的唯一形狀。
 *
 * 除了圖變成什麼樣子，還帶兩件圖本身答不出來的事：
 * 這一則是不是**一根走完了**（那一刻指標可用的資料真的多了一根，要重算），
 * 以及是不是**跟不動了**（要明說，但圖照樣顯示手上有的）。
 */
export class LiveKCandleReportDto {
  constructor(
    public readonly chart: KCandleChartDto,
    public readonly hasClosedAKCandle: boolean,
    public readonly isStalled: boolean,
  ) {}
}
