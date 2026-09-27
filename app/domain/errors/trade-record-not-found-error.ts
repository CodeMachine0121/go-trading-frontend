export class TradeRecordNotFoundError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'TradeRecordNotFoundError'
  }
}
