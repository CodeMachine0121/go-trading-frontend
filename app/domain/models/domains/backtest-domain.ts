import type Decimal from 'decimal.js'
import type { Backtest, ClosedTrade } from '~/domain/models/entities/backtest'
import type { PositionDirection } from '~/domain/models/vo/position-direction-vo'
import type { ProfitTone } from '~/domain/models/vo/profit-tone-vo'
import { AggregationIntervalDomain } from '~/domain/models/domains/aggregation-interval-domain'
import { BacktestResultDto } from '~/domain/models/dto/backtest-result-dto'
import { BacktestSummaryDto } from '~/domain/models/dto/backtest-summary-dto'
import { ClosedTradeDto } from '~/domain/models/dto/closed-trade-dto'
import { EquityPointDto } from '~/domain/models/dto/equity-point-dto'

/** 比率寫到小數點後兩位：再細一位對「這支策略好不好」沒有任何幫助。 */
const RATE_FRACTION_DIGITS = 2

/** 勝率寫到小數點後一位：它天生是幾分之幾，兩位小數只是假的精確。 */
const WIN_RATE_FRACTION_DIGITS = 1

/** 一筆都沒平倉時勝率的說法。它不是 0%——那句話宣稱每一筆都輸。 */
const WIN_RATE_NOT_APPLICABLE = '不適用'

const POSITION_DIRECTION_LABELS: Readonly<Record<PositionDirection, string>> = {
  long: '做多',
  short: '做空',
}

/**
 * Domain Model：一次回測的結果，負責把它變成**可以直接畫**的樣子。
 *
 * 每一個進位、每一個色調、每一個中文說法都在這裡決定。畫面只負責畫——
 * 它一旦開始判斷「這個數字是不是負的」，同一個判斷就會出現在每一個顯示數字的地方，
 * 而其中一個遲早會把零算成賺。
 */
export class BacktestDomain {
  constructor(private readonly backtest: Backtest) {}

  toDto(): BacktestResultDto {
    return new BacktestResultDto(
      this.backtest.symbol,
      new AggregationIntervalDomain(this.backtest.interval).label(),
      this.backtest.startTime,
      this.backtest.endTime,
      this.backtest.usedCandleCount,
      this.summaryDto(),
      this.backtest.closedTrades.map(closedTrade => this.closedTradeDto(closedTrade)),
      this.backtest.equityCurve.map(
        equityPoint => new EquityPointDto(equityPoint.openTime, equityPoint.equity)),
    )
  }

  private summaryDto(): BacktestSummaryDto {
    return new BacktestSummaryDto(
      this.backtest.initialCapital.toString(),
      this.backtest.finalEquity.toString(),
      this.signedPercentage(this.backtest.totalReturnRate),
      this.toneOfNumber(this.backtest.totalReturnRate),
      this.percentage(this.backtest.maximumDrawdown, RATE_FRACTION_DIGITS),
      this.backtest.winRate === null
        ? WIN_RATE_NOT_APPLICABLE
        : this.percentage(this.backtest.winRate, WIN_RATE_FRACTION_DIGITS),
      this.backtest.closedTrades.length,
    )
  }

  private closedTradeDto(closedTrade: ClosedTrade): ClosedTradeDto {
    return new ClosedTradeDto(
      POSITION_DIRECTION_LABELS[closedTrade.direction],
      closedTrade.entryTime,
      closedTrade.entryPrice.toString(),
      closedTrade.exitTime,
      closedTrade.exitPrice.toString(),
      closedTrade.profit.toString(),
      this.toneOfDecimal(closedTrade.profit),
    )
  }

  /**
   * 帶正負號的百分比。正號一律寫出來——掃過一整張成績單時，
   * 符號比數字先被看見，而少了正號的 25% 得多讀一眼才知道是賺。
   */
  private signedPercentage(rate: number): string {
    const sign = rate > 0 ? '+' : ''

    return `${sign}${this.percentage(rate, RATE_FRACTION_DIGITS)}`
  }

  private percentage(rate: number, fractionDigits: number): string {
    return `${(rate * 100).toFixed(fractionDigits)}%`
  }

  /** 賺綠、賠紅、不賺不賠中性。零刻意不算賺——它什麼都沒發生。 */
  private toneOfNumber(value: number): ProfitTone {
    if (value > 0) {
      return 'positive'
    }

    return value < 0 ? 'negative' : 'neutral'
  }

  private toneOfDecimal(value: Decimal): ProfitTone {
    if (value.isPositive() && !value.isZero()) {
      return 'positive'
    }

    return value.isNegative() ? 'negative' : 'neutral'
  }
}
