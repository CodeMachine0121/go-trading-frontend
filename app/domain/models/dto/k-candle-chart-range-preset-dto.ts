import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import type { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'
import { KCandleChartViewportDto } from '~/domain/models/dto/k-candle-chart-viewport-dto'

/**
 * DTO：一個快捷區間——一鍵把正在看的區間換成某個長度。
 *
 * 「選這個」等於「以目前時間為結束、往前這麼長」，這個換算屬於快捷區間自己，
 * 因此寫在它身上而不是畫面上：畫面只負責把使用者按了哪一個告訴它。
 *
 * 那個長度以**毫秒**表達，而不是以天或小時。這一排同時有幾小時的與幾個月的，
 * 挑任何一種單位都會讓另一端寫成一個看不出是多久的數字（一年 = 8760 小時）；
 * 記毫秒則讓每一個選項在建立的地方就照自己的單位寫（`1 * 小時`、`365 * 天`），
 * 標籤與算式因此讀起來是同一件事。
 */
export class KCandleChartRangePresetDto {
  constructor(
    public readonly label: string,
    public readonly spanMilliseconds: number,
  ) {}

  /**
   * 挑好的粗細只是**原樣帶過去**：按一個快捷區間換的是看多長，不是看多細。
   * 兩件事在這裡相遇，只因為 viewport 要它們兩個才說得完整。
   */
  toViewportDto(
    symbol: string,
    loadedChart: KCandleChartDto | null,
    aggregationIntervalChoice: AggregationIntervalChoiceDto,
  ): KCandleChartViewportDto {
    const visibleEndTime = new Date()
    const visibleStartTime = new Date(visibleEndTime.getTime() - this.spanMilliseconds)

    return new KCandleChartViewportDto(
      symbol, visibleStartTime, visibleEndTime, loadedChart, aggregationIntervalChoice)
  }
}
