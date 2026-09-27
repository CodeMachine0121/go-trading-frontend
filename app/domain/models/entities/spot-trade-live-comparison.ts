import type Decimal from 'decimal.js'
import type { SpotTradeLiveComparisonRow } from '~/domain/models/entities/spot-trade-live-comparison-row'

export class SpotTradeLiveComparison {
  constructor(
    public readonly tradingStrategyName: string,
    public readonly tradingStrategyDeleted: boolean,
    public readonly rows: readonly SpotTradeLiveComparisonRow[],
    public readonly averageEntrySlippagePercentage: Decimal | null,
    public readonly entrySlippageTradeCount: number,
  ) {}
}
