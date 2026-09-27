import type { ContractTradeLiveComparisonRow } from '~/domain/models/entities/contract-trade-live-comparison-row'

export class ContractTradeLiveComparison {
  constructor(
    public readonly tradingStrategyName: string,
    public readonly tradingStrategyDeleted: boolean,
    public readonly rows: readonly ContractTradeLiveComparisonRow[],
  ) {}
}
