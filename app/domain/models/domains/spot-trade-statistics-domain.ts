import type { SpotTradeStatistics } from '~/domain/models/entities/spot-trade-statistics'
import { SpotTradeStatisticsDto } from '~/domain/models/dto/spot-trade-statistics-dto'
import { TradeStatisticsPeriodDomain } from '~/domain/models/domains/trade-statistics-period-domain'
import { SpotTradeMarketStatisticsDomain } from '~/domain/models/domains/spot-trade-market-statistics-domain'

export class SpotTradeStatisticsDomain {
  constructor(private readonly statistics: SpotTradeStatistics) {}

  get periodLabel(): string {
    return new TradeStatisticsPeriodDomain(this.statistics.period).label
  }

  get marketDomains(): SpotTradeMarketStatisticsDomain[] {
    return this.statistics.markets.map(market => new SpotTradeMarketStatisticsDomain(market))
  }

  toDto(): SpotTradeStatisticsDto {
    return new SpotTradeStatisticsDto(this.periodLabel, this.marketDomains.map(market => market.toDto()))
  }
}
