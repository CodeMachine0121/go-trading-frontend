import type { SpotTradeRecordRowDto } from '~/domain/models/dto/spot-trade-record-row-dto'
import type { SpotTradeMarketSummaryDto } from '~/domain/models/dto/spot-trade-market-summary-dto'

export class SpotTradeListDto {
  constructor(
    public readonly periodLabel: string,
    public readonly tradeCountsLabel: string,
    public readonly marketSummaries: readonly SpotTradeMarketSummaryDto[],
    public readonly rows: readonly SpotTradeRecordRowDto[],
    public readonly pendingReviewCount: number,
    public readonly symbolOptions: readonly string[],
    public readonly emptyMessage: string | null,
  ) {}
}
