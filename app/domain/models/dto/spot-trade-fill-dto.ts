import type Decimal from 'decimal.js'
import type { SpotTradeFillKind } from '~/domain/models/vo/spot-trade-fill-kind-vo'

export class SpotTradeFillDto {
  constructor(
    public readonly id: number,
    public readonly kind: SpotTradeFillKind,
    public readonly kindLabel: string,
    public readonly filledAt: Date,
    public readonly price: Decimal,
    public readonly priceText: string,
    public readonly quantity: Decimal,
    public readonly quantityText: string,
    public readonly fee: Decimal,
    public readonly feeText: string,
  ) {}
}
