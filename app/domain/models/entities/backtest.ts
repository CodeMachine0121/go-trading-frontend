import type Decimal from 'decimal.js'
import type { PositionDirection } from '~/domain/models/vo/position-direction-vo'
import { BacktestDomain } from '~/domain/models/domains/backtest-domain'

/**
 * Entity：一筆已經走完的進出場，只有欄位。
 * 結束時還開著的倉位不會是其中之一——它沒有出場可以報告。
 */
export class ClosedTrade {
  constructor(
    public readonly direction: PositionDirection,
    public readonly entryTime: Date,
    public readonly entryPrice: Decimal,
    public readonly exitTime: Date,
    public readonly exitPrice: Decimal,
    public readonly stake: Decimal,
    /** 賠錢時是負的；沒有另一個「虧損」欄位。 */
    public readonly profit: Decimal,
  ) {}
}

/** Entity：資金曲線上的一點——那一根 K 線收盤之後，手上總共值多少。 */
export class EquityPoint {
  constructor(
    public readonly openTime: Date,
    public readonly equity: Decimal,
  ) {}
}

/**
 * Entity：一次回測的結果本體，只有欄位。
 *
 * `winRate` 是 `null` 而不是 0，因為那是後端說的兩件不同的事：
 * 一筆都沒平倉，與每一筆都輸。把前者存成 0，這個分別就在進 domain 的第一步消失了。
 */
export class Backtest {
  constructor(
    public readonly symbol: string,
    public readonly interval: string,
    public readonly startTime: Date,
    public readonly endTime: Date,
    public readonly usedCandleCount: number,
    public readonly initialCapital: Decimal,
    public readonly finalEquity: Decimal,
    public readonly totalReturnRate: number,
    public readonly maximumDrawdown: number,
    public readonly winRate: number | null,
    public readonly positionOpenCount: number,
    /**
     * 買入與賣出條件**同時成立**的棒數。
     *
     * 那幾棒什麼都不做——替他挑一邊等於讓他照一個系統自己編出來的意見操作。
     * 它是一個數字而不是一個是非，因為要知道的是**多常**：一次是巧合，
     * 兩百棒裡一百八十次代表這份交易策略根本沒有在做決定，
     * 而那張幾乎沒有交易的漂亮成績單會被讀成「很穩」。
     *
     * 重演一支策略腳本時它恆為零——一支腳本不會與自己打架。
     */
    public readonly conflictedCandleCount: number,
    public readonly closedTrades: readonly ClosedTrade[],
    public readonly equityCurve: readonly EquityPoint[],
  ) {}

  toDomain(): BacktestDomain {
    return new BacktestDomain(this)
  }
}
