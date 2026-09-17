import Decimal from 'decimal.js'
import type { IBacktestProxy } from '~/domain/interface/i-backtest-proxy'
import type { BacktestRequestDomain } from '~/domain/models/domains/backtest-request-domain'
import type { TradingStrategyBacktestRequestDomain } from '~/domain/models/domains/trading-strategy-backtest-request-domain'
import type { PositionDirection } from '~/domain/models/vo/position-direction-vo'
import { Backtest, ClosedTrade, EquityPoint } from '~/domain/models/entities/backtest'
import type { BacktestField } from '~/domain/errors/backtest-field-error'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { IndicatorScriptFailedError } from '~/domain/errors/indicator-script-failed-error'
import { StrategyScriptParameterNotDeclaredError } from '~/domain/errors/strategy-script-parameter-not-declared-error'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'

const BACKTESTS_ENDPOINT = '/backtests'

/** 重演一份交易策略掛在那一份底下，因為那是對它做的事。 */
const TRADING_STRATEGIES_ENDPOINT = '/trading-strategies'

/** 後端用這個狀態碼表示「請求沒問題，是算式跑不起來」。只有這裡需要知道這件事。 */
const SCRIPT_FAILED_STATUS = 422

/**
 * 後端指名一格時用的詞彙，對應到這個畫面上的哪一格。
 *
 * 翻譯發生在這裡，因為後端沒有理由知道這個畫面把它的「起訖時間」畫成了哪兩個選擇器。
 * 認不得的名字一路往上，變成一則籠統的拒絕——那比標在錯的一格旁邊好。
 */
const BACKTEST_FIELD_TRANSLATIONS: Readonly<Record<string, BacktestField>> = {
  timeRange: 'timeRange',
  initialCapital: 'initialCapital',
  positionSizingValue: 'positionSizingValue',
  tradingMode: 'tradingMode',
  // 後端說這一份交易策略的來源彼此對不起來時指的是這一格。畫面上沒有那一格可以標，
  // 所以它落在市場那一格旁邊——那是這張表單上唯一與「要重演什麼」有關的地方。
  signalSources: 'symbol',
}

/**
 * 後端回傳的原始 wire 形狀，只存在於本檔內。
 * 金額一律以字串傳遞——它們是精確小數，經過浮點數就再也回不來了。
 */
type ClosedTradeWire = {
  direction: string
  entryTime: string
  entryPrice: string
  exitTime: string
  exitPrice: string
  stake: string
  profit: string
}

type EquityPointWire = {
  openTime: string
  equity: string
}

type BacktestWire = {
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
  }
  closedTrades: ClosedTradeWire[] | null
  equityCurve: EquityPointWire[] | null
}

/** Proxy：打回測端點，並把「算式的問題」與「名字對不上」從一般的拒絕裡分出來。 */
export class BacktestProxy extends BackendApiProxy implements IBacktestProxy {
  async runBacktest(backtestRequestDomain: BacktestRequestDomain): Promise<Backtest> {
    try {
      const wire = await this.requestBackend<BacktestWire>(BACKTESTS_ENDPOINT, {
        method: 'POST',
        body: {
          symbol: backtestRequestDomain.symbol,
          aggregationInterval: backtestRequestDomain.aggregationInterval.value,
          startTime: backtestRequestDomain.startTime.toISOString(),
          endTime: backtestRequestDomain.endTime.toISOString(),
          script: backtestRequestDomain.script,
          // 金額以字串送出，理由與回來時相同：它是精確小數。
          initialCapital: backtestRequestDomain.initialCapital.toString(),
          positionSizingMode: backtestRequestDomain.positionSizingMode,
          positionSizingValue: backtestRequestDomain.positionSizingValue.toString(),
          tradingMode: backtestRequestDomain.tradingMode,
          // 宣告與這一次的值分兩份送，與指標計算完全相同：系統要先知道這支算式
          // **宣告**了哪些名字，才有辦法在算式取用一個沒宣告的名字時指名說出是哪一個。
          parameters: backtestRequestDomain.parameters.all.map(parameter => ({
            name: parameter.name,
            kind: parameter.kind,
            defaultValue: parameter.value,
          })),
          parameterValues: backtestRequestDomain.parameters.all.map(parameter => ({
            name: parameter.name,
            value: parameter.value,
          })),
        },
      })

      return this.toBacktest(wire)
    }
    catch (error: unknown) {
      throw this.backtestFailureOf(error)
    }
  }

