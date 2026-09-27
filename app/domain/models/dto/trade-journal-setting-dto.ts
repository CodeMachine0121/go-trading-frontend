import type Decimal from 'decimal.js'

export class TradeJournalSettingDto {
  constructor(
    public readonly makerFeeRate: Decimal | null,
    public readonly takerFeeRate: Decimal | null,
    public readonly configured: boolean,
    public readonly summary: string,
  ) {}
}
