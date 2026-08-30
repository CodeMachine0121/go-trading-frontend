import type { KCandle } from '~/domain/models/entities/k-candle'
import type { KCandleQueryDomain } from '~/domain/models/domains/k-candle-query-domain'

/**
 * 介面以「能力」命名，不以供應商命名。
 * 參數收已驗證的查詢條件，實作端因此不必重覆驗證。
 * 實作在 app/infrastructure/proxy/k-candle-proxy.ts。
 */
export interface IKCandleProxy {
  findKCandlesInRange(kCandleQueryDomain: KCandleQueryDomain): Promise<KCandle[]>
}
