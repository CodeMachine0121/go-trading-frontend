import type { KCandle } from '~/domain/models/entities/k-candle'
import type { KCandleChartLoadPlanVo } from '~/domain/models/vo/k-candle-chart-load-plan-vo'
import { KCandleSeriesDomain } from '~/domain/models/domains/k-candle-series-domain'

/**
 * Entity：一段彙總 K 線在 domain 內的本體形狀，只有欄位、沒有業務邏輯。
 * interval 是後端回報這批是用哪一種彙總刻度合併的，原樣收著——
 * 對回可選清單是領域的事，住在 KCandleSeriesDomain。
 */
export class KCandleSeries {
  constructor(
    public readonly symbol: string,
    public readonly interval: string,
    public readonly kCandles: KCandle[],
  ) {}

  /**
   * 取回計畫一起帶進來，因為「這批涵蓋哪一段」不在回覆裡：
   * 它就是這次要求的那一段，只有發問的人知道。
   */
  toDomain(kCandleChartLoadPlanVo: KCandleChartLoadPlanVo): KCandleSeriesDomain {
    return new KCandleSeriesDomain(this, kCandleChartLoadPlanVo)
  }
}
