import { LocalizedError } from '~/domain/errors/localized-error'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

/** 這個人自己已經有一份同名的交易策略。別人有不算。 */
export class TradingStrategyNameConflictError extends LocalizedError {
  constructor(message: string, options?: ErrorOptions) {
    super(new UntranslatedTextVo(message), options)
    this.name = 'TradingStrategyNameConflictError'
  }
}
