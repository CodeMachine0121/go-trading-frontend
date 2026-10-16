import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import type { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'

/**
 * DTO：畫面交給 application 的形狀——「我在看這一段、我要這麼粗，手上有這些」。
 * DTO 是雙向的：這一份是進去的方向，KCandleChartDto 是回來的方向。
 *
 * 挑的粗細與看的那一段**平級**：兩者都是使用者說出口的意圖，而且互不影響——
 * 換粗細不改變他看哪一段，換區間也不改變他要多細。
 */
export class KCandleChartViewportDto {
  constructor(
    public readonly symbol: string,
    public readonly visibleStartTime: Date,
    public readonly visibleEndTime: Date,
    /** 手上這批。第一次進畫面時還沒有，是 null。 */
    public readonly loadedChart: KCandleChartDto | null,
    public readonly aggregationIntervalChoice: AggregationIntervalChoiceDto,
  ) {}

  /**
   * 跳到最新：同一檔、同樣的長度與粗細，只是結束在這一刻。
   * 右側留白與要不要重新取不在這裡決定——交給顯示區間原本那一套規則。
   */
  endingAt(now: Date): KCandleChartViewportDto {
    const span = this.visibleEndTime.getTime() - this.visibleStartTime.getTime()

    return new KCandleChartViewportDto(
      this.symbol, new Date(now.getTime() - span), now, this.loadedChart, this.aggregationIntervalChoice)
  }
}
