import type { TradePricePathMarkerKind } from '~/domain/models/vo/trade-price-path-marker-kind-vo'

export class TradePricePathMarkerDto {
  constructor(
    public readonly time: Date,
    public readonly kind: TradePricePathMarkerKind,
    public readonly text: string,
  ) {}
}
