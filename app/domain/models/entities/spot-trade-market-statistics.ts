import type Decimal from 'decimal.js'
import type { SpotTradeMarket } from '~/domain/models/vo/spot-trade-market-vo'
import type { SpotTradeCumulativePoint } from '~/domain/models/entities/spot-trade-cumulative-point'
import type { SpotTradeDistributionBucket } from '~/domain/models/entities/spot-trade-distribution-bucket'
import type { SpotTradeMistakeCost } from '~/domain/models/entities/spot-trade-mistake-cost'
import type { SpotTradeSourceGroup } from '~/domain/models/entities/spot-trade-source-group'

export class SpotTradeMarketStatistics {
  constructor(
    public readonly market: SpotTradeMarket,
    public readonly currency: string,
    public readonly closedTradeCount: number,
    public readonly winCount: number,
    public readonly winRate: number | null,
    public readonly netProfit: Decimal,
    public readonly averageReturnRate: number | null,
    public readonly profitFactor: Decimal | null,
    public readonly averageRMultiple: Decimal | null,
    public readonly rTradeCount: number,
    public readonly cumulativeProfit: readonly SpotTradeCumulativePoint[],
    public readonly returnDistribution: readonly SpotTradeDistributionBucket[],
    public readonly mistakeCosts: readonly SpotTradeMistakeCost[],
    public readonly linkedGroup: SpotTradeSourceGroup,
    public readonly selfJudgedGroup: SpotTradeSourceGroup,
    public readonly averageEntrySlippagePercentage: Decimal | null,
    public readonly entrySlippageTradeCount: number,
  ) {}
}
