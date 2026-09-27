import type Decimal from 'decimal.js'

export class ContractTradeSourceGroup {
  constructor(
    public readonly tradeCount: number,
    public readonly winRate: number | null,
    public readonly averageRMultiple: Decimal | null,
  ) {}
}
