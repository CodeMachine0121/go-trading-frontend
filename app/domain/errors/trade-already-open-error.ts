import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

export class TradeAlreadyOpenError extends Error {
  /** 後端說的原文，原樣呈現、不翻。 */
  readonly localizedMessage: UntranslatedTextVo

  constructor(
    message: string,
    public readonly existingTradeId: number | null,
    options?: { cause?: unknown },
  ) {
    super(message, options)
    this.name = 'TradeAlreadyOpenError'
    this.localizedMessage = new UntranslatedTextVo(message)
  }
}
