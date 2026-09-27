export class SpotTradeDraftPreviewDto {
  constructor(
    public readonly holdingText: string,
    public readonly averageBuyPriceText: string | null,
    public readonly stopLossDistanceText: string | null,
    public readonly plannedRiskText: string | null,
    public readonly takeProfitDistanceText: string | null,
    public readonly entrySlippageText: string | null,
    public readonly wholeSharesMessage: string | null,
    public readonly missingFieldMessage: string | null,
  ) {}
}
