import type { TradeStatisticsPeriod } from '~/domain/models/vo/trade-statistics-period-vo'
import type { SpotTradeMarketStatistics } from '~/domain/models/entities/spot-trade-market-statistics'

export class SpotTradeStatistics {
  constructor(
    public readonly period: TradeStatisticsPeriod,
    public readonly markets: readonly SpotTradeMarketStatistics[],
  ) {}
}
