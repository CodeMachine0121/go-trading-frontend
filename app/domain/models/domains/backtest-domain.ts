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

/**
 * 金額寫到小數點後兩位。
 *
 * 精確小數是**算**用的，不是**看**用的：口數是押注金額除以進場價，除出來動輒十幾位小數，
 * 而「最後剩多少」是它乘回價格再加上現金——於是一個帳戶餘額長成
 * `10219.284790870572...`，它會撐破自己那一格，還會蓋掉隔壁那一欄。
 *
 * 進位只發生在**寫出來**的這一刻。算的時候一位都不能少：
 * 上百根 K 線一路乘除下來，每一步都進位兩位，錯的就不只是最後一位。
 */
const AMOUNT_FRACTION_DIGITS = 2

/**
 * 價格最多寫到小數點後八位，尾端的零去掉。
 *
 * 它與金額分開，因為兩者的量級天差地遠：帳戶餘額是幾萬塊，兩位小數綽綽有餘；
 * 而一個標的的報價可能是 `0.00001234`——用兩位小數寫它，會得到 `0.00`。
 */
const PRICE_FRACTION_DIGITS = 8

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
      this.amount(this.backtest.initialCapital),
      this.amount(this.backtest.finalEquity),
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
      this.price(closedTrade.entryPrice),
      closedTrade.exitTime,
      this.price(closedTrade.exitPrice),
      this.amount(closedTrade.profit),
      this.toneOfDecimal(closedTrade.profit),
    )
  }

  /** 一筆錢寫出來的樣子。 */
  private amount(value: Decimal): string {
    return value.toFixed(AMOUNT_FRACTION_DIGITS)
  }

  /** 一個價格寫出來的樣子：夠細，但不會細到寫出一串沒有意義的零。 */
  private price(value: Decimal): string {
    return value.toDecimalPlaces(PRICE_FRACTION_DIGITS).toString()
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
