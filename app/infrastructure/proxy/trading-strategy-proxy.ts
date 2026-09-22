import type { ITradingStrategyProxy } from '~/domain/interface/i-trading-strategy-proxy'
import type { TradingStrategyWriteDomain } from '~/domain/models/domains/trading-strategy-write-domain'
import type { TradingStrategyConditionDto } from '~/domain/models/dto/trading-strategy-condition-dto'
import {
  TradingStrategy,
  TradingStrategyCondition,
  TradingStrategyParameterValue,
  TradingStrategySignalSource,
} from '~/domain/models/entities/trading-strategy'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { TradingStrategyBotRunningError } from '~/domain/errors/trading-strategy-bot-running-error'
import { TradingStrategyInUseError } from '~/domain/errors/trading-strategy-in-use-error'
import { TradingStrategyNameConflictError } from '~/domain/errors/trading-strategy-name-conflict-error'
import { TradingStrategyNotFoundError } from '~/domain/errors/trading-strategy-not-found-error'
import { StrategyScriptNotFoundError } from '~/domain/errors/strategy-script-not-found-error'
import type { BackendRequestValue } from '~/infrastructure/proxy/backend-api-proxy'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'

const TRADING_STRATEGIES_ENDPOINT = '/trading-strategies'

/** 後端用這兩個狀態碼分別表示「看不到那一份」與「有一條規則擋著」。只有這裡需要知道。 */
const NOT_FOUND_STATUS = 404
const CONFLICT_STATUS = 409

/**
 * 後端說「還有機器人在用它」時，訊息裡一定有的那幾個字。
 *
 * 靠訊息內容認它，是因為後端把它與撞名歸在同一個狀態碼下——而這兩種要做的事
 * 完全不同：一個去改名字，一個去處理那幾台機器人。
 */
const IN_USE_HINT = '台機器人正在用它'

/**
 * 後端說「有機器人正在跑」時，訊息裡一定有的那幾個字。
 *
 * 它與上面那一句**都說得出「機器人正在用它」**，所以認的是後半段：
 * 一句要他去按停止，一句要他去改掉或刪掉那幾台。
 */
const BOT_RUNNING_HINT = '請先停止'

/** 後端回來的一個信號來源。**它沒有 script**——那不是漏了，是那一欄不存在。 */
type TradingStrategySignalSourceWire = {
  label: string
  strategyScriptId: number
  aggregationInterval: string
  parameterValues?: { name: string, value: number }[] | null
}

/** 後端回來的一個條件節點，遞迴。 */
type TradingStrategyConditionWire = {
  operator?: string
  conditions?: TradingStrategyConditionWire[] | null
  sourceLabel?: string
  signal?: string
}

type TradingStrategyWire = {
  id: number
  name: string
  signalSources?: TradingStrategySignalSourceWire[] | null
  buyCondition?: TradingStrategyConditionWire | null
  sellCondition?: TradingStrategyConditionWire | null
}

/**
 * Proxy：打交易策略的五條路由，並把四種各自要做不同事的拒絕分出來。
 *
 * 四種分開，是因為它們要使用者做的事完全不同：改名字、換一支策略腳本、
 * **去停一台機器人**、**去處理幾台機器人**。合成一句「請求被拒絕」，
 * 就沒有人知道該往哪走。
 */
export class TradingStrategyProxy extends BackendApiProxy implements ITradingStrategyProxy {
  async listTradingStrategies(): Promise<TradingStrategy[]> {
    const wire = await this.requestBackend<TradingStrategyWire[]>(TRADING_STRATEGIES_ENDPOINT)

    return (wire ?? []).map(one => this.toTradingStrategy(one))
  }

  async getTradingStrategy(id: number): Promise<TradingStrategy> {
    return this.requestTradingStrategy(`${TRADING_STRATEGIES_ENDPOINT}/${id}`, 'GET')
  }

  async createTradingStrategy(writeDomain: TradingStrategyWriteDomain): Promise<TradingStrategy> {
    return this.requestTradingStrategy(
      TRADING_STRATEGIES_ENDPOINT, 'POST', this.toBody(writeDomain))
  }

  async updateTradingStrategy(writeDomain: TradingStrategyWriteDomain): Promise<TradingStrategy> {
    return this.requestTradingStrategy(
      `${TRADING_STRATEGIES_ENDPOINT}/${writeDomain.id}`, 'PUT', this.toBody(writeDomain))
  }

  async deleteTradingStrategy(id: number): Promise<void> {
    try {
      await this.requestBackend<null>(`${TRADING_STRATEGIES_ENDPOINT}/${id}`, { method: 'DELETE' })
    }
    catch (error: unknown) {
      throw this.tradingStrategyFailureOf(error)
    }
  }

  private async requestTradingStrategy(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: Record<string, BackendRequestValue>,
  ): Promise<TradingStrategy> {
    try {
      const wire = await this.requestBackend<TradingStrategyWire>(path, { method, body })

      return this.toTradingStrategy(wire)
    }
    catch (error: unknown) {
      throw this.tradingStrategyFailureOf(error)
    }
  }

