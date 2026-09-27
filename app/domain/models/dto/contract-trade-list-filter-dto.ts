import type { ContractTradeStatusFilter } from '~/domain/models/vo/contract-trade-status-filter-vo'
import type { ContractTradeSourceFilter } from '~/domain/models/vo/contract-trade-source-filter-vo'

export class ContractTradeListFilterDto {
  constructor(
    public readonly status: ContractTradeStatusFilter = 'all',
    public readonly source: ContractTradeSourceFilter = 'all',
    public readonly symbol: string = '',
  ) {}
}
