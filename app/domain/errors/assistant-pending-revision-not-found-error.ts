import { LocalizedError } from '~/domain/errors/localized-error'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

/** 哨兵錯誤：指名的那一筆待確認修改不存在，或不是這個人的。 */
export class AssistantPendingRevisionNotFoundError extends LocalizedError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(new UntranslatedTextVo(message), options)
    this.name = 'AssistantPendingRevisionNotFoundError'
  }
}
