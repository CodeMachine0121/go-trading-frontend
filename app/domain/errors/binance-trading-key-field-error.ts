import type { BinanceTradingKeyFieldVo } from '~/domain/models/vo/binance-trading-key-field-vo'

export class BinanceTradingKeyFieldError extends Error {
  constructor(
    message: string,
    public readonly field: BinanceTradingKeyFieldVo | null,
    options?: { cause?: unknown },
  ) {
    super(message, options)
    this.name = 'BinanceTradingKeyFieldError'
  }
}