  /**
   * 重演一整份交易策略。
   *
   * 送出去的少了兩樣：**算式與彙總刻度**。那兩樣是那份交易策略的信號來源自己說的，
   * 順手送過去等於同一件事有兩個答案，而沒有規則說哪一個贏。
   */
  async runTradingStrategyBacktest(
    requestDomain: TradingStrategyBacktestRequestDomain,
  ): Promise<Backtest> {
    try {
      const wire = await this.requestBackend<BacktestWire>(
        `${TRADING_STRATEGIES_ENDPOINT}/${requestDomain.tradingStrategyId}/backtests`, {
          method: 'POST',
          body: {
            symbol: requestDomain.symbol,
            startTime: requestDomain.startTime.toISOString(),
            endTime: requestDomain.endTime.toISOString(),
            // 金額以字串送出，理由與回來時相同：它是精確小數。
            initialCapital: requestDomain.initialCapital.toString(),
            positionSizingMode: requestDomain.positionSizingMode,
            positionSizingValue: requestDomain.positionSizingValue.toString(),
            tradingMode: requestDomain.tradingMode,
          },
        })

      return this.toBacktest(wire)
    }
    catch (error: unknown) {
      throw this.backtestFailureOf(error)
    }
  }

  /** 後端回來的那一份，收成領域看得懂的形狀。兩種受測對象回來的是同一個形狀。 */
  private toBacktest(wire: BacktestWire): Backtest {
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
      (wire.closedTrades ?? []).map(closedTrade => new ClosedTrade(
        closedTrade.direction as PositionDirection,
        new Date(closedTrade.entryTime),
        new Decimal(closedTrade.entryPrice),
        new Date(closedTrade.exitTime),
        new Decimal(closedTrade.exitPrice),
        new Decimal(closedTrade.stake),
        new Decimal(closedTrade.profit))),
      (wire.equityCurve ?? []).map(equityPoint => new EquityPoint(
        new Date(equityPoint.openTime),
        new Decimal(equityPoint.equity))),
    )
  }

  /**
   * 一次失敗真正是什麼。
   *
   * 狀態碼與回應欄位只在這一層被解讀，兩種受測對象走同一套分流——
   * 同一份算式壞掉，兩個去處不該講出兩種故事。
   */
  private backtestFailureOf(error: unknown): unknown {
    if (error instanceof BackendRequestRejectedError && error.parameterName !== undefined) {
      return new StrategyScriptParameterNotDeclaredError(
        error.parameterName, error.message, { cause: error })
    }

    if (error instanceof BackendRequestRejectedError && error.status === SCRIPT_FAILED_STATUS) {
      return new IndicatorScriptFailedError(error.message, { cause: error })
    }

    // 後端指名了是哪一格：說明因此落在那一格旁邊，而不是變成一則籠統的
    // 「請求的問題」——後者說了什麼都對，卻指不出下一步。
    //
    // 判準是回應帶回來的那個欄位，不是訊息的文字：文字是寫給人看的，
    // 措辭一改，任何比對它的程式就跟著壞掉。
    if (error instanceof BackendRequestRejectedError && error.field !== undefined) {
      const field = BACKTEST_FIELD_TRANSLATIONS[error.field]
      if (field !== undefined) {
        return new BacktestFieldError(field, error.message, { cause: error })
      }
    }

    return error
  }
}
