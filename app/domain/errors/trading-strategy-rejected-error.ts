/** 這一側就擋下來的那一種：表單自己看得出來不對，一個字都沒送出去。 */
export class TradingStrategyRejectedError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'TradingStrategyRejectedError'
  }
}
