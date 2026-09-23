import type { KCandleChartLoadPlanVo } from '~/domain/models/vo/k-candle-chart-load-plan-vo'
import type { KCandleContractSeriesVo } from '~/domain/models/vo/k-candle-contract-series-vo'
import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import { KCandleSeriesVo } from '~/domain/models/vo/k-candle-series-vo'
import { KCandleSeriesDomain } from '~/domain/models/domains/k-candle-series-domain'

/**
 * Domain Model：一段取回的彙總合約 K 線，以及它變成圖表要畫的東西的過程。
 *
 * 合約圖畫的是**成交價**，而成交價那一條就是一根普通的 K 線——
 * 所以這裡把每一根換成它的成交價，其餘（交易標的、涵蓋範圍、刻度、漲跌）
 * 一律交給現貨那一套（KCandleSeriesDomain）。圖表那一側因此分不出兩者，也不必分。
 */
export class KCandleContractSeriesDomain {
  constructor(
    private readonly kCandleContractSeriesVo: KCandleContractSeriesVo,
    private readonly kCandleChartLoadPlanVo: KCandleChartLoadPlanVo,
  ) {}

  toDto(): KCandleChartDto {
    return new KCandleSeriesDomain(
      new KCandleSeriesVo(
        this.kCandleContractSeriesVo.kCandleContracts.map(
          kCandleContract => kCandleContract.toKCandle()),
        this.kCandleContractSeriesVo.interval,
      ),
      this.kCandleChartLoadPlanVo,
    ).toDto()
  }
}
