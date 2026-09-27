import type Decimal from 'decimal.js'
import type { ContractTradeUnavailableReason } from '~/domain/models/vo/contract-trade-unavailable-reason-vo'

export class ContractTradeMeasure {
  constructor(
    public readonly value: Decimal | null,
    public readonly unavailableReason: ContractTradeUnavailableReason | null,
  ) {}
}
