import type { KCandleChartLoadPlanVo } from '~/domain/models/vo/k-candle-chart-load-plan-vo'
import type { KCandleSeriesVo } from '~/domain/models/vo/k-candle-series-vo'
import { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'

/**
 * Domain Model：一段取回的彙總 K 線，以及它變成圖表要畫的東西的過程。
 *
 * 逐根的漲跌沿用既有的那一套（KCandleDomain），這裡不另訂——
 * 圖上一根是紅是綠，跟表格上那一根寫「上漲」還是「下跌」必須是同一個判斷。
 *
 * **交易標的與涵蓋範圍取自這次的取回計畫；彙總刻度取自後端的回覆。**
 * 兩個來源分工得很清楚：要哪一段是畫面說的，一根多粗是系統說的。
 *
 * 這裡曾經連刻度也取自取回計畫，理由是「下一次要不要重新取靠身分比對，
 * 採用後端回報的值會讓比對永遠不相等、於是每次拖曳都重新取」。
 * 那個顧慮隨著刻度離開取回計畫一起消失了：**現在的重新取條件裡沒有刻度**，
 * 它比對的是交易標的、涵蓋範圍與顯示區間的長度變化。
 */
export class KCandleSeriesDomain {
  constructor(
    private readonly kCandleSeriesVo: KCandleSeriesVo,
    private readonly kCandleChartLoadPlanVo: KCandleChartLoadPlanVo,
  ) {}

  toDto(): KCandleChartDto {
    return new KCandleChartDto(
      this.kCandleChartLoadPlanVo.symbol,
      this.kCandleSeriesVo.interval,
      this.kCandleChartLoadPlanVo.fetchStartTime,
      this.kCandleChartLoadPlanVo.fetchEndTime,
      this.kCandleSeriesVo.kCandles.map(kCandle => kCandle.toDomain().toDto()),
    )
  }
}
