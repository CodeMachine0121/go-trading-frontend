import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

export class JournalLinkNotFoundError extends Error {
  /** 後端說的原文，原樣呈現、不翻。 */
  readonly localizedMessage: UntranslatedTextVo

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'JournalLinkNotFoundError'
    this.localizedMessage = new UntranslatedTextVo(message)
  }
}
