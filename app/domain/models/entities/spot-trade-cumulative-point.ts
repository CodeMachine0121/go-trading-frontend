import type Decimal from 'decimal.js'

export class SpotTradeCumulativePoint {
  constructor(
    public readonly closedAt: Date,
    public readonly cumulativeNetProfit: Decimal,
  ) {}
}
