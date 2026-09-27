export class ContractTradeOpenPositionExistsError extends Error {
  constructor(
    message: string,
    public readonly existingTradeId: number | null,
    options?: { cause?: unknown },
  ) {
    super(message, options)
    this.name = 'ContractTradeOpenPositionExistsError'
  }
}
