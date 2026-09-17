/**
 * 刪不掉：還有機器人在用它。
 *
 * 與「有機器人在跑」分開，是因為要做的事不同：這一個要去改掉或刪掉那幾台機器人，
 * 那一個只要按停止。後端那句話裡有幾台在用，所以原樣講出來。
 */
export class TradingStrategyInUseError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'TradingStrategyInUseError'
  }
}
