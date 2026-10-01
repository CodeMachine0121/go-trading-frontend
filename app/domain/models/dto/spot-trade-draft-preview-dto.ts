import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class SpotTradeDraftPreviewDto {
  constructor(
    public readonly holdingText: string,
    public readonly averageBuyPriceText: string | null,
    public readonly stopLossDistanceText: LocalizedTextVo | null,
    public readonly plannedRiskText: string | null,
    public readonly takeProfitDistanceText: LocalizedTextVo | null,
    public readonly entrySlippageText: LocalizedTextVo | null,
    public readonly wholeSharesMessage: LocalizedTextVo | null,
    public readonly missingFieldMessage: LocalizedTextVo | null,
  ) {}
}
