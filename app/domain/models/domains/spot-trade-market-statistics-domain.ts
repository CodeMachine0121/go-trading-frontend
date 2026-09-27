import Decimal from 'decimal.js'
import type { SpotTradeMarketStatistics } from '~/domain/models/entities/spot-trade-market-statistics'
import type { SpotTradeSourceGroup } from '~/domain/models/entities/spot-trade-source-group'
import { SpotTradeMarketStatisticsDto } from '~/domain/models/dto/spot-trade-market-statistics-dto'
import { SpotTradeMistakeCostRowDto } from '~/domain/models/dto/spot-trade-mistake-cost-row-dto'
import { SpotTradeSourceComparisonRowDto } from '~/domain/models/dto/spot-trade-source-comparison-row-dto'
import { TradeChartPointDto } from '~/domain/models/dto/trade-chart-point-dto'
import { TradeDistributionBarDto } from '~/domain/models/dto/trade-distribution-bar-dto'
import { TradeFigureVo } from '~/domain/models/vo/trade-figure-vo'
import { SpotTradeMarketDomain } from '~/domain/models/domains/spot-trade-market-domain'
import { JournalNumberDomain } from '~/domain/models/domains/journal-number-domain'

const NOT_APPLICABLE_TEXT = '不適用'
const NO_CLOSED_TRADES_MESSAGE = '這段期間沒有已平倉交易'
const NO_LINKED_TRADES_TEXT = '沒有來自機器人連結的交易'
const PROFIT_FACTOR_NOTE = '總賺 ÷ 總賠'
const RATIO_FRACTION_DIGITS = 0
const RETURN_RATE_FRACTION_DIGITS = 2
const FACTOR_FRACTION_DIGITS = 2
const SLIPPAGE_FRACTION_DIGITS = 2
const PERCENT = 100

export class SpotTradeMarketStatisticsDomain {
  constructor(private readonly statistics: SpotTradeMarketStatistics) {}

  get marketLabel(): string {
    return new SpotTradeMarketDomain(this.statistics.market).label
  }

  get closedTradeCount(): number {
    return this.statistics.closedTradeCount
  }

  summaryFigures(): TradeFigureVo[] {
    return [
      this.netProfitFigure(),
      this.winRateFigure(),
      this.averageReturnRateFigure(),
      this.profitFactorFigure(),
    ]
  }

  toDto(): SpotTradeMarketStatisticsDto {
    const closedTradeCountText = `已平倉 ${this.statistics.closedTradeCount} 筆`
    if (this.statistics.closedTradeCount === 0) {
      return new SpotTradeMarketStatisticsDto(
        this.marketLabel, closedTradeCountText, NO_CLOSED_TRADES_MESSAGE, [], null, [], null, [], [], [])
    }

    const slippage = this.statistics.averageEntrySlippagePercentage
    const largestMistakeCost = Decimal.max(0, ...this.statistics.mistakeCosts.map(mistakeCost => mistakeCost.totalNetProfit.abs()))
    const largestBucketCount = Math.max(1, ...this.statistics.returnDistribution.map(bucket => bucket.count))
    const lastCumulativePoint = this.statistics.cumulativeProfit.at(-1)

    return new SpotTradeMarketStatisticsDto(
      this.marketLabel,
      closedTradeCountText,
      null,
      [
        ...this.summaryFigures(),
        this.averageRMultipleFigure(),
        slippage === null || this.statistics.entrySlippageTradeCount === 0
          ? new TradeFigureVo('平均進場滑點', NO_LINKED_TRADES_TEXT, 'muted')
          : new TradeFigureVo(
              '平均進場滑點',
              new JournalNumberDomain(slippage).percentage(SLIPPAGE_FRACTION_DIGITS),
              'neutral',
              `${this.statistics.entrySlippageTradeCount} 筆來自機器人連結`),
      ],
      this.statistics.rTradeCount === this.statistics.closedTradeCount
        ? null
        : `平均 R 以 ${this.statistics.rTradeCount} 筆計（有計畫止損的交易）`,
      this.statistics.cumulativeProfit.map(point => new TradeChartPointDto(
        point.closedAt, point.cumulativeNetProfit.toNumber())),
      lastCumulativePoint === undefined
        ? null
        : new TradeFigureVo(
            '累積損益',
            new JournalNumberDomain(lastCumulativePoint.cumulativeNetProfit).signedAmount(),
            new JournalNumberDomain(lastCumulativePoint.cumulativeNetProfit).tone()),
      this.statistics.returnDistribution.map(bucket => new TradeDistributionBarDto(
        bucket.label,
        bucket.count,
        bucket.profitable ? 'success' : 'danger',
        (bucket.count / largestBucketCount) * PERCENT)),
      this.statistics.mistakeCosts.map(mistakeCost => new SpotTradeMistakeCostRowDto(
        mistakeCost.tagName,
        `${mistakeCost.tradeCount} 筆`,
        new JournalNumberDomain(mistakeCost.totalNetProfit).signedAmount(),
        this.returnRateText(mistakeCost.averageReturnRate),
        new JournalNumberDomain(mistakeCost.totalNetProfit).tone(),
        largestMistakeCost.isZero()
          ? 0
          : mistakeCost.totalNetProfit.abs().dividedBy(largestMistakeCost).times(PERCENT).toNumber())),
      [
        this.sourceComparisonRow('有關聯策略', this.statistics.linkedGroup),
        this.sourceComparisonRow('自行判斷', this.statistics.selfJudgedGroup),
      ],
    )
  }

