import type { TradeFigureVo } from '~/domain/models/vo/trade-figure-vo'

export class SpotTradeMarketSummaryDto {
  constructor(
    public readonly marketLabel: string,
    public readonly figures: readonly TradeFigureVo[],
  ) {}
}
