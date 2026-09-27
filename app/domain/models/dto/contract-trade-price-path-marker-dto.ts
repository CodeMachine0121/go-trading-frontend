import type { ContractTradeFillKind } from '~/domain/models/vo/contract-trade-fill-kind-vo'

export class ContractTradePricePathMarkerDto {
  constructor(
    public readonly time: Date,
    public readonly kind: ContractTradeFillKind,
    public readonly text: string,
  ) {}
}
