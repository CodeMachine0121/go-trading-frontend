import type Decimal from 'decimal.js'

export class TradePricePathCandleDto {
  constructor(
    public readonly openTime: Date,
    public readonly open: Decimal,
    public readonly high: Decimal,
    public readonly low: Decimal,
    public readonly close: Decimal,
  ) {}
}
