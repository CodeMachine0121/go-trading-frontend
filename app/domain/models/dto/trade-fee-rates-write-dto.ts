import type Decimal from 'decimal.js'

export class TradeFeeRatesWriteDto {
  constructor(
    public readonly makerFeeRate: Decimal | null,
    public readonly takerFeeRate: Decimal | null,
  ) {}
}
