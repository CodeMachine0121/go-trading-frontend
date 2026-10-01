import type { TradeFigureVo } from '~/domain/models/vo/trade-figure-vo'
import type { TradeChartPointDto } from '~/domain/models/dto/trade-chart-point-dto'
import type { TradeDistributionBarDto } from '~/domain/models/dto/trade-distribution-bar-dto'
import type { ContractTradeMistakeCostRowDto } from '~/domain/models/dto/contract-trade-mistake-cost-row-dto'
import type { ContractTradeSourceComparisonRowDto } from '~/domain/models/dto/contract-trade-source-comparison-row-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class ContractTradeStatisticsDto {
  constructor(
    public readonly periodLabel: LocalizedTextVo,
    public readonly emptyMessage: LocalizedTextVo | null,
    public readonly figures: readonly TradeFigureVo[],
    public readonly exclusionNote: LocalizedTextVo | null,
    public readonly cumulativePoints: readonly TradeChartPointDto[],
    public readonly distribution: readonly TradeDistributionBarDto[],
    public readonly mistakeCosts: readonly ContractTradeMistakeCostRowDto[],
    public readonly sourceComparison: readonly ContractTradeSourceComparisonRowDto[],
    public readonly closedTradeCountText: LocalizedTextVo,
    public readonly totalRMultiple: TradeFigureVo | null,
  ) {}
}
