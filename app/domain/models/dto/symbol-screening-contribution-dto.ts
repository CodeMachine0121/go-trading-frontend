export class SymbolScreeningContributionDto {
  constructor(
    public readonly inMarketShareText: string,
    public readonly overlapShareText: string,
    public readonly baselineLongestGapDays: number,
    public readonly combinedLongestGapDays: number,
    public readonly gapReductionDays: number,
  ) {}
}
