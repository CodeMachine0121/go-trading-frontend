import type { ContractTradeLiveComparisonRowDto } from '~/domain/models/dto/contract-trade-live-comparison-row-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class ContractTradeLiveComparisonDto {
  constructor(
    public readonly tradingStrategyName: string,
    public readonly notice: LocalizedTextVo | null,
    public readonly rows: readonly ContractTradeLiveComparisonRowDto[],
    public readonly strategyEntrySlippageText: LocalizedTextVo | null,
  ) {}
}
