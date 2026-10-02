import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/**
 * DTO：成績單上的五格，已經寫成畫面上的字。不適用的那幾格就寫「不適用」。
 */
export class BacktestTradeStatisticsDto {
  constructor(
    public readonly profitFactor: LocalizedTextVo,
    public readonly expectancy: LocalizedTextVo,
    public readonly averageHoldingTime: LocalizedTextVo,
    public readonly maximumConsecutiveLossCount: LocalizedTextVo,
    public readonly costToGrossProfitRatio: LocalizedTextVo,
  ) {}
}
