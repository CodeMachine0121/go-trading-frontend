import type Decimal from 'decimal.js'
import type { SpotTradeMarket } from '~/domain/models/vo/spot-trade-market-vo'
import type { TradeStatus } from '~/domain/models/vo/trade-status-vo'
import type { SpotTradeFill } from '~/domain/models/entities/spot-trade-fill'
import type { TradeNote } from '~/domain/models/entities/trade-note'
import type { TradeSource } from '~/domain/models/entities/trade-source'
import type { TradeReview } from '~/domain/models/entities/trade-review'
import type { SpotTradeOutcome } from '~/domain/models/entities/spot-trade-outcome'
import type { TradeTag } from '~/domain/models/entities/trade-tag'
import { SpotTradeRecordDomain } from '~/domain/models/domains/spot-trade-record-domain'

export class SpotTradeRecord {
  constructor(
    public readonly id: number,
    public readonly symbol: string,
    public readonly market: SpotTradeMarket,
    public readonly currency: string,
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
    public readonly fills: readonly SpotTradeFill[],
    public readonly notes: readonly TradeNote[],
    public readonly tags: readonly TradeTag[],
    public readonly source: TradeSource | null,
    public readonly review: TradeReview | null,
    public readonly outcome: SpotTradeOutcome,
  ) {}

  toDomain(): SpotTradeRecordDomain {
    return new SpotTradeRecordDomain(this)
  }
}
