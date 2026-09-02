import type { KCandle } from '~/domain/models/entities/k-candle'
import type { KCandleChartLoadPlanVo } from '~/domain/models/vo/k-candle-chart-load-plan-vo'
import { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'

/**
 * Domain Model：一段取回的彙總 K 線，以及它變成圖表要畫的東西的過程。
 *
 * 逐根的漲跌沿用既有的那一套（KCandleDomain），這裡不另訂——
 * 圖上一根是紅是綠，跟表格上那一根寫「上漲」還是「下跌」必須是同一個判斷。
 *
 * **交易標的與彙總刻度取自這次的取回計畫，不取自後端的回覆。**
 * 下一次要不要重新取，靠的就是拿手上這批的身分跟顯示區間想要的身分比對；
 * 若這裡改成採用後端回報的值，只要它與我們要求的不一致（升級刻度、正規化大小寫），
 * 那個比對就會永遠不相等，於是每一次拖曳都重新取——而且停不下來。
 */
export class KCandleSeriesDomain {
  constructor(
    private readonly kCandles: KCandle[],
    private readonly kCandleChartLoadPlanVo: KCandleChartLoadPlanVo,
  ) {}

  toDto(): KCandleChartDto {
    return new KCandleChartDto(
      this.kCandleChartLoadPlanVo.symbol,
      this.kCandleChartLoadPlanVo.interval,
      this.kCandleChartLoadPlanVo.fetchStartTime,
      this.kCandleChartLoadPlanVo.fetchEndTime,
      this.kCandles.map(kCandle => kCandle.toDomain().toDto()),
    )
  }
}
