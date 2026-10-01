import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class ContractTradeSourceComparisonRowDto {
  constructor(
    public readonly label: LocalizedTextVo,
    public readonly tradeCountText: LocalizedTextVo,
    public readonly winRateText: LocalizedTextVo,
    public readonly averageRMultipleText: LocalizedTextVo,
  ) {}
}
