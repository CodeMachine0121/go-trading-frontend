import type { IStrategyBotProxy } from '~/domain/interface/i-strategy-bot-proxy'
import type { StrategyBotWriteDomain } from '~/domain/models/domains/strategy-bot-write-domain'
import type { StrategyBotConditionDto } from '~/domain/models/dto/strategy-bot-condition-dto'
import { StrategyBotRunRecord } from '~/domain/models/entities/strategy-bot-run-record'
import {
  StrategyBot,
  StrategyBotCondition,
  StrategyBotParameterValue,
  StrategyBotSignalSource,
} from '~/domain/models/entities/strategy-bot'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { StrategyBotNameConflictError } from '~/domain/errors/strategy-bot-name-conflict-error'
import { StrategyBotNotFoundError } from '~/domain/errors/strategy-bot-not-found-error'
import { StrategyBotRunningError } from '~/domain/errors/strategy-bot-running-error'
import { StrategyScriptNotFoundError } from '~/domain/errors/strategy-script-not-found-error'
import { TelegramNotConfiguredError } from '~/domain/errors/telegram-not-configured-error'
import type { BackendRequestValue } from '~/infrastructure/proxy/backend-api-proxy'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'
import type { StrategyBotRunStateVo } from '~/domain/models/vo/strategy-bot-run-state-vo'
import type { StrategyBotHaltReasonVo } from '~/domain/models/vo/strategy-bot-halt-reason-vo'

const STRATEGY_BOTS_ENDPOINT = '/strategy-bots'

/** 後端用這兩個狀態碼分別表示「看不到那一台」與「有一條規則擋著」。只有這裡需要知道。 */
const NOT_FOUND_STATUS = 404
const CONFLICT_STATUS = 409

/**
 * 後端說「還沒完成 Telegram 設定」時，訊息裡一定有的那幾個字。
 *
 * 靠訊息內容認它，是因為後端把它與其他幾種「這份請求不合規則」歸在同一個狀態碼下——
 * 而這一種與那些完全不同：**它要離開這個畫面才解得掉**。認得出它，
 * 畫面才給得出一條到帳號設定的路。
 */
const DELIVERY_NOT_CONFIGURED_HINT = 'Telegram 設定'

/** 後端說「這台正在執行中」時，訊息裡一定有的那幾個字。 */
const BOT_RUNNING_HINT = '執行中'

/** 後端回來的一輪。時間是字串，在這裡就收成一個瞬間，不讓 wire 格式進 domain。 */
type StrategyBotRunRecordWire = {
  runNumber: number
  ranAt: string
  result: string
}

/** 後端回來的一個信號來源。**它沒有 script**——那不是漏了，是那一欄不存在。 */
type StrategyBotSignalSourceWire = {
  label: string
  strategyScriptId: number
  aggregationInterval: string
  parameterValues?: { name: string, value: number }[] | null
}

/** 後端回來的一個條件節點，遞迴。 */
type StrategyBotConditionWire = {
  operator?: string
  conditions?: StrategyBotConditionWire[] | null
  sourceLabel?: string
  signal?: string
}

type StrategyBotWire = {
  id: number
  name: string
  symbol: string
  triggerIntervalMinutes: number
  signalSources?: StrategyBotSignalSourceWire[] | null
  buyCondition?: StrategyBotConditionWire | null
  sellCondition?: StrategyBotConditionWire | null
  runState: string
  lastSentSignal?: string
  haltReason?: string
  conflicting?: boolean
}

/**
 * Proxy：打策略機器人的七條路由，並把四種各自要做不同事的拒絕分出來。
 *
 * 四種分開，是因為它們要使用者做的事完全不同：改名字、換一支策略腳本、
 * 先按停止、**離開這個畫面去設定 Telegram**。合成一句「請求被拒絕」，
 * 就沒有人知道該往哪走。
 */
export class StrategyBotProxy extends BackendApiProxy implements IStrategyBotProxy {
  async listStrategyBots(): Promise<StrategyBot[]> {
    const botsWire = await this.requestBackend<StrategyBotWire[]>(STRATEGY_BOTS_ENDPOINT)

    return (botsWire ?? []).map(botWire => this.toStrategyBot(botWire))
  }

  async getStrategyBot(id: number): Promise<StrategyBot> {
    return this.requestStrategyBot(`${STRATEGY_BOTS_ENDPOINT}/${id}`, 'GET')
  }

  async createStrategyBot(strategyBotWriteDomain: StrategyBotWriteDomain): Promise<StrategyBot> {
    return this.requestStrategyBot(
      STRATEGY_BOTS_ENDPOINT, 'POST', this.toBody(strategyBotWriteDomain))
  }

  async updateStrategyBot(strategyBotWriteDomain: StrategyBotWriteDomain): Promise<StrategyBot> {
    return this.requestStrategyBot(
      `${STRATEGY_BOTS_ENDPOINT}/${strategyBotWriteDomain.id}`,
      'PUT',
      this.toBody(strategyBotWriteDomain))
  }

  async deleteStrategyBot(id: number): Promise<void> {
    try {
      await this.requestBackend<null>(
        `${STRATEGY_BOTS_ENDPOINT}/${id}`, { method: 'DELETE' })
    }
    catch (error: unknown) {
      throw this.strategyBotFailureOf(error)
    }
  }

  /**
   * 開著與關著打的是同一個子資源，只差在方法——它們說的是同一件事的兩個方向
   * （「這台開著」成立或不成立），所以它們的失敗翻譯也一定相同。
   */
  async startStrategyBot(id: number): Promise<StrategyBot> {
    return this.requestStrategyBot(`${STRATEGY_BOTS_ENDPOINT}/${id}/power`, 'POST')
  }

