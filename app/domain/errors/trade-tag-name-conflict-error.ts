import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

export class TradeTagNameConflictError extends Error {
  /** 後端說的原文，原樣呈現、不翻。 */
  readonly localizedMessage: UntranslatedTextVo

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'TradeTagNameConflictError'
    this.localizedMessage = new UntranslatedTextVo(message)
  }
}
