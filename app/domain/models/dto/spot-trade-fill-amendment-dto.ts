import type { SpotTradeFillDto } from '~/domain/models/dto/spot-trade-fill-dto'

export class SpotTradeFillAmendmentDto {
  constructor(
    public readonly fill: SpotTradeFillDto,
    public readonly priceText: string,
    public readonly quantityText: string,
    public readonly feeText: string,
  ) {}
}
