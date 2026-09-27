import type Decimal from 'decimal.js'
import type { TradeStatisticsPeriod } from '~/domain/models/vo/trade-statistics-period-vo'
import type { ContractTradeCumulativePoint } from '~/domain/models/entities/contract-trade-cumulative-point'
import type { ContractTradeDistributionBucket } from '~/domain/models/entities/contract-trade-distribution-bucket'
import type { ContractTradeMistakeCost } from '~/domain/models/entities/contract-trade-mistake-cost'
import type { ContractTradeSourceGroup } from '~/domain/models/entities/contract-trade-source-group'

export class ContractTradeStatistics {
  constructor(
    public readonly period: TradeStatisticsPeriod,
    public readonly closedTradeCount: number,
    public readonly winCount: number,
    public readonly netProfit: Decimal,
    public readonly winRate: number | null,
    public readonly averageRMultiple: Decimal | null,
    public readonly profitFactor: Decimal | null,
    public readonly feeShareOfGrossProfit: number | null,
    public readonly averageEntrySlippagePercentage: Decimal | null,
    public readonly slippageTradeCount: number,
    public readonly excludedFromRMultipleCount: number,
    public readonly cumulativeRMultiples: readonly ContractTradeCumulativePoint[],
    public readonly rMultipleDistribution: readonly ContractTradeDistributionBucket[],
    public readonly mistakeCosts: readonly ContractTradeMistakeCost[],
    public readonly linkedGroup: ContractTradeSourceGroup,
    public readonly selfJudgedGroup: ContractTradeSourceGroup,
  ) {}
}
