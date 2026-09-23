import type Decimal from 'decimal.js'
import type { PositionDirection } from '~/domain/models/vo/position-direction-vo'
import type { TradeExitReason } from '~/domain/models/vo/trade-exit-reason-vo'
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
    /**
     * 賠錢時是負的；沒有另一個「虧損」欄位。
     *
     * 它是**淨額**——價差扣掉下面那兩筆成本之後的數字，因為那才是口袋真正的變化。
     * 勝率讀的就是它，所以價差賺得到、卻賺不過手續費的那一趟不算贏。
     */
    public readonly profit: Decimal,
    /**
     * 這一筆是怎麼結束的：訊號叫它出場，還是碰到了這一次重演給的出場價位。
     *
     * 它在每一筆上而不只是成績單那兩個總數，因為總數答得出「有幾筆」、
     * 答不出「是哪幾筆」——而看這張明細的人問的正是後者。
     */
    public readonly exitReason: TradeExitReason,
    /**
     * 這一筆為了進場與出場各付掉多少。兩個都是零，代表這一次重演沒有給費率。
     *
     * 它們在每一筆上而不只是成績單那一個總數，因為總數答得出「總共付了多少」、
     * 答不出「是哪幾筆在付」——而看這張明細的人問的正是後者：
     * 那些被吃掉的是不是都擠在幾乎沒有動的那幾趟。
     */
    public readonly entryCost: Decimal,
    public readonly exitCost: Decimal,
    /** 合約重演那一筆多出的幾格。現貨重演的每一筆都是 `null`。 */
    public readonly contractFigures: ContractTradeFigures | null = null,
  ) {}
}

/** Entity：合約重演一筆交易多出的幾格——它借了幾倍、買了多少、付收了多少資金費用。 */
export class ContractTradeFigures {
  constructor(
    public readonly leverage: Decimal,
    public readonly quantity: Decimal,
    /** 付出的資金費用淨額；負的是收到的。 */
    public readonly fundingFee: Decimal,
  ) {}
}

/**
 * Entity：一次合約重演的成績單多出的那幾格，原樣。
 *
 * 兩個勝率是 `null` 而不是 0，理由與整體勝率相同：那一邊一筆都沒有，與那一邊每一筆都輸，
 * 是兩件不同的事。
 */
export class ContractBacktestFigures {
  constructor(
    public readonly tradingMode: string,
    public readonly leverage: Decimal,
    public readonly liquidationExitCount: number,
    /** 淨付出的資金費用；負的是淨收到。 */
    public readonly totalFundingFee: Decimal,
    public readonly longTradeCount: number,
    public readonly longWinRate: number | null,
    public readonly shortTradeCount: number,
    public readonly shortWinRate: number | null,
    public readonly blockedOpeningCount: number,
    /** `tiers`（完整分級）或 `smallestTier`（最小那一級）。 */
    public readonly maintenanceMarginBasisKind: string,
    /** 完整分級的確認時間；最小那一級沒有。 */
    public readonly maintenanceMarginConfirmedAt: Date | null,
  ) {}
}

/**
 * Entity：只看已平倉交易的五格統計，原樣。
 *
 * `null` 是交易服務說的「不適用」——沒有交易、或一筆都沒虧（獲利因子）、或價差本身就沒賺（成本佔毛利）。
 * 它與零是兩件不同的事，所以在進 domain 的第一步就不能變成零。
 */
export class BacktestTradeStatistics {
  constructor(
    public readonly profitFactor: number | null,
    public readonly expectancy: Decimal | null,
    public readonly averageHoldingSeconds: number | null,
    public readonly maximumConsecutiveLossCount: number,
    /** 交易成本佔扣成本前損益的比例；0.25 是 25%。 */
    public readonly costToGrossProfitRatio: number | null,
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
    /**
     * 被止損掃出場、被止盈帶走的筆數。這一次沒有給距離時兩個都是零。
     *
     * 它們存在的理由是：**同一個報酬率，兩個完全不同的故事**。
     * 十次出場八次是被停損掃出去的策略，是停損在支撑它；
     * 十次都靡訊號出場的，是還沒遇到那個掃光它的盤。
     * 少了這兩個數字，那兩件事在成績單上長得一模一樣。
     */
    public readonly stopLossExitCount: number,
    public readonly takeProfitExitCount: number,
    /**
     * 這一次重演總共為了交易付掉多少：已平倉那幾筆的兩端，
     * 加上結束時還開著那一注**已經付掉的**進場成本。沒有給費率時是零。
     *
     * 它存在的理由與上面那兩個數字同一個：**同一個報酬率，兩個完全不同的故事**——
     * 一支讀不準行情的策略，與一支讀得夠準卻把賺的全交給券商的策略。
     * 少了這個數字，那兩件事在成績單上長得一模一樣。
     */
    public readonly totalTransactionCost: Decimal,
    public readonly closedTrades: readonly ClosedTrade[],
    public readonly equityCurve: readonly EquityPoint[],
    /** 合約重演多出的那幾格。現貨重演是 `null`。 */
    public readonly contractFigures: ContractBacktestFigures | null = null,
    /** 五格統計。比這一刀早的交易服務不說，那時就是一格都不適用。 */
    public readonly tradeStatistics: BacktestTradeStatistics
      = new BacktestTradeStatistics(null, null, null, 0, null),
    /** 這一次用的成交時點：`close` 或 `nextOpen`。 */
    public readonly fillTiming: string = 'close',
    /** 這一次的驗證起點；沒切分是 `null`。 */
    public readonly validationStartTime: Date | null = null,
    /** 調參段與驗證段各自重演的結果；沒切分時兩個都是 `null`。 */
    public readonly inSample: Backtest | null = null,
    public readonly validation: Backtest | null = null,
  ) {}

  toDomain(): BacktestDomain {
    return new BacktestDomain(this)
  }
}
