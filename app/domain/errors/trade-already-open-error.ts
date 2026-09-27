export class TradeAlreadyOpenError extends Error {
  constructor(
    message: string,
    public readonly existingTradeId: number | null,
    options?: { cause?: unknown },
  ) {
    super(message, options)
    this.name = 'TradeAlreadyOpenError'
  }
}
