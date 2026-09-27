import type Decimal from 'decimal.js'
import type { SpotTradeMarket } from '~/domain/models/vo/spot-trade-market-vo'
import type { SpotTradeDraftFillDto } from '~/domain/models/dto/spot-trade-draft-fill-dto'

export class SpotTradeDraftDto {
  constructor(
    public readonly symbol: string,
    public readonly market: SpotTradeMarket | null,
    public readonly fills: readonly SpotTradeDraftFillDto[],
    public readonly plannedStopLossText: string,
    public readonly plannedTakeProfitText: string,
    public readonly entryReason: string,
    public readonly confidence: number | null,
    public readonly tradingStrategyId: number | null,
    public readonly setupTagIds: readonly number[],
    public readonly journalLinkIdentifier: string | null,
    public readonly referencePrice: Decimal | null,
  ) {}
}
