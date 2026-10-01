import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class ContractTradeDraftFeePreviewDto {
  constructor(
    public readonly automaticFeeText: string,
    public readonly note: LocalizedTextVo | null,
  ) {}
}
