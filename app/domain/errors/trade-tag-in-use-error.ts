export class TradeTagInUseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'TradeTagInUseError'
  }
}