  /**
   * 把後端的拒絕翻成一個說得出「該做什麼」的錯誤。
   *
   * 認不出來的原樣丟回去：一個猜錯的翻譯，比一句原話更難查。
   */
  private tradingStrategyFailureOf(error: unknown): unknown {
    if (!(error instanceof BackendRequestRejectedError)) {
      return error
    }

    if (error.status === NOT_FOUND_STATUS) {
      // 指名一支看不到的策略腳本，後端也回這一個狀態碼。兩者靠訊息分開，
      // 因為要做的事不同：一個去挑別的腳本，一個是這一份根本不在了。
      return error.message.includes('策略腳本')
        ? new StrategyScriptNotFoundError(error.message, { cause: error })
        : new TradingStrategyNotFoundError(error.message, { cause: error })
    }

    if (error.status === CONFLICT_STATUS) {
      // 「在跑」先問，因為兩句話都說得出「機器人正在用它」——差別在後半段：
      // 一句要他去按停止，一句要他去改掉或刪掉那幾台。認錯的話，
      // 一個只要按停止的人會被叫去刪機器人。
      if (error.message.includes(BOT_RUNNING_HINT)) {
        return new TradingStrategyBotRunningError(error.message, { cause: error })
      }
      if (error.message.includes(IN_USE_HINT)) {
        return new TradingStrategyInUseError(error.message, { cause: error })
      }

      return new TradingStrategyNameConflictError(error.message, { cause: error })
    }

    return error
  }

  private toBody(writeDomain: TradingStrategyWriteDomain): Record<string, BackendRequestValue> {
    const writeDto = writeDomain.sendable

    // 這裡不再自己去空白：正規化是 TradingStrategyWriteDomain.sendable 整份一起做的。
    // 在這裡補一格，就是讓「哪幾格正規化過」有兩個答案。
    return {
      name: writeDto.name,
      signalSources: writeDto.signalSources.map(signalSource => ({
        label: signalSource.label,
        strategyScriptId: signalSource.strategyScriptId,
        aggregationInterval: signalSource.aggregationInterval,
        parameterValues: signalSource.parameterValues.map(parameterValue => ({
          name: parameterValue.name,
          value: parameterValue.value,
        })),
      })),
      buyCondition: this.toConditionBody(writeDto.buyCondition),
      sellCondition: this.toConditionBody(writeDto.sellCondition),
    }
  }

  /**
   * 把一棵條件樹送出去，**沿路把畫面用的節點識別碼丟掉**。
   *
   * 那個識別碼只活在這一側，是為了讓 Vue 認得出同一個節點；後端既不收也不給。
   * 順手送過去的話，它會被當成一個後端不認得的欄位——今天無害，
   * 但它會變成一份沒有人宣告過、卻兩邊都在傳的資料。
   */
  private toConditionBody(condition: TradingStrategyConditionDto | null): BackendRequestValue {
    if (condition === null) {
      return null
    }

    if (!condition.isGroup) {
      return { sourceLabel: condition.sourceLabel, signal: condition.signal }
    }

    return {
      operator: condition.operator ?? '',
      conditions: condition.conditions.map(child => this.toConditionBody(child)),
    }
  }

  private toTradingStrategy(wire: TradingStrategyWire): TradingStrategy {
    return new TradingStrategy(
      wire.id,
      wire.name,
      // 認不得的拼法與沒有一樣讀作預設值。這一側不是那個規則的家——
      // 後端存的時候就已經擋掉認不得的值了，而這裡要的是「畫面永遠畫得出來」。
      (wire.signalSources ?? []).map(sourceWire => new TradingStrategySignalSource(
        sourceWire.label,
        sourceWire.strategyScriptId,
        sourceWire.aggregationInterval,
        (sourceWire.parameterValues ?? []).map(
          parameterValue => new TradingStrategyParameterValue(
            parameterValue.name, parameterValue.value)),
      )),
      this.toCondition(wire.buyCondition),
      this.toCondition(wire.sellCondition),
    )
  }

  /**
   * 後端用「什麼都沒有的那一個物件」表示一棵空的樹，所以既不是群組也不是一句比對的
   * 節點一律讀成「沒有條件」——留著它的話，畫面會畫出一個既不能編也不能刪的空框。
   */
  private toCondition(
    conditionWire: TradingStrategyConditionWire | null | undefined,
  ): TradingStrategyCondition | null {
    if (conditionWire === null || conditionWire === undefined) {
      return null
    }

    const operator = conditionWire.operator ?? ''
    const sourceLabel = conditionWire.sourceLabel ?? ''

    if (operator === '' && sourceLabel === '') {
      return null
    }

    return new TradingStrategyCondition(
      operator,
      (conditionWire.conditions ?? [])
        .map(child => this.toCondition(child))
        .filter((child): child is TradingStrategyCondition => child !== null),
      sourceLabel,
      conditionWire.signal ?? '',
    )
  }
}
