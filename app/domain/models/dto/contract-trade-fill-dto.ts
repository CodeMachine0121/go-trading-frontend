import type Decimal from 'decimal.js'
import type { ContractTradeFillKind } from '~/domain/models/vo/contract-trade-fill-kind-vo'
import type { TradeFillLiquidity } from '~/domain/models/vo/trade-fill-liquidity-vo'

export class ContractTradeFillDto {
  constructor(
    public readonly id: number,
    public readonly kind: ContractTradeFillKind,
    public readonly kindLabel: string,
    public readonly filledAt: Date,
    public readonly price: Decimal,
    public readonly priceText: string,
    public readonly quantity: Decimal,
    public readonly quantityText: string,
    public readonly liquidity: TradeFillLiquidity,
    public readonly liquidityLabel: string,
    public readonly fee: Decimal,
    public readonly feeText: string,
    public readonly feeNote: string | null,
  ) {}
}
