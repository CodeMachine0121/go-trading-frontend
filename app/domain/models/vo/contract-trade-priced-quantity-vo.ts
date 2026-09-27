import type Decimal from 'decimal.js'
import type { ContractTradeFillKind } from '~/domain/models/vo/contract-trade-fill-kind-vo'

export class ContractTradePricedQuantityVo {
  constructor(
    public readonly kind: ContractTradeFillKind,
    public readonly price: Decimal,
    public readonly quantity: Decimal,
  ) {}
}
