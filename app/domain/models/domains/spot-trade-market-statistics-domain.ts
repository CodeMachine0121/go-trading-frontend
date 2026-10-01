import Decimal from 'decimal.js'
import type { SpotTradeMarketStatistics } from '~/domain/models/entities/spot-trade-market-statistics'
import type { SpotTradeSourceGroup } from '~/domain/models/entities/spot-trade-source-group'
import type { SpotTradeMarket } from '~/domain/models/vo/spot-trade-market-vo'
import type { TradeSourceFilter } from '~/domain/models/vo/trade-source-filter-vo'
import { SpotTradeMarketStatisticsDto } from '~/domain/models/dto/spot-trade-market-statistics-dto'
import { SpotTradeMistakeCostRowDto } from '~/domain/models/dto/spot-trade-mistake-cost-row-dto'
import { SpotTradeSourceComparisonRowDto } from '~/domain/models/dto/spot-trade-source-comparison-row-dto'
import { TradeChartPointDto } from '~/domain/models/dto/trade-chart-point-dto'
import { TradeDistributionBarDto } from '~/domain/models/dto/trade-distribution-bar-dto'
import { TradeFigureVo } from '~/domain/models/vo/trade-figure-vo'
import { SpotTradeMarketDomain } from '~/domain/models/domains/spot-trade-market-domain'
import { JournalNumberDomain } from '~/domain/models/domains/journal-number-domain'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

const NOT_APPLICABLE_TEXT = new LocalizedTextVo('不適用', 'N/A')
const NO_CLOSED_TRADES_MESSAGE = new LocalizedTextVo('這段期間沒有已平倉交易', 'No closed trades in this period')
const NO_LINKED_TRADES_TEXT = new LocalizedTextVo('沒有來自機器人連結的交易', 'No trades from bot links')
const PROFIT_FACTOR_NOTE = new LocalizedTextVo('總賺 ÷ 總賠', 'Gross profit ÷ gross loss')
const AVERAGE_ENTRY_SLIPPAGE_LABEL = new LocalizedTextVo('平均進場滑點', 'Avg entry slippage')
const AVERAGE_RETURN_RATE_LABEL = new LocalizedTextVo('平均報酬率', 'Avg return')
const PROFIT_FACTOR_LABEL = new LocalizedTextVo('獲利因子', 'Profit factor')
const AVERAGE_R_MULTIPLE_LABEL = new LocalizedTextVo('平均 R', 'Avg R')
const RATIO_FRACTION_DIGITS = 0
const RETURN_RATE_FRACTION_DIGITS = 2
const FACTOR_FRACTION_DIGITS = 2
const SLIPPAGE_FRACTION_DIGITS = 2
const PERCENT = 100

export class SpotTradeMarketStatisticsDomain {
  constructor(private readonly statistics: SpotTradeMarketStatistics) {}

  get market(): SpotTradeMarket {
    return this.statistics.market
  }

  get marketLabel(): LocalizedTextVo {
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
    const closedTradeCountText = new LocalizedTextVo(
      `已平倉 ${this.statistics.closedTradeCount} 筆`, `${this.statistics.closedTradeCount} closed`)
    if (this.statistics.closedTradeCount === 0) {
      return new SpotTradeMarketStatisticsDto(
        this.market, this.marketLabel, closedTradeCountText, NO_CLOSED_TRADES_MESSAGE, [], null, [], null, [], [], [])
    }

    const slippage = this.statistics.averageEntrySlippagePercentage
    const largestMistakeCost = Decimal.max(0, ...this.statistics.mistakeCosts.map(mistakeCost => mistakeCost.totalNetProfit.abs()))
    const largestBucketCount = Math.max(1, ...this.statistics.returnDistribution.map(bucket => bucket.count))
    const lastCumulativePoint = this.statistics.cumulativeProfit.at(-1)

    return new SpotTradeMarketStatisticsDto(
      this.market,
      this.marketLabel,
      closedTradeCountText,
      null,
      [
        ...this.summaryFigures(),
        this.averageRMultipleFigure(),
        slippage === null || this.statistics.entrySlippageTradeCount === 0
          ? new TradeFigureVo('averageEntrySlippagePercentage', AVERAGE_ENTRY_SLIPPAGE_LABEL, NO_LINKED_TRADES_TEXT, 'muted')
          : new TradeFigureVo(
              'averageEntrySlippagePercentage',
              AVERAGE_ENTRY_SLIPPAGE_LABEL,
              new UntranslatedTextVo(new JournalNumberDomain(slippage).percentage(SLIPPAGE_FRACTION_DIGITS)),
              'neutral',
              new LocalizedTextVo(
                `${this.statistics.entrySlippageTradeCount} 筆來自機器人連結`,
                `${this.statistics.entrySlippageTradeCount} from bot links`)),
      ],
      this.statistics.rTradeCount === this.statistics.closedTradeCount
        ? null
        : new LocalizedTextVo(
            `平均 R 以 ${this.statistics.rTradeCount} 筆計（有計畫止損的交易）`,
            `Avg R is based on ${this.statistics.rTradeCount} trades (those with a planned stop loss)`),
      this.statistics.cumulativeProfit.map(point => new TradeChartPointDto(
        point.closedAt, point.cumulativeNetProfit.toNumber())),
      lastCumulativePoint === undefined
        ? null
        : new TradeFigureVo(
            'cumulativeNetProfit',
            new LocalizedTextVo('累積損益', 'Cumulative P&L'),
            new UntranslatedTextVo(new JournalNumberDomain(lastCumulativePoint.cumulativeNetProfit).signedAmount()),
            new JournalNumberDomain(lastCumulativePoint.cumulativeNetProfit).tone()),
      this.statistics.returnDistribution.map(bucket => new TradeDistributionBarDto(
        bucket.label,
        bucket.count,
        bucket.profitable ? 'success' : 'danger',
        (bucket.count / largestBucketCount) * PERCENT)),
      this.statistics.mistakeCosts.map(mistakeCost => new SpotTradeMistakeCostRowDto(
        mistakeCost.tagName,
        this.tradeCountText(mistakeCost.tradeCount),
        new JournalNumberDomain(mistakeCost.totalNetProfit).signedAmount(),
        this.returnRateText(mistakeCost.averageReturnRate),
        new JournalNumberDomain(mistakeCost.totalNetProfit).tone(),
        largestMistakeCost.isZero()
          ? 0
          : mistakeCost.totalNetProfit.abs().dividedBy(largestMistakeCost).times(PERCENT).toNumber())),
      [
        this.sourceComparisonRow('linked', new LocalizedTextVo('有關聯策略', 'Linked strategy'), this.statistics.linkedGroup),
        this.sourceComparisonRow('selfJudged', new LocalizedTextVo('自行判斷', 'Self-judged'), this.statistics.selfJudgedGroup),
      ],
    )
  }

