export class ContractTradePerformanceDto {
  constructor(
    public readonly closedTradeCountText: string,
    public readonly winRateText: string,
    public readonly longWinRateText: string,
    public readonly shortWinRateText: string,
    public readonly entrySlippageText: string,
    public readonly entrySlippageNote: string | null,
  ) {}
}
