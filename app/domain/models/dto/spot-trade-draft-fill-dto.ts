import type { SpotTradeFillKind } from '~/domain/models/vo/spot-trade-fill-kind-vo'

export class SpotTradeDraftFillDto {
  constructor(
    public readonly kind: SpotTradeFillKind,
    public readonly filledAt: Date | null,
    public readonly priceText: string,
    public readonly quantityText: string,
    public readonly feeText: string,
  ) {}
}
