import type { IStrategyBotProxy } from '~/domain/interface/i-strategy-bot-proxy'
import type { StrategyBotWriteDomain } from '~/domain/models/domains/strategy-bot-write-domain'
import { StrategyBotRunRecord } from '~/domain/models/entities/strategy-bot-run-record'
import { StrategyBot } from '~/domain/models/entities/strategy-bot'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { StrategyBotNameConflictError } from '~/domain/errors/strategy-bot-name-conflict-error'
import { StrategyBotNotFoundError } from '~/domain/errors/strategy-bot-not-found-error'
import { StrategyBotRunningError } from '~/domain/errors/strategy-bot-running-error'
import { TradingStrategyNotFoundError } from '~/domain/errors/trading-strategy-not-found-error'
import { TelegramNotConfiguredError } from '~/domain/errors/telegram-not-configured-error'
import type { BackendRequestValue } from '~/infrastructure/proxy/backend-api-proxy'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'
import type { StrategyBotRunStateVo } from '~/domain/models/vo/strategy-bot-run-state-vo'
import type { StrategyBotHaltReasonVo } from '~/domain/models/vo/strategy-bot-halt-reason-vo'
import Decimal from 'decimal.js'
import { PositionPlanDto } from '~/domain/models/dto/position-plan-dto'
import type { PositionSizingMode } from '~/domain/models/vo/position-sizing-mode-vo'
import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'
import { MarketDataKindDomain } from '~/domain/models/domains/market-data-kind-domain'

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
  /**
   * 那一輪建議的三個數字。
   *
   * 三個都可以沒有，而沒有是常態：後端對沒有建議的那幾輪**整個欄位不回**，
   * 所以「沒有」與「零」分得出來——止損價真的可以是零。
   */
  suggestedStake?: string | null
  suggestedStopLossPrice?: string | null
  suggestedTakeProfitPrice?: string | null
  /** 合約那一輪有建議時才有：方向（`long`／`short`）、槓桿倍數與名目。現貨整個不回。 */
  suggestedDirection?: string | null
  suggestedLeverage?: string | null
  suggestedNotional?: string | null
}

/**
 * 後端回來的那一組部位規劃。整組可以沒有——那台機器人就是不建議部位。
 *
 * 首字大寫的那一組是舊版後端的拼法：它曾經把這一組以欄位原名交出來，
 * 而這一側一直照小寫讀，於是讀到的永遠是空的。兩種都認，後端換成一致的拼法前後都讀得到。
 */
type PositionPlanWire = {
  capital?: string | null
  sizingMode?: string | null
  sizingValue?: string | null
  stopLossPercentage?: string | null
  takeProfitPercentage?: string | null
  /** 只有合約機器人有。 */
  leverage?: string | null
  Capital?: string | null
  SizingMode?: string | null
  SizingValue?: string | null
  StopLossPercentage?: string | null
  TakeProfitPercentage?: string | null
}

type StrategyBotWire = {
  id: number
  name: string
  symbol: string
  triggerIntervalMinutes: number
  tradingStrategyId: number
  tradingStrategyName?: string
  runState: string
  lastSentSignal?: string
  haltReason?: string
  conflicting?: boolean
  positionPlan?: PositionPlanWire | null
  /** 舊版後端不回，那一台就是現貨機器人。 */
  marketDataKind?: string
}

/**
 * Proxy：打策略機器人的七條路由，並把四種各自要做不同事的拒絕分出來。
 *
 * 四種分開，是因為它們要使用者做的事完全不同：改名字、換一支策略腳本、
 * 先按停止、**離開這個畫面去設定 Telegram**。合成一句「請求被拒絕」，
 * 就沒有人知道該往哪走。
 */
