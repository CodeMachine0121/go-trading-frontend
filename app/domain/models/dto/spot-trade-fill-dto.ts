import type Decimal from 'decimal.js'
import type { SpotTradeFillKind } from '~/domain/models/vo/spot-trade-fill-kind-vo'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class SpotTradeFillDto {
  constructor(
    public readonly id: number,
    public readonly kind: SpotTradeFillKind,
    public readonly kindLabel: LocalizedTextVo,
    public readonly filledAt: Date,
    public readonly price: Decimal,
    public readonly priceText: string,
    public readonly quantity: Decimal,
    public readonly quantityText: string,
    public readonly fee: Decimal,
    public readonly feeText: string,
  ) {}
}
