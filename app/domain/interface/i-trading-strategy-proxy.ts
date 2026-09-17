import type { TradingStrategyWriteDomain } from '~/domain/models/domains/trading-strategy-write-domain'
import type { TradingStrategy } from '~/domain/models/entities/trading-strategy'

/**
 * 交易策略這一條路的對外契約。
 *
 * 讀回來的是 entity，不是 DTO：把後端的形狀翻成畫面的形狀是 domain 的事，
 * 而一個回 DTO 的 proxy 等於把那件事搬到了 infrastructure。
 */
export interface ITradingStrategyProxy {
  listTradingStrategies(): Promise<TradingStrategy[]>
  getTradingStrategy(id: number): Promise<TradingStrategy>
  createTradingStrategy(writeDomain: TradingStrategyWriteDomain): Promise<TradingStrategy>
  updateTradingStrategy(writeDomain: TradingStrategyWriteDomain): Promise<TradingStrategy>
  deleteTradingStrategy(id: number): Promise<void>
}
