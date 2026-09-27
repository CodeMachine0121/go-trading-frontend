import type Decimal from 'decimal.js'

export class SpotTradeMistakeCost {
  constructor(
    public readonly tagName: string,
    public readonly tradeCount: number,
    public readonly totalNetProfit: Decimal,
    public readonly averageReturnRate: number | null,
  ) {}
}
