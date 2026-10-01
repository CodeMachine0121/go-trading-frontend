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
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

const NOT_APPLICABLE_TEXT = new LocalizedTextVo('不適用', 'N/A')
const NO_CLOSED_TRADES_MESSAGE = new LocalizedTextVo('這段期間沒有已平倉交易', 'No closed trades in this period')
const NO_LINKED_TRADES_TEXT = new LocalizedTextVo('沒有來自機器人連結的交易', 'No trades from bot links')
const RATIO_FRACTION_DIGITS = 0
const FACTOR_FRACTION_DIGITS = 2
const PROFIT_FACTOR_NOTE = new LocalizedTextVo('總賺 ÷ 總賠', 'Gross profit ÷ gross loss')
const AVERAGE_ENTRY_SLIPPAGE_LABEL = new LocalizedTextVo('平均進場滑點', 'Avg entry slippage')
const AVERAGE_R_MULTIPLE_LABEL = new LocalizedTextVo('平均 R', 'Avg R')
const PROFIT_FACTOR_LABEL = new LocalizedTextVo('獲利因子', 'Profit factor')
const SLIPPAGE_FRACTION_DIGITS = 2
const PERCENT = 100

export class ContractTradeStatisticsDomain {
  constructor(private readonly statistics: ContractTradeStatistics) {}

