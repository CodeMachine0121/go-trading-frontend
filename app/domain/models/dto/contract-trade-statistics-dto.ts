import type { ContractTradeFigureVo } from '~/domain/models/vo/contract-trade-figure-vo'
import type { ContractTradeChartPointDto } from '~/domain/models/dto/contract-trade-chart-point-dto'
import type { ContractTradeDistributionBarDto } from '~/domain/models/dto/contract-trade-distribution-bar-dto'
import type { ContractTradeMistakeCostRowDto } from '~/domain/models/dto/contract-trade-mistake-cost-row-dto'
import type { ContractTradeSourceComparisonRowDto } from '~/domain/models/dto/contract-trade-source-comparison-row-dto'

export class ContractTradeStatisticsDto {
  constructor(
    public readonly periodLabel: string,
    public readonly emptyMessage: string | null,
    public readonly figures: readonly ContractTradeFigureVo[],
    public readonly exclusionNote: string | null,
    public readonly cumulativePoints: readonly ContractTradeChartPointDto[],
    public readonly distribution: readonly ContractTradeDistributionBarDto[],
    public readonly mistakeCosts: readonly ContractTradeMistakeCostRowDto[],
    public readonly sourceComparison: readonly ContractTradeSourceComparisonRowDto[],
  ) {}
}
