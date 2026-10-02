import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class ContractTradePerformanceDto {
  constructor(
    public readonly closedTradeCountText: LocalizedTextVo,
    public readonly winRateText: LocalizedTextVo,
    public readonly longWinRateText: LocalizedTextVo,
    public readonly shortWinRateText: LocalizedTextVo,
    public readonly entrySlippageText: LocalizedTextVo,
    public readonly entrySlippageNote: LocalizedTextVo | null,
  ) {}
}
