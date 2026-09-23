/**
 * DTO：成績單上的五格，已經寫成畫面上的字。不適用的那幾格就寫「不適用」。
 */
export class BacktestTradeStatisticsDto {
  constructor(
    public readonly profitFactor: string,
    public readonly expectancy: string,
    public readonly averageHoldingTime: string,
    public readonly maximumConsecutiveLossCount: string,
    public readonly costToGrossProfitRatio: string,
  ) {}
}
