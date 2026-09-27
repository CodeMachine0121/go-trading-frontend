import type Decimal from 'decimal.js'

export class ContractTradeCumulativePoint {
  constructor(
    public readonly closedAt: Date,
    public readonly cumulativeRMultiple: Decimal,
  ) {}
}
