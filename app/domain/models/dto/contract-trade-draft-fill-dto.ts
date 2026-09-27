import type { ContractTradeFillKind } from '~/domain/models/vo/contract-trade-fill-kind-vo'
import type { TradeFillLiquidity } from '~/domain/models/vo/trade-fill-liquidity-vo'

export class ContractTradeDraftFillDto {
  constructor(
    public readonly kind: ContractTradeFillKind,
    public readonly filledAt: Date | null,
    public readonly priceText: string,
    public readonly quantityText: string,
    public readonly liquidity: TradeFillLiquidity,
    public readonly feeText: string,
  ) {}
}
