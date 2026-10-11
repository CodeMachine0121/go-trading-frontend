import type Decimal from 'decimal.js'
import type { IBacktestProxy } from '~/domain/interface/i-backtest-proxy'
import type { BacktestRequestDomain } from '~/domain/models/domains/backtest-request-domain'
import type { TradingStrategyBacktestRequestDomain } from '~/domain/models/domains/trading-strategy-backtest-request-domain'
import type { BacktestRun } from '~/domain/models/entities/backtest-run'
import type { ContractBacktestTermsDomain } from '~/domain/models/domains/contract-backtest-terms-domain'
import type { BacktestField } from '~/domain/errors/backtest-field-error'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { IndicatorScriptFailedError } from '~/domain/errors/indicator-script-failed-error'
import { StrategyScriptParameterNotDeclaredError } from '~/domain/errors/strategy-script-parameter-not-declared-error'
import { ExitDistanceDomain } from '~/domain/models/domains/exit-distance-domain'
import { TransactionCostRateDomain } from '~/domain/models/domains/transaction-cost-rate-domain'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'
import type { FillTimingDomain } from '~/domain/models/domains/fill-timing-domain'
import { BacktestTimeAllowanceSpentError } from '~/domain/errors/backtest-time-allowance-spent-error'
import { BacktestRunOwnerLimitError } from '~/domain/errors/backtest-run-owner-limit-error'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import type { BacktestRunWire } from '~/infrastructure/proxy/backtest-run-wire'
import { toBacktestRun } from '~/infrastructure/proxy/backtest-run-wire'

const BACKTESTS_ENDPOINT = '/backtests'

/** 合約重演另有自己的入口，與合約指標計算、合約 K 線同一個做法：合約自成一條路。 */
const CONTRACT_BACKTESTS_ENDPOINT = '/contract-backtests'

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
  const stopLoss = new ExitDistanceDomain(
    stopLossPercentage, new LocalizedTextVo('止損距離', 'Stop-loss distance'))
  const takeProfit = new ExitDistanceDomain(
    takeProfitPercentage, new LocalizedTextVo('止盈距離', 'Take-profit distance'))

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
  const entryCost = new TransactionCostRateDomain(
    entryCostPercentage, new LocalizedTextVo('進場成本率', 'Entry cost rate'))
  const exitCost = new TransactionCostRateDomain(
    exitCostPercentage, new LocalizedTextVo('出場成本率', 'Exit cost rate'))

  return {
    ...(entryCost.isSet ? { entryCostPercentage: entryCostPercentage.toString() } : {}),
    ...(exitCost.isSet ? { exitCostPercentage: exitCostPercentage.toString() } : {}),
  }
}

/**
 * 合約重演多問的那幾格裡真的填了的那幾格。
 *
 * 規則與出場價位、交易成本同一條——**留白的不上線**：槓桿留白後端讀成一倍、滑點留白讀成不計，
 * 不送它，那個讀法在線上就是字面的意思。交易模式只有重演一支腳本時才有；
 * 重演一份交易策略時它是那份交易策略自己的，送了會被拒絕。
 */
function contractTermsBody(termsDomain: ContractBacktestTermsDomain): Record<string, string> {
  return {
    ...(termsDomain.leverageIsSet ? { leverage: termsDomain.leverage.toString() } : {}),
    ...(termsDomain.slippageIsSet
      ? { slippagePercentage: termsDomain.slippagePercentage.toString() }
      : {}),
    ...(termsDomain.tradingMode === null ? {} : { tradingMode: termsDomain.tradingMode }),
  }
}

/**
 * 短線回測多問的兩格裡真的給了的那幾格。
 *
 * 規則與出場價位同一條——**沒說的不上線**：收盤成交是交易服務本來的讀法，
 * 沒有驗證起點就是不切分。不送它們，「沒動就與今天一樣」在線上就是字面的意思。
 */
