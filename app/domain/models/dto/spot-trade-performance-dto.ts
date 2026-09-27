export class SpotTradePerformanceDto {
  constructor(
    public readonly closedTradeCountText: string,
    public readonly winRateText: string,
    public readonly entrySlippageText: string,
    public readonly entrySlippageNote: string | null,
  ) {}
}
