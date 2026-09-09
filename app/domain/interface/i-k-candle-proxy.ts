import type { KCandle } from '~/domain/models/entities/k-candle'
import type { KCandleQueryDomain } from '~/domain/models/domains/k-candle-query-domain'
import type { KCandleWriteDomain } from '~/domain/models/domains/k-candle-write-domain'
import type { KCandleIdentityVo } from '~/domain/models/vo/k-candle-identity-vo'
import type { KCandleChartLoadPlanVo } from '~/domain/models/vo/k-candle-chart-load-plan-vo'
import type { KCandleSeriesVo } from '~/domain/models/vo/k-candle-series-vo'

/**
 * 介面以「能力」命名，不以供應商命名。同一個外部資源一個 Proxy——
 * K 線的讀與寫都收在這裡，不拆成 reader / writer。
 * 參數一律收已驗證的查詢條件、已驗證的 K 線或身分，實作端因此不必重覆驗證。
 * 實作在 app/infrastructure/proxy/k-candle-proxy.ts。
 */
export interface IKCandleProxy {
  findKCandlesInRange(kCandleQueryDomain: KCandleQueryDomain): Promise<KCandle[]>

  /**
   * 取一段彙總過的 K 線。取回計畫只說**要取哪一段**——一根該多粗由系統決定。
   *
   * 因此回的是那幾根**加上系統說它用了哪一種刻度**：同一段時間以兩種刻度取回，
   * 會得到兩批都正確、卻完全不同的 K 線，所以少了刻度那批 K 線說不出一句完整的話。
   */
  findKCandleSeries(kCandleChartLoadPlanVo: KCandleChartLoadPlanVo): Promise<KCandleSeriesVo>

  /** 存下一根 K 線；同一個身分已存在時覆蓋它。 */
  saveKCandle(kCandleWriteDomain: KCandleWriteDomain): Promise<KCandle>

  /** 更新一根既有的 K 線；不存在時由後端拒絕。 */
  updateKCandle(kCandleWriteDomain: KCandleWriteDomain): Promise<KCandle>

  /** 刪除指名的那一根 K 線；不存在時由後端拒絕。 */
  deleteKCandle(kCandleIdentityVo: KCandleIdentityVo): Promise<void>

  /**
   * 要後端立刻去把這一檔缺的 K 線補回來，回報這一次補到幾根。
   *
   * 補到多久以前是後端的設定，不是這裡挑的——由呼叫端指定的話，同一顆按鈕會因為
   * 誰按而做不同的事。
   */
  catchUpSymbol(symbol: string): Promise<number>
}
