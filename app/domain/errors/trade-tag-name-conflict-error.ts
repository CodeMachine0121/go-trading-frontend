export class TradeTagNameConflictError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'TradeTagNameConflictError'
  }
}
