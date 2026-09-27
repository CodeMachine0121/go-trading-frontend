import Decimal from 'decimal.js'
import type { ContractTradeStatistics } from '~/domain/models/entities/contract-trade-statistics'
import type { ContractTradeSourceGroup } from '~/domain/models/entities/contract-trade-source-group'
import { ContractTradeStatisticsDto } from '~/domain/models/dto/contract-trade-statistics-dto'
import { TradeChartPointDto } from '~/domain/models/dto/trade-chart-point-dto'
import { TradeDistributionBarDto } from '~/domain/models/dto/trade-distribution-bar-dto'
import { ContractTradeMistakeCostRowDto } from '~/domain/models/dto/contract-trade-mistake-cost-row-dto'
import { ContractTradeSourceComparisonRowDto } from '~/domain/models/dto/contract-trade-source-comparison-row-dto'
import { TradeFigureVo } from '~/domain/models/vo/trade-figure-vo'
import { TradeStatisticsPeriodDomain } from '~/domain/models/domains/trade-statistics-period-domain'
import { JournalNumberDomain } from '~/domain/models/domains/journal-number-domain'

const NOT_APPLICABLE_TEXT = '不適用'
const NO_CLOSED_TRADES_MESSAGE = '這段期間沒有已平倉交易'
const NO_LINKED_TRADES_TEXT = '沒有來自機器人連結的交易'
const RATIO_FRACTION_DIGITS = 0
const FACTOR_FRACTION_DIGITS = 2
const PROFIT_FACTOR_NOTE = '總賺 ÷ 總賠'
const SLIPPAGE_FRACTION_DIGITS = 2
const PERCENT = 100

export class ContractTradeStatisticsDomain {
  constructor(private readonly statistics: ContractTradeStatistics) {}

  get periodLabel(): string {
    return new TradeStatisticsPeriodDomain(this.statistics.period).label
  }

  summaryFigures(): TradeFigureVo[] {
    return [
      this.netProfitFigure(),
      this.winRateFigure(),
      this.averageRMultipleFigure(),
      this.profitFactorFigure(),
      this.feeShareFigure(),
    ]
  }

  toDto(): ContractTradeStatisticsDto {
    if (this.statistics.closedTradeCount === 0) {
      return new ContractTradeStatisticsDto(this.periodLabel, NO_CLOSED_TRADES_MESSAGE, [], null, [], [], [], [], '已平倉 0 筆', null)
    }

    const slippage = this.statistics.averageEntrySlippagePercentage
    const largestMistakeCost = Decimal.max(0, ...this.statistics.mistakeCosts.map(mistakeCost => mistakeCost.rMultipleTotal.abs()))
    const lastCumulativePoint = this.statistics.cumulativeRMultiples.at(-1)

    return new ContractTradeStatisticsDto(
      this.periodLabel,
      null,
      [
        this.netProfitFigure(),
        this.winRateFigure(),
        this.averageRMultipleFigure(),
        this.profitFactorFigure(),
        slippage === null || this.statistics.slippageTradeCount === 0
          ? new TradeFigureVo('平均進場滑點', NO_LINKED_TRADES_TEXT, 'muted')
          : new TradeFigureVo(
              '平均進場滑點',
              new JournalNumberDomain(slippage).percentage(SLIPPAGE_FRACTION_DIGITS),
              'neutral',
              `${this.statistics.slippageTradeCount} 筆來自機器人連結`),
        this.feeShareFigure(),
      ],
      this.statistics.excludedFromRMultipleCount === 0
        ? null
        : `${this.statistics.excludedFromRMultipleCount} 筆沒設止損，未計入 R`,
      this.statistics.cumulativeRMultiples.map(point => new TradeChartPointDto(
        point.closedAt, point.cumulativeRMultiple.toNumber())),
      this.statistics.rMultipleDistribution.map(bucket => new TradeDistributionBarDto(
        bucket.label,
        bucket.count,
        bucket.profitable ? 'success' : 'danger',
        (bucket.count / Math.max(1, ...this.statistics.rMultipleDistribution.map(other => other.count))) * PERCENT)),
      this.statistics.mistakeCosts.map(mistakeCost => new ContractTradeMistakeCostRowDto(
        mistakeCost.tagName,
        `${mistakeCost.tradeCount} 筆`,
        new JournalNumberDomain(mistakeCost.rMultipleTotal).rMultiple(),
        new JournalNumberDomain(mistakeCost.rMultipleTotal).tone(),
        largestMistakeCost.isZero()
          ? 0
          : mistakeCost.rMultipleTotal.abs().dividedBy(largestMistakeCost).times(PERCENT).toNumber())),
      [
        this.sourceComparisonRow('有關聯策略', this.statistics.linkedGroup),
        this.sourceComparisonRow('自行判斷', this.statistics.selfJudgedGroup),
      ],
      `已平倉 ${this.statistics.closedTradeCount} 筆`,
      lastCumulativePoint === undefined
        ? null
        : new TradeFigureVo(
            '累積 R',
            new JournalNumberDomain(lastCumulativePoint.cumulativeRMultiple).rMultiple(),
            new JournalNumberDomain(lastCumulativePoint.cumulativeRMultiple).tone()),
    )
  }

  private netProfitFigure(): TradeFigureVo {
    return new TradeFigureVo(
      '淨損益',
      new JournalNumberDomain(this.statistics.netProfit).signedAmount(),
      new JournalNumberDomain(this.statistics.netProfit).tone(),
      'USDT，已扣費用')
  }

  private winRateFigure(): TradeFigureVo {
    return new TradeFigureVo(
      '勝率',
      this.ratioText(this.statistics.winRate),
      'neutral',
      `${this.statistics.winCount} 勝 ${this.statistics.closedTradeCount - this.statistics.winCount} 敗`)
  }

  private averageRMultipleFigure(): TradeFigureVo {
    const averageRMultiple = this.statistics.averageRMultiple

    return averageRMultiple === null
      ? new TradeFigureVo('平均 R', NOT_APPLICABLE_TEXT, 'muted')
      : new TradeFigureVo(
          '平均 R',
          new JournalNumberDomain(averageRMultiple).rMultiple(),
          new JournalNumberDomain(averageRMultiple).tone(),
          '每筆期望值')
  }

  private profitFactorFigure(): TradeFigureVo {
    const profitFactor = this.statistics.profitFactor

    return profitFactor === null
      ? new TradeFigureVo('獲利因子', NOT_APPLICABLE_TEXT, 'muted', PROFIT_FACTOR_NOTE)
      : new TradeFigureVo('獲利因子', profitFactor.toFixed(FACTOR_FRACTION_DIGITS), 'neutral', PROFIT_FACTOR_NOTE)
  }

  private feeShareFigure(): TradeFigureVo {
    return new TradeFigureVo(
      '費用佔毛利', this.ratioText(this.statistics.feeShareOfGrossProfit), 'neutral', '手續費＋資金費')
  }

  private sourceComparisonRow(label: string, group: ContractTradeSourceGroup): ContractTradeSourceComparisonRowDto {
    return new ContractTradeSourceComparisonRowDto(
      label,
      `${group.tradeCount} 筆`,
      this.ratioText(group.winRate),
      group.averageRMultiple === null
        ? NOT_APPLICABLE_TEXT
        : new JournalNumberDomain(group.averageRMultiple).rMultiple(),
    )
  }

  private ratioText(ratio: number | null): string {
    return ratio === null ? NOT_APPLICABLE_TEXT : `${(ratio * PERCENT).toFixed(RATIO_FRACTION_DIGITS)}%`
  }
}
