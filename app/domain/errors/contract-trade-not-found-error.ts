export class ContractTradeNotFoundError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'ContractTradeNotFoundError'
  }
}