  private netProfitFigure(): TradeFigureVo {
    return new TradeFigureVo(
      'netProfit',
      new LocalizedTextVo('淨損益', 'Net P&L'),
      new UntranslatedTextVo(new JournalNumberDomain(this.statistics.netProfit).signedAmount()),
      new JournalNumberDomain(this.statistics.netProfit).tone(),
      new LocalizedTextVo(`${this.statistics.currency}，已扣手續費`, `${this.statistics.currency}, after fees`))
  }

  private winRateFigure(): TradeFigureVo {
    return new TradeFigureVo(
      'winRate',
      new LocalizedTextVo('勝率', 'Win rate'),
      this.ratioText(this.statistics.winRate),
      'neutral',
      new LocalizedTextVo(
        `${this.statistics.winCount} 勝 ${this.statistics.closedTradeCount - this.statistics.winCount} 敗`,
        `${this.statistics.winCount} W ${this.statistics.closedTradeCount - this.statistics.winCount} L`))
  }

  private averageReturnRateFigure(): TradeFigureVo {
    const averageReturnRate = this.statistics.averageReturnRate

    return averageReturnRate === null
      ? new TradeFigureVo('averageReturnRate', AVERAGE_RETURN_RATE_LABEL, NOT_APPLICABLE_TEXT, 'muted')
      : new TradeFigureVo(
          'averageReturnRate',
          AVERAGE_RETURN_RATE_LABEL,
          this.returnRateText(averageReturnRate),
          new JournalNumberDomain(new Decimal(averageReturnRate)).tone(),
          new LocalizedTextVo('每筆淨損益 ÷ 買進成本', 'Net P&L per trade ÷ buy cost'))
  }

  private profitFactorFigure(): TradeFigureVo {
    const profitFactor = this.statistics.profitFactor

    return profitFactor === null
      ? new TradeFigureVo('profitFactor', PROFIT_FACTOR_LABEL, NOT_APPLICABLE_TEXT, 'muted', PROFIT_FACTOR_NOTE)
      : new TradeFigureVo(
          'profitFactor',
          PROFIT_FACTOR_LABEL,
          new UntranslatedTextVo(profitFactor.toFixed(FACTOR_FRACTION_DIGITS)),
          'neutral',
          PROFIT_FACTOR_NOTE)
  }

  private averageRMultipleFigure(): TradeFigureVo {
    const averageRMultiple = this.statistics.averageRMultiple

    return averageRMultiple === null
      ? new TradeFigureVo(
          'averageRMultiple',
          AVERAGE_R_MULTIPLE_LABEL,
          NOT_APPLICABLE_TEXT,
          'muted',
          new LocalizedTextVo('沒有設計畫止損的交易', 'No trades with a planned stop loss'))
      : new TradeFigureVo(
          'averageRMultiple',
          AVERAGE_R_MULTIPLE_LABEL,
          new UntranslatedTextVo(new JournalNumberDomain(averageRMultiple).rMultiple()),
          new JournalNumberDomain(averageRMultiple).tone(),
          new LocalizedTextVo(
            `以 ${this.statistics.rTradeCount} 筆計`, `Based on ${this.statistics.rTradeCount} trades`))
  }

  private sourceComparisonRow(
    source: Exclude<TradeSourceFilter, 'all'>,
    label: LocalizedTextVo,
    group: SpotTradeSourceGroup,
  ): SpotTradeSourceComparisonRowDto {
    return new SpotTradeSourceComparisonRowDto(
      source,
      label,
      this.tradeCountText(group.tradeCount),
      this.ratioText(group.winRate),
      this.returnRateText(group.averageReturnRate),
    )
  }

  private tradeCountText(tradeCount: number): LocalizedTextVo {
    return new LocalizedTextVo(`${tradeCount} 筆`, `${tradeCount} trades`)
  }

  private returnRateText(returnRate: number | null): LocalizedTextVo {
    return returnRate === null
      ? NOT_APPLICABLE_TEXT
      : new UntranslatedTextVo(
          new JournalNumberDomain(new Decimal(returnRate).times(PERCENT)).signedPercentage(RETURN_RATE_FRACTION_DIGITS))
  }

  private ratioText(ratio: number | null): LocalizedTextVo {
    return ratio === null
      ? NOT_APPLICABLE_TEXT
      : new UntranslatedTextVo(`${(ratio * PERCENT).toFixed(RATIO_FRACTION_DIGITS)}%`)
  }
}
