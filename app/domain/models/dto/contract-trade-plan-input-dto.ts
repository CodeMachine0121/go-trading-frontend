export class ContractTradePlanInputDto {
  constructor(
    public readonly plannedStopLossText: string,
    public readonly plannedTakeProfitText: string,
    public readonly entryReason: string,
    public readonly confidence: number | null,
  ) {}
}
