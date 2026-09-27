import type Decimal from 'decimal.js'

export class ContractTradeMistakeCost {
  constructor(
    public readonly tagName: string,
    public readonly tradeCount: number,
    public readonly rMultipleTotal: Decimal,
  ) {}
}
