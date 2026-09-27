import type { SpotTradeMarketStatisticsDto } from '~/domain/models/dto/spot-trade-market-statistics-dto'

export class SpotTradeStatisticsDto {
  constructor(
    public readonly periodLabel: string,
    public readonly markets: readonly SpotTradeMarketStatisticsDto[],
  ) {}
}
