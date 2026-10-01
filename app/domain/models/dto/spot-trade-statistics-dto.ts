import type { SpotTradeMarketStatisticsDto } from '~/domain/models/dto/spot-trade-market-statistics-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class SpotTradeStatisticsDto {
  constructor(
    public readonly periodLabel: LocalizedTextVo,
    public readonly markets: readonly SpotTradeMarketStatisticsDto[],
  ) {}
}
