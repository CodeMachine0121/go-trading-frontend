/** 這個人自己已經有一份同名的交易策略。別人有不算。 */
export class TradingStrategyNameConflictError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'TradingStrategyNameConflictError'
  }
}
