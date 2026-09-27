import type Decimal from 'decimal.js'

export class TradeJournalSetting {
  constructor(
    public readonly makerFeeRate: Decimal | null,
    public readonly takerFeeRate: Decimal | null,
  ) {}
}
