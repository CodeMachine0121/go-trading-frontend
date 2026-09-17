/**
 * 改不動：有機器人正照著它跑。
 *
 * 後端那句話裡有那幾台的名字，所以原樣講出來——少了名字，使用者得自己一台一台找。
 */
export class TradingStrategyBotRunningError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'TradingStrategyBotRunningError'
  }
}
