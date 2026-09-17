/** 看不到一份交易策略：它不在了，或它是別人的。兩者共用這一個，一如後端共用一句話。 */
export class TradingStrategyNotFoundError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'TradingStrategyNotFoundError'
  }
}
