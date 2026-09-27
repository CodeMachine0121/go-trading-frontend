import type { SpotTradeLiveComparisonRowDto } from '~/domain/models/dto/spot-trade-live-comparison-row-dto'

export class SpotTradeLiveComparisonDto {
  constructor(
    public readonly tradingStrategyName: string,
    public readonly notice: string | null,
    public readonly rows: readonly SpotTradeLiveComparisonRowDto[],
    public readonly strategyEntrySlippageText: string | null,
    public readonly costNote: string,
  ) {}
}
