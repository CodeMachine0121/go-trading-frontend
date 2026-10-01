import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'
import type { TradingKeyVerificationFailureVo } from '~/domain/models/vo/trading-key-verification-failure-vo'

export class BinanceTradingKeyVerificationError extends Error {
  /** 後端說的原文，原樣呈現、不翻。 */
  readonly localizedMessage: UntranslatedTextVo

  constructor(
    message: string,
    public readonly reason: TradingKeyVerificationFailureVo,
    options?: { cause?: unknown },
  ) {
    super(message, options)
    this.name = 'BinanceTradingKeyVerificationError'
    this.localizedMessage = new UntranslatedTextVo(message)
  }
}
