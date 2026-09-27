import type Decimal from 'decimal.js'
import type { SpotTradeFillKind } from '~/domain/models/vo/spot-trade-fill-kind-vo'

export class SpotTradeFill {
  constructor(
    public readonly id: number,
    public readonly kind: SpotTradeFillKind,
    public readonly filledAt: Date,
    public readonly price: Decimal,
    public readonly quantity: Decimal,
    public readonly fee: Decimal,
  ) {}
}
