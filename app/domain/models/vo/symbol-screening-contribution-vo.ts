export class SymbolScreeningContributionVo {
  constructor(
    public readonly inMarketShare: number,
    public readonly overlapShare: number,
    public readonly baselineLongestGapDays: number,
    public readonly combinedLongestGapDays: number,
    public readonly gapReductionDays: number,
  ) {}
}
