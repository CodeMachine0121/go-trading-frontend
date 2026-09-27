import type { SpotTradeFillKind } from '~/domain/models/vo/spot-trade-fill-kind-vo'

export class SpotTradeDraftFillInputDto {
  constructor(
    public readonly key: number,
    public kind: SpotTradeFillKind,
    public filledAtText: string,
    public priceText: string,
    public quantityText: string,
    public feeText: string,
  ) {}
}
