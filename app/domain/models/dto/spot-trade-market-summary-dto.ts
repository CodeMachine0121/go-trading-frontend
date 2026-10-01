import type { TradeFigureVo } from '~/domain/models/vo/trade-figure-vo'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import type { SpotTradeMarket } from '~/domain/models/vo/spot-trade-market-vo'

export class SpotTradeMarketSummaryDto {
  constructor(
    public readonly market: SpotTradeMarket,
    public readonly marketLabel: LocalizedTextVo,
    public readonly figures: readonly TradeFigureVo[],
  ) {}
}
