import Decimal from 'decimal.js'
import type { PositionDirection } from '~/domain/models/vo/position-direction-vo'
import type { TradeExitReason } from '~/domain/models/vo/trade-exit-reason-vo'
import {
  Backtest,
  BacktestTradeStatistics,
  ClosedTrade,
  ContractBacktestFigures,
  ContractTradeFigures,
  EquityPoint,
} from '~/domain/models/entities/backtest'

/**
 * 一次重演回來的成績單在線上的樣子，以及怎麼把它讀成領域的形狀。
 *
 * 它是純粹的轉換模組：送出回測與查看輪次兩個 proxy 收到的是同一份成績單，
 * 讀法只寫這一次。
 */
/**
 * 後端回傳的原始 wire 形狀，只給 proxy 用。
 * 金額一律以字串傳遞——它們是精確小數，經過浮點數就再也回不來了。
 */
export type ClosedTradeWire = {
  direction: string
  entryTime: string
  entryPrice: string
  exitTime: string
  exitPrice: string
  stake: string
  profit: string
  /**
   * 這一筆是怎麼出場的。
   *
   * 它是選填的，因為比這一刀早的後端不說這件事——
   * 而那時每一筆都只可能是訊號出場，所以沒有就是訊號。
   */
  exitReason?: string
  /**
   * 這一筆兩端各付掉多少。
   *
   * 選填，因為比這一刀早的後端不說這件事——而那時交易是免費的，所以沒有就是零。
   */
  entryCost?: string
  exitCost?: string
}

/**
 * 合約重演的一筆交易：押下去的叫保證金而不是押注金額，另帶槓桿、數量與資金費用。
 */
export type ContractClosedTradeWire = Omit<ClosedTradeWire, 'stake'> & {
  margin: string
  leverage: string
  quantity: string
  fundingFee: string
}

export type EquityPointWire = {
  openTime: string
  equity: string
}

export type BacktestWire = {
  symbol: string
  interval: string
  startTime: string
  endTime: string
  usedCandleCount: number
  summary: {
    initialCapital: string
    finalEquity: string
    totalReturnRate: number
    maximumDrawdown: number
    /** 一筆都沒平倉時是 `null`，不是 0——那是後端刻意說的兩件不同的事。 */
    winRate: number | null
    positionOpenCount: number
    /**
     * 這一份交易策略的規則彼此打架的棒數。
     *
     * 重演一支策略腳本時後端根本不說這件事——一支腳本沒有人可以跟它打架——
     * 所以它是選填的，沒有就是一棒都沒有。
     */
    conflictedCandleCount?: number
    /**
     * 被止損掃出場、被止盈帶走的筆數。
     *
     * 這一次沒有給距離時兩個都是零，而比這一刀早的後端根本不說，
     * 所以它們是選填的：沒有就是一筆都沒有。
     */
    stopLossExitCount?: number
    takeProfitExitCount?: number
    /**
     * 這一次總共為了交易付掉多少。
     *
     * 選填，理由與上面那兩個相同：比這一刀早的後端根本不收費，也不說這件事。
     */
    totalTransactionCost?: string
    /**
     * 只算已平倉交易的五格。`null` 是「不適用」。
     *
     * 選填，因為比這一刀早的交易服務不說——那時就是一格都不適用、連虧零筆。
     */
    profitFactor?: number | null
    expectancy?: string | null
    averageHoldingSeconds?: number | null
    maximumConsecutiveLossCount?: number
    costToGrossProfitRatio?: number | null
  }
  closedTrades: ClosedTradeWire[] | null
  equityCurve: EquityPointWire[] | null
  /** 選填：比這一刀早的交易服務不說，那時一律收盤成交、不切分。 */
  fillTiming?: string
  validationStartTime?: string | null
  /** 有驗證起點時，調參段與驗證段各自重演的那一份，與整段同一個形狀。 */
  inSample?: BacktestWire
  validation?: BacktestWire
}

/** 合約重演回來的那一份：現貨那一份的每一格，加上合約帳戶才有的那幾格。 */
export type ContractBacktestWire = Omit<BacktestWire, 'closedTrades' | 'summary' | 'inSample' | 'validation'> & {
  tradingMode: string
  leverage: string
  summary: BacktestWire['summary'] & {
    liquidationExitCount: number
    totalFundingFee: string
    longTradeCount: number
    longWinRate: number | null
    shortTradeCount: number
    shortWinRate: number | null
    blockedOpeningCount: number
    maintenanceMarginBasis: { kind: string, confirmedAt: string | null }
  }
  closedTrades: ContractClosedTradeWire[] | null
  inSample?: ContractBacktestWire
  validation?: ContractBacktestWire
}

/**
 * 合約重演回來的那一份：現貨那幾格照現貨的讀法，合約多出的那幾格收進它們自己的 entity。
 * 押下去的在這裡叫保證金，讀進交易明細的押注金額那一格——兩者是同一件事的兩個名字。
 */
