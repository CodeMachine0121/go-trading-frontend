import type { TradeStatusFilter } from '~/domain/models/vo/trade-status-filter-vo'
import type { TradeSourceFilter } from '~/domain/models/vo/trade-source-filter-vo'
import type { SpotTradeMarketFilter } from '~/domain/models/vo/spot-trade-market-filter-vo'

export class SpotTradeListFilterDto {
  constructor(
    public readonly status: TradeStatusFilter = 'all',
    public readonly source: TradeSourceFilter = 'all',
    public readonly market: SpotTradeMarketFilter = 'all',
    public readonly symbol: string = '',
  ) {}
}
