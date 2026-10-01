import { LocalizedError } from '~/domain/errors/localized-error'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'
import type { TradingKeyVerificationFailureVo } from '~/domain/models/vo/trading-key-verification-failure-vo'

export class BinanceTradingKeyVerificationError extends LocalizedError {
  constructor(
    message: string,
    public readonly reason: TradingKeyVerificationFailureVo,
    options?: { cause?: unknown },
  ) {
    super(new UntranslatedTextVo(message), options)
    this.name = 'BinanceTradingKeyVerificationError'
  }
}
