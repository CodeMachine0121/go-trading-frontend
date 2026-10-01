import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class SpotTradePerformanceDto {
  constructor(
    public readonly closedTradeCountText: LocalizedTextVo,
    public readonly winRateText: LocalizedTextVo,
    public readonly entrySlippageText: LocalizedTextVo,
    public readonly entrySlippageNote: LocalizedTextVo | null,
  ) {}
}
