import type Decimal from 'decimal.js'

export class StrategyBotCapitalAllocationDto {
  constructor(
    public readonly symbol: string,
    public readonly allocationPercentage: Decimal,
  ) {}
}