export class StrategyBotProxy extends BackendApiProxy implements IStrategyBotProxy {
  async listStrategyBots(marketDataKind: MarketDataKind): Promise<StrategyBot[]> {
    // 只請後端交出這一種：篩選是它的規則，這一側不再篩一次。
    const botsWire = await this.requestBackend<StrategyBotWire[]>(
      STRATEGY_BOTS_ENDPOINT, { query: { marketDataKind } })

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
        this.toSuggestedFigure(runRecordWire.suggestedStake),
        this.toSuggestedFigure(runRecordWire.suggestedStopLossPrice),
        this.toSuggestedFigure(runRecordWire.suggestedTakeProfitPrice),
        runRecordWire.suggestedDirection ?? null,
        this.toSuggestedFigure(runRecordWire.suggestedLeverage),
        this.toSuggestedFigure(runRecordWire.suggestedNotional),
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
      // 指名一份看不到的交易策略，後端也回這一個狀態碼。兩者靠訊息分開，
      // 因為要做的事不同：一個去挑別的規則，一個是這一台根本不在了。
      return error.message.includes('策略機器人')
        ? new StrategyBotNotFoundError(error.message, { cause: error })
        : new TradingStrategyNotFoundError(error.message, { cause: error })
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
    const body: Record<string, BackendRequestValue> = {
      name: writeDto.name,
      symbol: writeDto.symbol,
      tradingStrategyId: writeDto.tradingStrategyId,
      triggerIntervalMinutes: writeDto.triggerIntervalMinutes,
      marketDataKind: writeDto.marketDataKind,
    }

    // 沒有部位規劃就**整個鍵都不放**，而不是放一組零。
    // 後端讀零與讀「沒有」是同一件事，但送一組零過去，
    // 讀這段程式的人會以為這一側替他填了什麼。
    if (writeDto.positionPlan !== null) {
      body.positionPlan = {
        // 金額一律以字串送，理由與回來時相同：它是精確小數。
        capital: writeDto.positionPlan.capital.toString(),
        sizingMode: writeDto.positionPlan.sizingMode,
        sizingValue: writeDto.positionPlan.sizingValue.toString(),
        stopLossPercentage: writeDto.positionPlan.stopLossPercentage.toString(),
        takeProfitPercentage: writeDto.positionPlan.takeProfitPercentage.toString(),
        // 現貨機器人沒有這一格，整個鍵都不放：送一個 1 過去，讀的人會以為現貨也談得到槓桿。
        ...(writeDto.positionPlan.leverage === null
          ? {}
          : { leverage: writeDto.positionPlan.leverage.toString() }),
      }
    }

    return body
  }

  /**
   * 後端那一組部位規劃讀成領域看得懂的形狀，或 `null`。
   *
   * **資金非正就是 `null`**——那是後端自己的規則（資金是這一組的開關），
   * 這一側照它講而不是再定一條。一個還沒認得這個欄位的後端不回它，
   * 而那也讀作 `null`。
   */
  private toPositionPlan(
    marketDataKind: MarketDataKindDomain,
    positionPlanWire?: PositionPlanWire | null,
  ): PositionPlanDto | null {
    const capital = new Decimal(positionPlanWire?.capital ?? positionPlanWire?.Capital ?? 0)
    // 大於零，不是 `isPositive()`：decimal.js 的零是正的，
    // 而零正是後端表示「沒有部位規劃」的方式。
    if (!capital.greaterThan(0)) {
      return null
    }

    return new PositionPlanDto(
      capital,
      (positionPlanWire?.sizingMode || positionPlanWire?.SizingMode || 'allIn') as PositionSizingMode,
      new Decimal(positionPlanWire?.sizingValue ?? positionPlanWire?.SizingValue ?? 0),
      new Decimal(positionPlanWire?.stopLossPercentage ?? positionPlanWire?.StopLossPercentage ?? 0),
      new Decimal(positionPlanWire?.takeProfitPercentage ?? positionPlanWire?.TakeProfitPercentage ?? 0),
      // 合約機器人沒回槓桿就是一倍（後端的讀法）；現貨機器人一律沒有這一格。
      marketDataKind.toStrategyBotPageDto().takesLeverage
        ? new Decimal(positionPlanWire?.leverage ?? 1)
        : null,
    )
  }

  /** 那一輪建議過的一個數字，或 `null`。零與沒有是兩回事。 */
  private toSuggestedFigure(figure?: string | null): Decimal | null {
    return figure === undefined || figure === null ? null : new Decimal(figure)
  }

  private toStrategyBot(botWire: StrategyBotWire): StrategyBot {
    const marketDataKind = new MarketDataKindDomain(botWire.marketDataKind ?? '')

    return new StrategyBot(
      botWire.id,
      botWire.name,
      botWire.symbol,
      botWire.triggerIntervalMinutes,
      botWire.tradingStrategyId,
      botWire.tradingStrategyName ?? '',
      botWire.runState as StrategyBotRunStateVo,
      botWire.lastSentSignal ?? '',
      (botWire.haltReason ?? '') === ''
        ? null
        : botWire.haltReason as StrategyBotHaltReasonVo,
      botWire.conflicting ?? false,
      this.toPositionPlan(marketDataKind, botWire.positionPlan),
      marketDataKind.value,
    )
  }
}