  async stopStrategyBot(id: number): Promise<StrategyBot> {
    return this.requestStrategyBot(`${STRATEGY_BOTS_ENDPOINT}/${id}/power`, 'DELETE')
  }

  /**
   * 不等排程，現在就跑一輪。
   *
   * 它與排程那一輪走的是同一條路，所以它送不送訊息、記不記進歷史，都與它自己跑
   * 一模一樣——這顆鍵要用來確認的正是那件事。
   */
  async runRoundNow(id: number): Promise<StrategyBot> {
    return this.requestStrategyBot(`${STRATEGY_BOTS_ENDPOINT}/${id}/runs`, 'POST')
  }

  async listRunRecords(id: number): Promise<StrategyBotRunRecord[]> {
    try {
      const runRecordsWire = await this.requestBackend<StrategyBotRunRecordWire[]>(
        `${STRATEGY_BOTS_ENDPOINT}/${id}/runs`)

      return (runRecordsWire ?? []).map(runRecordWire => new StrategyBotRunRecord(
        runRecordWire.runNumber,
        new Date(runRecordWire.ranAt),
        runRecordWire.result,
      ))
    }
    catch (error: unknown) {
      throw this.strategyBotFailureOf(error)
    }
  }

  /**
   * 每一條會交回一台機器人的路徑都走這裡：送出、正規化、翻譯失敗。
   *
   * 七條路由裡有五條長這樣，所以這一段有一個名字；把它抄五次，第五次就是那個
   * 忘記翻譯失敗的地方。
   */
  private async requestStrategyBot(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: Record<string, BackendRequestValue>,
  ): Promise<StrategyBot> {
    try {
      const botWire = await this.requestBackend<StrategyBotWire>(path, { method, body })

      return this.toStrategyBot(botWire)
    }
    catch (error: unknown) {
      throw this.strategyBotFailureOf(error)
    }
  }

  /**
   * 把後端的拒絕翻成一種說得出下一步的失敗。
   *
   * 409 之下有兩種：撞名要改名字，執行中要先按停止。它們共用一個狀態碼，
   * 所以只能靠訊息分辨——而分辨得出來是值得的，因為兩種要做的事不一樣。
   */
  private strategyBotFailureOf(error: unknown): unknown {
    if (!(error instanceof BackendRequestRejectedError)) {
      return error
    }

    if (error.status === NOT_FOUND_STATUS) {
      return error.message.includes('策略機器人')
        ? new StrategyBotNotFoundError(error.message, { cause: error })
        : new StrategyScriptNotFoundError(error.message, { cause: error })
    }

    if (error.status === CONFLICT_STATUS) {
      return error.message.includes(BOT_RUNNING_HINT)
        ? new StrategyBotRunningError(error.message, { cause: error })
        : new StrategyBotNameConflictError(error.message, { cause: error })
    }

    if (error.message.includes(DELIVERY_NOT_CONFIGURED_HINT)) {
      return new TelegramNotConfiguredError(error.message, { cause: error })
    }

    return error
  }

  private toBody(
    strategyBotWriteDomain: StrategyBotWriteDomain,
  ): Record<string, BackendRequestValue> {
    const writeDto = strategyBotWriteDomain.sendable

    // 這裡不再自己去空白：正規化是 StrategyBotWriteDomain.sendable 整份一起做的。
    // 在這裡補一格，就是讓「哪幾格正規化過」有兩個答案。
    return {
      name: writeDto.name,
      symbol: writeDto.symbol,
      triggerIntervalMinutes: writeDto.triggerIntervalMinutes,
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
  private toConditionBody(condition: StrategyBotConditionDto | null): BackendRequestValue {
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

  private toStrategyBot(botWire: StrategyBotWire): StrategyBot {
    return new StrategyBot(
      botWire.id,
      botWire.name,
      botWire.symbol,
      botWire.triggerIntervalMinutes,
      (botWire.signalSources ?? []).map(sourceWire => new StrategyBotSignalSource(
        sourceWire.label,
        sourceWire.strategyScriptId,
        sourceWire.aggregationInterval,
        (sourceWire.parameterValues ?? []).map(
          parameterValue => new StrategyBotParameterValue(
            parameterValue.name, parameterValue.value)),
      )),
      this.toCondition(botWire.buyCondition),
      this.toCondition(botWire.sellCondition),
      botWire.runState as StrategyBotRunStateVo,
      botWire.lastSentSignal ?? '',
      (botWire.haltReason ?? '') === ''
        ? null
        : botWire.haltReason as StrategyBotHaltReasonVo,
      botWire.conflicting ?? false,
    )
  }

  /**
   * 後端用「什麼都沒有的那一個物件」表示一棵空的樹，所以既不是群組也不是一句比對的
   * 節點一律讀成「沒有條件」——留著它的話，畫面會畫出一個既不能編也不能刪的空框。
   */
  private toCondition(
    conditionWire: StrategyBotConditionWire | null | undefined,
  ): StrategyBotCondition | null {
    if (conditionWire === null || conditionWire === undefined) {
      return null
    }

    const operator = conditionWire.operator ?? ''
    const sourceLabel = conditionWire.sourceLabel ?? ''

    if (operator === '' && sourceLabel === '') {
      return null
    }

    return new StrategyBotCondition(
      operator,
      (conditionWire.conditions ?? [])
        .map(child => this.toCondition(child))
        .filter((child): child is StrategyBotCondition => child !== null),
      sourceLabel,
      conditionWire.signal ?? '',
    )
  }
}
