import type Decimal from 'decimal.js'

export class ContractTradePerformance {
  constructor(
    public readonly closedTradeCount: number,
    public readonly winRate: number | null,
    public readonly longWinRate: number | null,
    public readonly shortWinRate: number | null,
    public readonly averageEntrySlippagePercentage: Decimal | null = null,
    public readonly entrySlippageTradeCount: number = 0,
  ) {}
}