export function toContractBacktest(wire: ContractBacktestWire): Backtest {
  const confirmedAt = wire.summary.maintenanceMarginBasis.confirmedAt

  return new Backtest(
    wire.symbol,
    wire.interval,
    new Date(wire.startTime),
    new Date(wire.endTime),
    wire.usedCandleCount,
    new Decimal(wire.summary.initialCapital),
    new Decimal(wire.summary.finalEquity),
    wire.summary.totalReturnRate,
    wire.summary.maximumDrawdown,
    wire.summary.winRate,
    wire.summary.positionOpenCount,
    wire.summary.conflictedCandleCount ?? 0,
    wire.summary.stopLossExitCount ?? 0,
    wire.summary.takeProfitExitCount ?? 0,
    new Decimal(wire.summary.totalTransactionCost ?? 0),
    (wire.closedTrades ?? []).map(closedTrade => new ClosedTrade(
      closedTrade.direction as PositionDirection,
      new Date(closedTrade.entryTime),
      new Decimal(closedTrade.entryPrice),
      new Date(closedTrade.exitTime),
      new Decimal(closedTrade.exitPrice),
      new Decimal(closedTrade.margin),
      new Decimal(closedTrade.profit),
      (closedTrade.exitReason ?? 'signal') as TradeExitReason,
      new Decimal(closedTrade.entryCost ?? 0),
      new Decimal(closedTrade.exitCost ?? 0),
      new ContractTradeFigures(
        new Decimal(closedTrade.leverage),
        new Decimal(closedTrade.quantity),
        new Decimal(closedTrade.fundingFee)))),
    (wire.equityCurve ?? []).map(equityPoint => new EquityPoint(
      new Date(equityPoint.openTime),
      new Decimal(equityPoint.equity))),
    new ContractBacktestFigures(
      wire.tradingMode,
      new Decimal(wire.leverage),
      wire.summary.liquidationExitCount,
      new Decimal(wire.summary.totalFundingFee),
      wire.summary.longTradeCount,
      wire.summary.longWinRate,
      wire.summary.shortTradeCount,
      wire.summary.shortWinRate,
      wire.summary.blockedOpeningCount,
      wire.summary.maintenanceMarginBasis.kind,
      confirmedAt === null ? null : new Date(confirmedAt)),
    tradeStatisticsOf(wire.summary),
    wire.fillTiming ?? 'close',
    validationStartTimeOf(wire),
    wire.inSample === undefined ? null : toContractBacktest(wire.inSample),
    wire.validation === undefined ? null : toContractBacktest(wire.validation),
  )
}

/** 後端回來的那一份，收成領域看得懂的形狀。兩種受測對象回來的是同一個形狀。 */
export function toBacktest(wire: BacktestWire): Backtest {
  return new Backtest(
    wire.symbol,
    wire.interval,
    new Date(wire.startTime),
    new Date(wire.endTime),
    wire.usedCandleCount,
    new Decimal(wire.summary.initialCapital),
    new Decimal(wire.summary.finalEquity),
    wire.summary.totalReturnRate,
    wire.summary.maximumDrawdown,
    wire.summary.winRate,
    wire.summary.positionOpenCount,
    wire.summary.conflictedCandleCount ?? 0,
    wire.summary.stopLossExitCount ?? 0,
    wire.summary.takeProfitExitCount ?? 0,
    // 沒說就是沒收過錢——比這一刀早的後端從來不收。
    new Decimal(wire.summary.totalTransactionCost ?? 0),
    (wire.closedTrades ?? []).map(closedTrade => new ClosedTrade(
      closedTrade.direction as PositionDirection,
      new Date(closedTrade.entryTime),
      new Decimal(closedTrade.entryPrice),
      new Date(closedTrade.exitTime),
      new Decimal(closedTrade.exitPrice),
      new Decimal(closedTrade.stake),
      new Decimal(closedTrade.profit),
      // 沒說就是訊號出場——比這一刀早的後端只有那一種出場。
      (closedTrade.exitReason ?? 'signal') as TradeExitReason,
      new Decimal(closedTrade.entryCost ?? 0),
      new Decimal(closedTrade.exitCost ?? 0))),
    (wire.equityCurve ?? []).map(equityPoint => new EquityPoint(
      new Date(equityPoint.openTime),
      new Decimal(equityPoint.equity))),
    null,
    tradeStatisticsOf(wire.summary),
    wire.fillTiming ?? 'close',
    validationStartTimeOf(wire),
    wire.inSample === undefined ? null : toBacktest(wire.inSample),
    wire.validation === undefined ? null : toBacktest(wire.validation),
  )
}

/**
 * 五格統計，兩種重演讀法一樣。沒說的讀成不適用、連虧零筆——比這一刀早的交易服務根本不算。
 * 每筆期望值是金額，以字串傳遞，理由與其他金額相同。
 */
function tradeStatisticsOf(summary: BacktestWire['summary']): BacktestTradeStatistics {
  return new BacktestTradeStatistics(
    summary.profitFactor ?? null,
    summary.expectancy === undefined || summary.expectancy === null
      ? null
      : new Decimal(summary.expectancy),
    summary.averageHoldingSeconds ?? null,
    summary.maximumConsecutiveLossCount ?? 0,
    summary.costToGrossProfitRatio ?? null,
  )
}

/** 這一次的驗證起點，兩種重演讀法一樣。 */
function validationStartTimeOf(wire: Pick<BacktestWire, 'validationStartTime'>): Date | null {
  return wire.validationStartTime === undefined || wire.validationStartTime === null
    ? null
    : new Date(wire.validationStartTime)
}
