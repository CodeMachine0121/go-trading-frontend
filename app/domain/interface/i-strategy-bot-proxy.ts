import type { StrategyBot } from '~/domain/models/entities/strategy-bot'
import type { StrategyBotRunRecord } from '~/domain/models/entities/strategy-bot-run-record'
import type { StrategyBotWriteDomain } from '~/domain/models/domains/strategy-bot-write-domain'

/**
 * 介面：取得與操作策略機器人的能力。
 *
 * 啟動與停止是兩個方法而不是一個帶旗標的方法，因為它們的失敗方式完全不同：
 * 啟動有三種各自要做不同事的拒絕（沒設定 Telegram、達到上限、看不到那一台），
 * 停止只有一種。一個共用的方法會讓呼叫端從一堆錯誤裡分辨哪幾種只對啟動有意義。
 */
export interface IStrategyBotProxy {
  /** 自己的每一台，順序照後端交出的樣子——這一側不重排。 */
  listStrategyBots(): Promise<StrategyBot[]>

  /** 指名一台。看不到時拋 StrategyBotNotFoundError。 */
  getStrategyBot(id: number): Promise<StrategyBot>

  /**
   * 存一台。撞名時拋 StrategyBotNameConflictError，
   * 指名的策略看不到時拋 StrategyNotFoundError。
   */
  createStrategyBot(strategyBotWriteDomain: StrategyBotWriteDomain): Promise<StrategyBot>

  /** 改寫一台。執行中時拋 StrategyBotRunningError。 */
  updateStrategyBot(strategyBotWriteDomain: StrategyBotWriteDomain): Promise<StrategyBot>

  /** 刪掉一台。執行中的也刪得掉。 */
  deleteStrategyBot(id: number): Promise<void>

  /**
   * 開始跑。還沒設定 Telegram 時拋 TelegramNotConfiguredError——
   * 那是唯一一種要離開這個畫面才解得掉的拒絕，所以它要認得出來。
   */
  startStrategyBot(id: number): Promise<StrategyBot>

  /** 停下來。 */
  stopStrategyBot(id: number): Promise<StrategyBot>

  /**
   * 不等排程，現在就跑一輪。已停止的也跑得動——試一台機器人不該非得先讓它跑著。
   * 正在跑一輪時拋 StrategyBotAlreadyRunningARoundError。
   */
  runRoundNow(id: number): Promise<StrategyBot>

  /**
   * 這台機器人跑過哪幾輪，最新的排前面。
   *
   * 它自己一條路而不是跟著機器人一起回來，因為兩者是在不同時刻、以不同的量讀的：
   * 機器人清單是打開來看「哪一台該管」，歷史是打開來看「其中那一台」。
   */
  listRunRecords(id: number): Promise<StrategyBotRunRecord[]>
}
