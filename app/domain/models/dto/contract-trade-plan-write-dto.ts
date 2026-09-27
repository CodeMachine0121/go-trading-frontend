import type Decimal from 'decimal.js'

export class ContractTradePlanWriteDto {
  constructor(
    public readonly plannedStopLossPrice: Decimal | null,
    public readonly plannedTakeProfitPrice: Decimal | null,
    public readonly entryReason: string,
    public readonly confidence: number | null,
  ) {}
}