  get periodLabel(): LocalizedTextVo {
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
      return new ContractTradeStatisticsDto(
        this.periodLabel, NO_CLOSED_TRADES_MESSAGE, [], null, [], [], [], [], this.closedTradeCountText(), null)
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
          ? new TradeFigureVo(AVERAGE_ENTRY_SLIPPAGE_LABEL, NO_LINKED_TRADES_TEXT, 'muted')
          : new TradeFigureVo(
              AVERAGE_ENTRY_SLIPPAGE_LABEL,
              new UntranslatedTextVo(new JournalNumberDomain(slippage).percentage(SLIPPAGE_FRACTION_DIGITS)),
              'neutral',
              new LocalizedTextVo(
                `${this.statistics.slippageTradeCount} 筆來自機器人連結`,
                `${this.statistics.slippageTradeCount} from bot links`)),
        this.feeShareFigure(),
      ],
      this.statistics.excludedFromRMultipleCount === 0
        ? null
        : new LocalizedTextVo(
            `${this.statistics.excludedFromRMultipleCount} 筆沒設止損，未計入 R`,
            `${this.statistics.excludedFromRMultipleCount} ${this.statistics.excludedFromRMultipleCount === 1 ? 'trade has' : 'trades have'} no stop loss and ${this.statistics.excludedFromRMultipleCount === 1 ? 'is' : 'are'} left out of R`),
      this.statistics.cumulativeRMultiples.map(point => new TradeChartPointDto(
        point.closedAt, point.cumulativeRMultiple.toNumber())),
      this.statistics.rMultipleDistribution.map(bucket => new TradeDistributionBarDto(
        bucket.label,
        bucket.count,
        bucket.profitable ? 'success' : 'danger',
        (bucket.count / Math.max(1, ...this.statistics.rMultipleDistribution.map(other => other.count))) * PERCENT)),
      this.statistics.mistakeCosts.map(mistakeCost => new ContractTradeMistakeCostRowDto(
        mistakeCost.tagName,
        this.tradeCountText(mistakeCost.tradeCount),
        new JournalNumberDomain(mistakeCost.rMultipleTotal).rMultiple(),
        new JournalNumberDomain(mistakeCost.rMultipleTotal).tone(),
        largestMistakeCost.isZero()
          ? 0
          : mistakeCost.rMultipleTotal.abs().dividedBy(largestMistakeCost).times(PERCENT).toNumber())),
      [
        this.sourceComparisonRow(new LocalizedTextVo('有關聯策略', 'Linked strategy'), this.statistics.linkedGroup),
        this.sourceComparisonRow(new LocalizedTextVo('自行判斷', 'Self-judged'), this.statistics.selfJudgedGroup),
      ],
      this.closedTradeCountText(),
      lastCumulativePoint === undefined
        ? null
        : new TradeFigureVo(
            new LocalizedTextVo('累積 R', 'Cumulative R'),
            new UntranslatedTextVo(new JournalNumberDomain(lastCumulativePoint.cumulativeRMultiple).rMultiple()),
            new JournalNumberDomain(lastCumulativePoint.cumulativeRMultiple).tone()),
    )
  }

  private netProfitFigure(): TradeFigureVo {
    return new TradeFigureVo(
      new LocalizedTextVo('淨損益', 'Net P&L'),
      new UntranslatedTextVo(new JournalNumberDomain(this.statistics.netProfit).signedAmount()),
      new JournalNumberDomain(this.statistics.netProfit).tone(),
      new LocalizedTextVo('USDT，已扣費用', 'USDT, after fees'))
  }

  private winRateFigure(): TradeFigureVo {
    return new TradeFigureVo(
      new LocalizedTextVo('勝率', 'Win rate'),
      this.ratioText(this.statistics.winRate),
      'neutral',
      new LocalizedTextVo(
        `${this.statistics.winCount} 勝 ${this.statistics.closedTradeCount - this.statistics.winCount} 敗`,
        `${this.statistics.winCount} W ${this.statistics.closedTradeCount - this.statistics.winCount} L`))
  }

  private averageRMultipleFigure(): TradeFigureVo {
    const averageRMultiple = this.statistics.averageRMultiple

    return averageRMultiple === null
      ? new TradeFigureVo(AVERAGE_R_MULTIPLE_LABEL, NOT_APPLICABLE_TEXT, 'muted')
      : new TradeFigureVo(
          AVERAGE_R_MULTIPLE_LABEL,
          new UntranslatedTextVo(new JournalNumberDomain(averageRMultiple).rMultiple()),
          new JournalNumberDomain(averageRMultiple).tone(),
          new LocalizedTextVo('每筆期望值', 'Expectancy per trade'))
  }

  private profitFactorFigure(): TradeFigureVo {
    const profitFactor = this.statistics.profitFactor

    return profitFactor === null
      ? new TradeFigureVo(PROFIT_FACTOR_LABEL, NOT_APPLICABLE_TEXT, 'muted', PROFIT_FACTOR_NOTE)
      : new TradeFigureVo(
          PROFIT_FACTOR_LABEL,
          new UntranslatedTextVo(profitFactor.toFixed(FACTOR_FRACTION_DIGITS)),
          'neutral',
          PROFIT_FACTOR_NOTE)
  }

  private feeShareFigure(): TradeFigureVo {
    return new TradeFigureVo(
      new LocalizedTextVo('費用佔毛利', 'Fees vs gross profit'),
      this.ratioText(this.statistics.feeShareOfGrossProfit),
      'neutral',
      new LocalizedTextVo('手續費＋資金費', 'Trading fees + funding fees'))
  }

  private sourceComparisonRow(label: LocalizedTextVo, group: ContractTradeSourceGroup): ContractTradeSourceComparisonRowDto {
    return new ContractTradeSourceComparisonRowDto(
      label,
      this.tradeCountText(group.tradeCount),
      this.ratioText(group.winRate),
      group.averageRMultiple === null
        ? NOT_APPLICABLE_TEXT
        : new UntranslatedTextVo(new JournalNumberDomain(group.averageRMultiple).rMultiple()),
    )
  }

  private closedTradeCountText(): LocalizedTextVo {
    return new LocalizedTextVo(
      `已平倉 ${this.statistics.closedTradeCount} 筆`, `${this.statistics.closedTradeCount} closed`)
  }

  private tradeCountText(tradeCount: number): LocalizedTextVo {
    return new LocalizedTextVo(`${tradeCount} 筆`, `${tradeCount} ${tradeCount === 1 ? 'trade' : 'trades'}`)
  }

  private ratioText(ratio: number | null): LocalizedTextVo {
    return ratio === null
      ? NOT_APPLICABLE_TEXT
      : new UntranslatedTextVo(`${(ratio * PERCENT).toFixed(RATIO_FRACTION_DIGITS)}%`)
  }
}
