import type { TradingKeyVerificationFailureVo } from '~/domain/models/vo/trading-key-verification-failure-vo'

export class BinanceTradingKeyVerificationError extends Error {
  constructor(
    message: string,
    public readonly reason: TradingKeyVerificationFailureVo,
    options?: { cause?: unknown },
  ) {
    super(message, options)
    this.name = 'BinanceTradingKeyVerificationError'
  }
}
