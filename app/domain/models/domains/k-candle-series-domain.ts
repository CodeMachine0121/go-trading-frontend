import type { KCandleSeries } from '~/domain/models/entities/k-candle-series'
import type { KCandleChartLoadPlanVo } from '~/domain/models/vo/k-candle-chart-load-plan-vo'
import { AGGREGATION_INTERVALS } from '~/domain/models/vo/aggregation-interval-vo'
import { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'

/**
 * Domain Model：一段取回的彙總 K 線，以及它變成圖表要畫的東西的過程。
 *
 * 逐根的漲跌沿用既有的那一套（KCandleDomain），這裡不另訂——
 * 圖上一根是紅是綠，跟表格上那一根寫「上漲」還是「下跌」必須是同一個判斷。
 */
export class KCandleSeriesDomain {
  constructor(
    private readonly kCandleSeries: KCandleSeries,
    private readonly kCandleChartLoadPlanVo: KCandleChartLoadPlanVo,
  ) {}

  toDto(): KCandleChartDto {
    // 後端回報的刻度代號對回可選清單。對不上就沿用這次要求的那一種：
    // 認不得的代號沒有標籤可以顯示，而我們至少知道自己要的是哪一種。
    const reportedInterval = AGGREGATION_INTERVALS.find(
      aggregationInterval => aggregationInterval.value === this.kCandleSeries.interval)

    return new KCandleChartDto(
      this.kCandleSeries.symbol,
      reportedInterval === undefined ? this.kCandleChartLoadPlanVo.interval : reportedInterval,
      this.kCandleChartLoadPlanVo.startTime,
      this.kCandleChartLoadPlanVo.endTime,
      this.kCandleSeries.kCandles.map(kCandle => kCandle.toDomain().toDto()),
    )
  }
}
