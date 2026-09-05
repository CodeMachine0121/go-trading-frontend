import Decimal from 'decimal.js'
import type { IBacktestProxy } from '~/domain/interface/i-backtest-proxy'
import type { BacktestRequestDomain } from '~/domain/models/domains/backtest-request-domain'
import type { PositionDirection } from '~/domain/models/vo/position-direction-vo'
import { Backtest, ClosedTrade, EquityPoint } from '~/domain/models/entities/backtest'
import type { BacktestField } from '~/domain/errors/backtest-field-error'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { IndicatorScriptFailedError } from '~/domain/errors/indicator-script-failed-error'
import { StrategyParameterNotDeclaredError } from '~/domain/errors/strategy-parameter-not-declared-error'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'

const BACKTESTS_ENDPOINT = '/backtests'

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
    catch (error: unknown) {
      // 狀態碼與回應欄位只在這一層被解讀，與指標計算同一套分流——
      // 同一份算式壞掉，兩個去處不該講出兩種故事。
      if (error instanceof BackendRequestRejectedError && error.parameterName !== undefined) {
        throw new StrategyParameterNotDeclaredError(
          error.parameterName, error.message, { cause: error })
      }

      if (error instanceof BackendRequestRejectedError && error.status === SCRIPT_FAILED_STATUS) {
        throw new IndicatorScriptFailedError(error.message, { cause: error })
      }

      // 後端指名了是哪一格：說明因此落在那一格旁邊，而不是變成一則籠統的
      // 「請求的問題」——後者說了什麼都對，卻指不出下一步。
      //
      // 判準是回應帶回來的那個欄位，不是訊息的文字：文字是寫給人看的，
      // 措辭一改，任何比對它的程式就跟著壞掉。
      if (error instanceof BackendRequestRejectedError && error.field !== undefined) {
        const field = BACKTEST_FIELD_TRANSLATIONS[error.field]
        if (field !== undefined) {
          throw new BacktestFieldError(field, error.message, { cause: error })
        }
      }

      throw error
    }
  }
}
