import type { TradeFigureVo } from '~/domain/models/vo/trade-figure-vo'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class SpotTradeMarketSummaryDto {
  constructor(
    public readonly marketLabel: LocalizedTextVo,
    public readonly figures: readonly TradeFigureVo[],
  ) {}
}
