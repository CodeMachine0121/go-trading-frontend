import type { SpotTradeStatistics } from '~/domain/models/entities/spot-trade-statistics'
import { SpotTradeStatisticsDto } from '~/domain/models/dto/spot-trade-statistics-dto'
import { TradeStatisticsPeriodDomain } from '~/domain/models/domains/trade-statistics-period-domain'
import { SpotTradeMarketStatisticsDomain } from '~/domain/models/domains/spot-trade-market-statistics-domain'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class SpotTradeStatisticsDomain {
  constructor(private readonly statistics: SpotTradeStatistics) {}

  get periodLabel(): LocalizedTextVo {
    return new TradeStatisticsPeriodDomain(this.statistics.period).label
  }

  get marketDomains(): SpotTradeMarketStatisticsDomain[] {
    return this.statistics.markets.map(market => new SpotTradeMarketStatisticsDomain(market))
  }

  toDto(): SpotTradeStatisticsDto {
    return new SpotTradeStatisticsDto(this.periodLabel, this.marketDomains.map(market => market.toDto()))
  }
}
