import type { TradeFigureVo } from '~/domain/models/vo/trade-figure-vo'
import type { TradeChartPointDto } from '~/domain/models/dto/trade-chart-point-dto'
import type { TradeDistributionBarDto } from '~/domain/models/dto/trade-distribution-bar-dto'
import type { SpotTradeMistakeCostRowDto } from '~/domain/models/dto/spot-trade-mistake-cost-row-dto'
import type { SpotTradeSourceComparisonRowDto } from '~/domain/models/dto/spot-trade-source-comparison-row-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import type { SpotTradeMarket } from '~/domain/models/vo/spot-trade-market-vo'

export class SpotTradeMarketStatisticsDto {
  constructor(
    public readonly market: SpotTradeMarket,
    public readonly marketLabel: LocalizedTextVo,
    public readonly closedTradeCountText: LocalizedTextVo,
    public readonly emptyMessage: LocalizedTextVo | null,
    public readonly figures: readonly TradeFigureVo[],
    public readonly rMultipleNote: LocalizedTextVo | null,
    public readonly cumulativePoints: readonly TradeChartPointDto[],
    public readonly totalProfit: TradeFigureVo | null,
    public readonly distribution: readonly TradeDistributionBarDto[],
    public readonly mistakeCosts: readonly SpotTradeMistakeCostRowDto[],
    public readonly sourceComparison: readonly SpotTradeSourceComparisonRowDto[],
  ) {}
}
