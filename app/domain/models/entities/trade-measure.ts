import type Decimal from 'decimal.js'
import type { TradeUnavailableReason } from '~/domain/models/vo/trade-unavailable-reason-vo'

export class TradeMeasure {
  constructor(
    public readonly value: Decimal | null,
    public readonly unavailableReason: TradeUnavailableReason | null,
  ) {}
}
