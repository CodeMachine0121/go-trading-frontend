import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

/** 這個人自己已經有一份同名的交易策略。別人有不算。 */
export class TradingStrategyNameConflictError extends Error {
  /** 後端那一句的原文，不翻。 */
  readonly localizedMessage: UntranslatedTextVo

  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.localizedMessage = new UntranslatedTextVo(message)
    this.name = 'TradingStrategyNameConflictError'
  }
}
