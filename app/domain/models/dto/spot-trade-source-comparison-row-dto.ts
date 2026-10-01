import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import type { TradeSourceFilter } from '~/domain/models/vo/trade-source-filter-vo'

export class SpotTradeSourceComparisonRowDto {
  constructor(
    public readonly source: Exclude<TradeSourceFilter, 'all'>,
    public readonly label: LocalizedTextVo,
    public readonly tradeCountText: LocalizedTextVo,
    public readonly winRateText: LocalizedTextVo,
    public readonly averageReturnRateText: LocalizedTextVo,
  ) {}
}
