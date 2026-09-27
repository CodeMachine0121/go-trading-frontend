import type { ContractTradeLiveComparisonRowDto } from '~/domain/models/dto/contract-trade-live-comparison-row-dto'

export class ContractTradeLiveComparisonDto {
  constructor(
    public readonly tradingStrategyName: string,
    public readonly notice: string | null,
    public readonly rows: readonly ContractTradeLiveComparisonRowDto[],
  ) {}
}
