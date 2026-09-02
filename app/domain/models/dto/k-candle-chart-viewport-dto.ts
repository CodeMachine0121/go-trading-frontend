import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'

/**
 * DTO：畫面交給 application 的形狀——「我在看這一段，手上有這些」。
 * DTO 是雙向的：這一份是進去的方向，KCandleChartDto 是回來的方向。
 */
export class KCandleChartViewportDto {
  constructor(
    public readonly symbol: string,
    public readonly visibleStartTime: Date,
    public readonly visibleEndTime: Date,
    /** 手上這批。第一次進畫面時還沒有，是 null。 */
    public readonly loadedChart: KCandleChartDto | null,
  ) {}
}
