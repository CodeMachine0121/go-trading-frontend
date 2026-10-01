import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

/** 哨兵錯誤：指名的那一筆待確認修改不存在，或不是這個人的。 */
export class AssistantPendingRevisionNotFoundError extends Error {
  /** 後端說的原文，原樣呈現、不翻。 */
  readonly localizedMessage: UntranslatedTextVo

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'AssistantPendingRevisionNotFoundError'
    this.localizedMessage = new UntranslatedTextVo(message)
  }
}
