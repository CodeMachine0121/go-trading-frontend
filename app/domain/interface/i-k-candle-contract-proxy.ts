import type { KCandleContract } from '~/domain/models/entities/k-candle-contract'
import type { KCandleQueryDomain } from '~/domain/models/domains/k-candle-query-domain'
import type { KCandleChartLoadPlanVo } from '~/domain/models/vo/k-candle-chart-load-plan-vo'
import type { KCandleContractSeriesVo } from '~/domain/models/vo/k-candle-contract-series-vo'

/**
 * 介面以「能力」命名，不以供應商命名。合約 K 線是交易服務上另一條線（`/contract-k-candles`），
 * 與現貨的 K 線是兩個不同的外部資源，所以有自己的 proxy——共用一個的話，
 * 一個打錯位址的呼叫會拿回同名現貨的數字，而且不會被拒絕。
 *
 * 參數收的是已驗證的查詢條件與取回計畫，與現貨那一個相同：條件規則只有一份。
 * 實作在 app/infrastructure/proxy/k-candle-contract-proxy.ts。
 */
export interface IKCandleContractProxy {
  /** 一段時間內的合約 K 線，順序不保證——排序是 domain 的事。 */
  findKCandleContractsInRange(kCandleQueryDomain: KCandleQueryDomain): Promise<KCandleContract[]>

  /**
   * 一段彙總過的合約 K 線，加上系統說它用了哪一種刻度。
   * 取回計畫只說要取哪一段、使用者挑了哪一種粗細——一根該多粗由系統決定。
   */
  findKCandleContractSeries(
    kCandleChartLoadPlanVo: KCandleChartLoadPlanVo,
  ): Promise<KCandleContractSeriesVo>
}
