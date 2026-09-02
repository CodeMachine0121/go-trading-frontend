import type { KCandle } from '~/domain/models/entities/k-candle'
import type { KCandleQueryDomain } from '~/domain/models/domains/k-candle-query-domain'
import type { KCandleWriteDomain } from '~/domain/models/domains/k-candle-write-domain'
import type { KCandleIdentityVo } from '~/domain/models/vo/k-candle-identity-vo'
import type { KCandleChartLoadPlanVo } from '~/domain/models/vo/k-candle-chart-load-plan-vo'

/**
 * 介面以「能力」命名，不以供應商命名。同一個外部資源一個 Proxy——
 * K 線的讀與寫都收在這裡，不拆成 reader / writer。
 * 參數一律收已驗證的查詢條件、已驗證的 K 線或身分，實作端因此不必重覆驗證。
 * 實作在 app/infrastructure/proxy/k-candle-proxy.ts。
 */
export interface IKCandleProxy {
  findKCandlesInRange(kCandleQueryDomain: KCandleQueryDomain): Promise<KCandle[]>

  /**
   * 取一段依彙總刻度合併過的 K 線；要取哪一段、哪一種刻度都在取回計畫裡。
   * 回的就是那幾根——交易標的與刻度是發問的人自己知道的事，不必再從回覆裡讀一次。
   */
  findKCandleSeries(kCandleChartLoadPlanVo: KCandleChartLoadPlanVo): Promise<KCandle[]>

  /** 存下一根 K 線；同一個身分已存在時覆蓋它。 */
  saveKCandle(kCandleWriteDomain: KCandleWriteDomain): Promise<KCandle>

  /** 更新一根既有的 K 線；不存在時由後端拒絕。 */
  updateKCandle(kCandleWriteDomain: KCandleWriteDomain): Promise<KCandle>

  /** 刪除指名的那一根 K 線；不存在時由後端拒絕。 */
  deleteKCandle(kCandleIdentityVo: KCandleIdentityVo): Promise<void>
}
