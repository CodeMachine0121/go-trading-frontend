import type { ContractTradeDraftFeePreviewDto } from '~/domain/models/dto/contract-trade-draft-fee-preview-dto'
import type { ContractTradeDraftFillSizePreviewDto } from '~/domain/models/dto/contract-trade-draft-fill-size-preview-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class ContractTradeDraftPreviewDto {
  constructor(
    public readonly positionText: string,
    public readonly averageEntryPriceText: string | null,
    public readonly stopLossDistanceText: LocalizedTextVo | null,
    public readonly plannedRiskText: string | null,
    public readonly takeProfitDistanceText: LocalizedTextVo | null,
    public readonly entrySlippageText: LocalizedTextVo | null,
    public readonly fees: readonly ContractTradeDraftFeePreviewDto[],
    public readonly feeRateMissing: boolean,
    public readonly missingFieldMessage: LocalizedTextVo | null,
    public readonly fillSizes: readonly ContractTradeDraftFillSizePreviewDto[],
    public readonly entryNotionalText: string | null,
    public readonly entryMarginText: string | null,
    public readonly quantityLabel: LocalizedTextVo,
  ) {}
}
