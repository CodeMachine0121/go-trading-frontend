import type { ContractTradeDraftFeePreviewDto } from '~/domain/models/dto/contract-trade-draft-fee-preview-dto'

export class ContractTradeDraftPreviewDto {
  constructor(
    public readonly positionText: string,
    public readonly averageEntryPriceText: string | null,
    public readonly stopLossDistanceText: string | null,
    public readonly plannedRiskText: string | null,
    public readonly takeProfitDistanceText: string | null,
    public readonly entrySlippageText: string | null,
    public readonly fees: readonly ContractTradeDraftFeePreviewDto[],
    public readonly feeRateMissing: boolean,
    public readonly missingFieldMessage: string | null,
  ) {}
}