function replayTimingBody(
  fillTiming: FillTimingDomain, validationStartTime: Date | null,
): Record<string, string> {
  return {
    ...(fillTiming.isDefault ? {} : { fillTiming: fillTiming.value }),
    ...(validationStartTime === null ? {} : { validationStartTime: validationStartTime.toISOString() }),
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
  // 合約重演多問的那三格。
  leverage: 'leverage',
  tradingMode: 'tradingMode',
  slippage: 'slippage',
  // 短線回測多問的兩格。
  fillTiming: 'fillTiming',
  validationStartTime: 'validationStartTime',
}

/**
 * Proxy：把一次重演送進後端。後端不當場算，回的是一筆輪次；
 * 「算式的問題」「名字對不上」「同時太多筆」從一般的拒絕裡分出來。
 */
export class BacktestProxy extends BackendApiProxy implements IBacktestProxy {
  async submitBacktest(backtestRequestDomain: BacktestRequestDomain): Promise<BacktestRun> {
    try {
      const wire = await this.requestBackend<BacktestRunWire>(BACKTESTS_ENDPOINT, {
        method: 'POST',
        body: this.scriptReplayBody(backtestRequestDomain),
      })

      return toBacktestRun(wire)
    }
    catch (error: unknown) {
      throw this.backtestFailureOf(error)
    }
  }

  /** 在合約帳戶上重演一支合約策略腳本：現貨那一份 body，加上合約多問的那幾格。 */
  async submitContractBacktest(
    backtestRequestDomain: BacktestRequestDomain, termsDomain: ContractBacktestTermsDomain,
  ): Promise<BacktestRun> {
    try {
      const wire = await this.requestBackend<BacktestRunWire>(CONTRACT_BACKTESTS_ENDPOINT, {
        method: 'POST',
        body: { ...this.scriptReplayBody(backtestRequestDomain), ...contractTermsBody(termsDomain) },
      })

      return toBacktestRun(wire)
    }
    catch (error: unknown) {
      throw this.backtestFailureOf(error)
    }
  }

  /** 重演一支腳本的 body——現貨與合約兩個入口收的是同一份。 */
  private scriptReplayBody(backtestRequestDomain: BacktestRequestDomain) {
    return {
      symbol: backtestRequestDomain.symbol,
      aggregationInterval: backtestRequestDomain.aggregationInterval.value,
      startTime: backtestRequestDomain.startTime.toISOString(),
      endTime: backtestRequestDomain.endTime.toISOString(),
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
      ...replayTimingBody(backtestRequestDomain.fillTiming, backtestRequestDomain.validationStartTime),
      // 指名一支策略腳本時**只送識別碼**，與指標計算同一條規則：算式與旋鈕宣告都在那一支身上，
      // 再送一份只會多出一個可能與它不一致的答案——而從市集加入的那些根本沒有算式可以送。
      //
      // 自帶算式時，宣告與這一次的值分兩份送，與指標計算完全相同：系統要先知道這支算式
      // **宣告**了哪些名字，才有辦法在算式取用一個沒宣告的名字時指名說出是哪一個。
      ...(backtestRequestDomain.strategyScriptId === undefined
        ? {
            script: backtestRequestDomain.script,
            parameters: backtestRequestDomain.parameters.all.map(parameter => ({
              name: parameter.name,
              kind: parameter.kind,
              defaultValue: parameter.value,
            })),
          }
        : { strategyScriptId: backtestRequestDomain.strategyScriptId }),
      parameterValues: backtestRequestDomain.parameters.all.map(parameter => ({
        name: parameter.name,
        value: parameter.value,
      })),
    }
  }

  /**
   * 重演一整份交易策略。
   *
   * 送出去的少了兩樣：**算式與彙總刻度**。那兩樣是那份交易策略的信號來源自己說的，
   * 順手送過去等於同一件事有兩個答案，而沒有規則說哪一個贏。
   */
  async submitTradingStrategyBacktest(
    requestDomain: TradingStrategyBacktestRequestDomain,
  ): Promise<BacktestRun> {
    try {
      const wire = await this.requestBackend<BacktestRunWire>(
        `${TRADING_STRATEGIES_ENDPOINT}/${requestDomain.tradingStrategyId}/backtests`, {
          method: 'POST',
          body: this.tradingStrategyReplayBody(requestDomain),
        })

      return toBacktestRun(wire)
    }
    catch (error: unknown) {
      throw this.backtestFailureOf(error)
    }
  }

  /**
   * 在合約帳戶上重演一份合約交易策略：現貨那一份 body，加上槓桿與滑點。
   * 交易模式不送——它是那份交易策略自己的。
   */
  async submitContractTradingStrategyBacktest(
    requestDomain: TradingStrategyBacktestRequestDomain, termsDomain: ContractBacktestTermsDomain,
  ): Promise<BacktestRun> {
    try {
      const wire = await this.requestBackend<BacktestRunWire>(
        `${TRADING_STRATEGIES_ENDPOINT}/${requestDomain.tradingStrategyId}/contract-backtests`, {
          method: 'POST',
          body: { ...this.tradingStrategyReplayBody(requestDomain), ...contractTermsBody(termsDomain) },
        })

      return toBacktestRun(wire)
    }
    catch (error: unknown) {
      throw this.backtestFailureOf(error)
    }
  }

  /** 重演一份交易策略的 body——現貨與合約兩個入口收的是同一份。 */
  private tradingStrategyReplayBody(requestDomain: TradingStrategyBacktestRequestDomain) {
    return {
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
      ...replayTimingBody(requestDomain.fillTiming, requestDomain.validationStartTime),
      // 借錢、滑點與交易模式不在這一份裡：現貨重演不收它們，
      // 合約重演的那兩格由 contractTermsBody 另外補上。
    }
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

    // 同時太多筆：不是請求寫錯，是要等一筆結束。後端說出上限，這裡照它說的數字講。
    if (error instanceof BackendRequestRejectedError && error.ownerActiveLimit !== undefined) {
      return new BacktestRunOwnerLimitError(error.ownerActiveLimit, { cause: error })
    }

    // 與算式跑不動同一個狀態碼，所以先認它：這一次是太長或太細，不是算式寫錯。
    if (error instanceof BackendRequestRejectedError && error.timeAllowanceSpent) {
      return new BacktestTimeAllowanceSpentError(error.message, { cause: error })
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
        return new BacktestFieldError(field, error.localizedMessage, { cause: error })
      }
    }

    return error
  }
}
