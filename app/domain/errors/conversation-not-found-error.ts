import { LocalizedError } from '~/domain/errors/localized-error'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

/**
 * 哨兵錯誤：指名的那一段對話不存在。
 *
 * 它自成一種，是因為使用者要做的事是**開一段新的**，而不是改輸入或等一等。
 */
export class ConversationNotFoundError extends LocalizedError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(new UntranslatedTextVo(message), options)
    this.name = 'ConversationNotFoundError'
  }
}
