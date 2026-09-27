import type Decimal from 'decimal.js'
import type { ContractTradeDirection } from '~/domain/models/vo/contract-trade-direction-vo'
import type { TradeStatus } from '~/domain/models/vo/trade-status-vo'
import type { ContractTradeFill } from '~/domain/models/entities/contract-trade-fill'
import type { TradeNote } from '~/domain/models/entities/trade-note'
import type { TradeSource } from '~/domain/models/entities/trade-source'
import type { TradeReview } from '~/domain/models/entities/trade-review'
import type { ContractTradeOutcome } from '~/domain/models/entities/contract-trade-outcome'
import type { TradeTag } from '~/domain/models/entities/trade-tag'
import { ContractTradeRecordDomain } from '~/domain/models/domains/contract-trade-record-domain'

export class ContractTradeRecord {
  constructor(
    public readonly id: number,
    public readonly symbol: string,
    public readonly direction: ContractTradeDirection,
    public readonly leverage: Decimal,
    public readonly status: TradeStatus,
    public readonly plannedStopLossPrice: Decimal | null,
    public readonly plannedTakeProfitPrice: Decimal | null,
    public readonly entryReason: string,
    public readonly confidence: number | null,
    public readonly tradingStrategyId: number | null,
    public readonly tradingStrategyName: string | null,
    public readonly tradingStrategyDeleted: boolean,
    public readonly openedAt: Date,
    public readonly closedAt: Date | null,
    public readonly fills: readonly ContractTradeFill[],
    public readonly notes: readonly TradeNote[],
    public readonly tags: readonly TradeTag[],
    public readonly source: TradeSource | null,
    public readonly review: TradeReview | null,
    public readonly outcome: ContractTradeOutcome,
  ) {}

  toDomain(): ContractTradeRecordDomain {
    return new ContractTradeRecordDomain(this)
  }
}
