import type Decimal from 'decimal.js'
import type { SpotTradeFillWriteDto } from '~/domain/models/dto/spot-trade-fill-write-dto'

export class SpotTradeRecordWriteDto {
  constructor(
    public readonly symbol: string,
    public readonly firstBuyFill: SpotTradeFillWriteDto,
    public readonly plannedStopLossPrice: Decimal | null,
    public readonly plannedTakeProfitPrice: Decimal | null,
    public readonly entryReason: string,
    public readonly confidence: number | null,
    public readonly tradingStrategyId: number | null,
    public readonly setupTagIds: readonly number[],
    public readonly journalLinkIdentifier: string | null,
  ) {}
}
