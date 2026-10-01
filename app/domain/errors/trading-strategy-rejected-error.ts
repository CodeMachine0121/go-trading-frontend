import { LocalizedError } from '~/domain/errors/localized-error'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/** 這一側就擋下來的那一種：表單自己看得出來不對，一個字都沒送出去。 */
export class TradingStrategyRejectedError extends LocalizedError {
  constructor(localizedMessage: LocalizedTextVo, options?: ErrorOptions) {
    super(localizedMessage, options)
    this.name = 'TradingStrategyRejectedError'
  }
}
