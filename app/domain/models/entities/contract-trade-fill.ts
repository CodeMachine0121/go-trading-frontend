import type Decimal from 'decimal.js'
import type { ContractTradeFillKind } from '~/domain/models/vo/contract-trade-fill-kind-vo'
import type { TradeFillLiquidity } from '~/domain/models/vo/trade-fill-liquidity-vo'

export class ContractTradeFill {
  constructor(
    public readonly id: number,
    public readonly kind: ContractTradeFillKind,
    public readonly filledAt: Date,
    public readonly price: Decimal,
    public readonly quantity: Decimal,
    public readonly liquidity: TradeFillLiquidity,
    public readonly fee: Decimal,
    public readonly feeRateMissing: boolean,
  ) {}
}
