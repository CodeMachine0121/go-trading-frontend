import type { SpotTradeMarket } from '~/domain/models/vo/spot-trade-market-vo'
import type { SpotTradePerformance } from '~/domain/models/entities/spot-trade-performance'

export class SpotTradeLiveComparisonRow {
  constructor(
    public readonly symbol: string,
    public readonly market: SpotTradeMarket,
    public readonly live: SpotTradePerformance,
    public readonly backtest: SpotTradePerformance | null,
    public readonly backtestFailureReason: string | null,
  ) {}
}
