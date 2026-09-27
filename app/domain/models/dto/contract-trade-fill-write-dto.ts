import type Decimal from 'decimal.js'
import type { ContractTradeFillKind } from '~/domain/models/vo/contract-trade-fill-kind-vo'
import type { TradeFillLiquidity } from '~/domain/models/vo/trade-fill-liquidity-vo'

export class ContractTradeFillWriteDto {
  constructor(
    public readonly kind: ContractTradeFillKind,
    public readonly filledAt: Date | null,
    public readonly price: Decimal,
    public readonly quantity: Decimal,
    public readonly liquidity: TradeFillLiquidity,
    public readonly fee: Decimal | null,
  ) {}
}
