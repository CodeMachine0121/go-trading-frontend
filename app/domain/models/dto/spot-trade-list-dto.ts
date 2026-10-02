import type { SpotTradeRecordRowDto } from '~/domain/models/dto/spot-trade-record-row-dto'
import type { SpotTradeMarketSummaryDto } from '~/domain/models/dto/spot-trade-market-summary-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class SpotTradeListDto {
  constructor(
    public readonly periodLabel: LocalizedTextVo,
    public readonly tradeCountsLabel: LocalizedTextVo,
    public readonly marketSummaries: readonly SpotTradeMarketSummaryDto[],
    public readonly rows: readonly SpotTradeRecordRowDto[],
    public readonly pendingReviewCount: number,
    public readonly symbolOptions: readonly string[],
    public readonly emptyMessage: LocalizedTextVo | null,
  ) {}
}