  private netProfitFigure(): TradeFigureVo {
    return new TradeFigureVo(
      '淨損益',
      new JournalNumberDomain(this.statistics.netProfit).signedAmount(),
      new JournalNumberDomain(this.statistics.netProfit).tone(),
      `${this.statistics.currency}，已扣手續費`)
  }

  private winRateFigure(): TradeFigureVo {
    return new TradeFigureVo(
      '勝率',
      this.ratioText(this.statistics.winRate),
      'neutral',
      `${this.statistics.winCount} 勝 ${this.statistics.closedTradeCount - this.statistics.winCount} 敗`)
  }

  private averageReturnRateFigure(): TradeFigureVo {
    const averageReturnRate = this.statistics.averageReturnRate

    return averageReturnRate === null
      ? new TradeFigureVo('平均報酬率', NOT_APPLICABLE_TEXT, 'muted')
      : new TradeFigureVo(
          '平均報酬率',
          this.returnRateText(averageReturnRate),
          new JournalNumberDomain(new Decimal(averageReturnRate)).tone(),
          '每筆淨損益 ÷ 買進成本')
  }

  private profitFactorFigure(): TradeFigureVo {
    const profitFactor = this.statistics.profitFactor

    return profitFactor === null
      ? new TradeFigureVo('獲利因子', NOT_APPLICABLE_TEXT, 'muted', PROFIT_FACTOR_NOTE)
      : new TradeFigureVo('獲利因子', profitFactor.toFixed(FACTOR_FRACTION_DIGITS), 'neutral', PROFIT_FACTOR_NOTE)
  }

  private averageRMultipleFigure(): TradeFigureVo {
    const averageRMultiple = this.statistics.averageRMultiple

    return averageRMultiple === null
      ? new TradeFigureVo('平均 R', NOT_APPLICABLE_TEXT, 'muted', '沒有設計畫止損的交易')
      : new TradeFigureVo(
          '平均 R',
          new JournalNumberDomain(averageRMultiple).rMultiple(),
          new JournalNumberDomain(averageRMultiple).tone(),
          `以 ${this.statistics.rTradeCount} 筆計`)
  }

  private sourceComparisonRow(label: string, group: SpotTradeSourceGroup): SpotTradeSourceComparisonRowDto {
    return new SpotTradeSourceComparisonRowDto(
      label,
      `${group.tradeCount} 筆`,
      this.ratioText(group.winRate),
      this.returnRateText(group.averageReturnRate),
    )
  }

  private returnRateText(returnRate: number | null): string {
    return returnRate === null
      ? NOT_APPLICABLE_TEXT
      : new JournalNumberDomain(new Decimal(returnRate).times(PERCENT)).signedPercentage(RETURN_RATE_FRACTION_DIGITS)
  }

  private ratioText(ratio: number | null): string {
    return ratio === null ? NOT_APPLICABLE_TEXT : `${(ratio * PERCENT).toFixed(RATIO_FRACTION_DIGITS)}%`
  }
}
