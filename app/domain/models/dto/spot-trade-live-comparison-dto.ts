import type { SpotTradeLiveComparisonRowDto } from '~/domain/models/dto/spot-trade-live-comparison-row-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class SpotTradeLiveComparisonDto {
  constructor(
    public readonly tradingStrategyName: string,
    public readonly notice: LocalizedTextVo | null,
    public readonly rows: readonly SpotTradeLiveComparisonRowDto[],
    public readonly strategyEntrySlippageText: LocalizedTextVo | null,
    public readonly costNote: LocalizedTextVo,
  ) {}
}
