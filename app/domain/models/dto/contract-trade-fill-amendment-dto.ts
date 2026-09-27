import type { ContractTradeFillDto } from '~/domain/models/dto/contract-trade-fill-dto'

export class ContractTradeFillAmendmentDto {
  constructor(
    public readonly fill: ContractTradeFillDto,
    public readonly priceText: string,
    public readonly quantityText: string,
    public readonly feeText: string,
  ) {}
}
