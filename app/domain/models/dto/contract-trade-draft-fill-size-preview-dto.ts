import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class ContractTradeDraftFillSizePreviewDto {
  constructor(
    public readonly sizeText: LocalizedTextVo | null,
    public readonly feeShareText: LocalizedTextVo | null,
  ) {}
}
