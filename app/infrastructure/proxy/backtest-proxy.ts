import Decimal from 'decimal.js'
import type { IBacktestProxy } from '~/domain/interface/i-backtest-proxy'
import type { BacktestRequestDomain } from '~/domain/models/domains/backtest-request-domain'
import type { TradingStrategyBacktestRequestDomain } from '~/domain/models/domains/trading-strategy-backtest-request-domain'
import type { PositionDirection } from '~/domain/models/vo/position-direction-vo'
import type { TradeExitReason } from '~/domain/models/vo/trade-exit-reason-vo'
import { Backtest, ClosedTrade, EquityPoint } from '~/domain/models/entities/backtest'
import type { BacktestField } from '~/domain/errors/backtest-field-error'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { IndicatorScriptFailedError } from '~/domain/errors/indicator-script-failed-error'
import { StrategyScriptParameterNotDeclaredError } from '~/domain/errors/strategy-script-parameter-not-declared-error'
import { ExitDistanceDomain } from '~/domain/models/domains/exit-distance-domain'
import { TransactionCostRateDomain } from '~/domain/models/domains/transaction-cost-rate-domain'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'

const BACKTESTS_ENDPOINT = '/backtests'

/**
 * 兩個出場距離在請求裡的那一段，而留白的那一個**根本不出現**。
 *
 * 送一個零雖然等價（後端把零讀成「沒有這個出場」），但那個等價是巧合：
 * 一個空輸入框轉成的零不是使用者的意思，而是 `new Decimal('')` 的結果。
 * 不送它讓「留白就不模擬」在線上就是字面的意思，
 * 而不是兩邊各自把零讀成同一件事的巧合。
 *
 * 「零就是沒有」的判断向那個共用模型要，不在這裡再寫一次 `greaterThan(0)`：
 * `decimal.js` 把零當成正的，而這個專案已經踩過一次那條差別。
 */
function exitLevelsBody(
  stopLossPercentage: Decimal, takeProfitPercentage: Decimal,
): Record<string, string> {
  const stopLoss = new ExitDistanceDomain(stopLossPercentage, '止損距離')
  const takeProfit = new ExitDistanceDomain(takeProfitPercentage, '止盈距離')

  return {
    ...(stopLoss.isSet ? { stopLossPercentage: stopLossPercentage.toString() } : {}),
    ...(takeProfit.isSet ? { takeProfitPercentage: takeProfitPercentage.toString() } : {}),
  }
}

/**
 * 那兩個費率裡真的填了的那幾格。
 *
 * 規則與上面那一組一字不差——**留白的不上線**。理由也一樣：一個空輸入框轉成的零
 * 不是使用者的意思，而是 `new Decimal('')` 的結果，而後端把零讀成「不收費」
 * 只是剛好對得上。不送它，「留白就不計」在線上就是字面的意思。
 *
 * 兩組刻意各有各的函式，而不是一個收四個參數的：出場那一格留白時
 * **後端會沿用進場**，那一組不會。長得像的兩條規則湊成一個函式，
 * 只會讓下一個人以為它們是同一條。
 */
function transactionCostsBody(
  entryCostPercentage: Decimal, exitCostPercentage: Decimal,
): Record<string, string> {
  const entryCost = new TransactionCostRateDomain(entryCostPercentage, '進場成本率')
  const exitCost = new TransactionCostRateDomain(exitCostPercentage, '出場成本率')

  return {
    ...(entryCost.isSet ? { entryCostPercentage: entryCostPercentage.toString() } : {}),
    ...(exitCost.isSet ? { exitCostPercentage: exitCostPercentage.toString() } : {}),
  }
}

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
  // 一個名字蓋住止損與止盈兩格：它們併排填成一組，
  // 而後端那句話已經說出是哪一個距離。
  exitLevels: 'exitLevels',
  // 同樣一個名字蓋住進場與出場兩個費率。
  transactionCosts: 'transactionCosts',
  // 後端說這一份交易策略的來源彼此對不起來時指的是這一格。畫面上沒有那一格可以標，
  // 所以它落在市場那一格旁邊——那是這張表單上唯一與「要回測什麼」有關的地方。
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
          ...exitLevelsBody(
            backtestRequestDomain.stopLossPercentage,
            backtestRequestDomain.takeProfitPercentage),
          ...transactionCostsBody(
            backtestRequestDomain.entryCostPercentage,
            backtestRequestDomain.exitCostPercentage),
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
            // 出場距離在這裡：一份規則對「它的主人能忍多少」沒有意見，
            // 那是每一次重演自己的事。
            ...exitLevelsBody(
              requestDomain.stopLossPercentage, requestDomain.takeProfitPercentage),
            ...transactionCostsBody(
              requestDomain.entryCostPercentage, requestDomain.exitCostPercentage),
            // 借錢與交易模式**都不在這裡**，而且不是漏了：重演只做現貨，
            // 後端也不收這兩格——補回去只會換來一次被拒絕的請求。
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
