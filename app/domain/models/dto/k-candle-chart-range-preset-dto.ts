import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import { KCandleChartViewportDto } from '~/domain/models/dto/k-candle-chart-viewport-dto'

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * DTO：一個快捷區間——一鍵把正在看的區間換成某個長度。
 *
 * 「選這個」等於「以目前時間為結束、往前這麼長」，這個換算屬於快捷區間自己，
 * 因此寫在它身上而不是畫面上：畫面只負責把使用者按了哪一個告訴它。
 */
export class KCandleChartRangePresetDto {
  constructor(
    public readonly label: string,
    public readonly days: number,
  ) {}

  toViewportDto(symbol: string, loadedChart: KCandleChartDto | null): KCandleChartViewportDto {
    const visibleEndTime = new Date()
    const visibleStartTime = new Date(visibleEndTime.getTime() - this.days * MILLISECONDS_PER_DAY)

    return new KCandleChartViewportDto(symbol, visibleStartTime, visibleEndTime, loadedChart)
  }
}
