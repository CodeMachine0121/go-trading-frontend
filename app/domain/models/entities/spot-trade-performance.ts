import type Decimal from 'decimal.js'

export class SpotTradePerformance {
  constructor(
    public readonly closedTradeCount: number,
    public readonly winRate: number | null,
    public readonly averageEntrySlippagePercentage: Decimal | null,
    public readonly entrySlippageTradeCount: number,
  ) {}
}
