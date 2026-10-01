import type Decimal from 'decimal.js'
import type { ContractTradeFillKind } from '~/domain/models/vo/contract-trade-fill-kind-vo'
import type { TradeFillLiquidity } from '~/domain/models/vo/trade-fill-liquidity-vo'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class ContractTradeFillDto {
  constructor(
    public readonly id: number,
    public readonly kind: ContractTradeFillKind,
    public readonly kindLabel: LocalizedTextVo,
    public readonly filledAt: Date,
    public readonly price: Decimal,
    public readonly priceText: string,
    public readonly quantity: Decimal,
    public readonly quantityText: string,
    public readonly liquidity: TradeFillLiquidity,
    public readonly liquidityLabel: LocalizedTextVo,
    public readonly fee: Decimal,
    public readonly feeText: string,
    public readonly feeNote: LocalizedTextVo | null,
  ) {}
}
