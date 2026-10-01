import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

/** 看不到一份交易策略：它不在了，或它是別人的。兩者共用這一個，一如後端共用一句話。 */
export class TradingStrategyNotFoundError extends Error {
  /** 後端那一句的原文，不翻。 */
  readonly localizedMessage: UntranslatedTextVo

  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.localizedMessage = new UntranslatedTextVo(message)
    this.name = 'TradingStrategyNotFoundError'
  }
}
