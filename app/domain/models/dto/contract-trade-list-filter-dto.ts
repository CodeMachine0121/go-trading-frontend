import type { TradeStatusFilter } from '~/domain/models/vo/trade-status-filter-vo'
import type { TradeSourceFilter } from '~/domain/models/vo/trade-source-filter-vo'

export class ContractTradeListFilterDto {
  constructor(
    public readonly status: TradeStatusFilter = 'all',
    public readonly source: TradeSourceFilter = 'all',
    public readonly symbol: string = '',
  ) {}
}
