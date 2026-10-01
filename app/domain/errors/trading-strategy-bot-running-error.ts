import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

/**
 * 改不動：有機器人正照著它跑。
 *
 * 後端那句話裡有那幾台的名字，所以原樣講出來——少了名字，使用者得自己一台一台找。
 */
export class TradingStrategyBotRunningError extends Error {
  /** 後端說的原文，原樣呈現、不翻。 */
  readonly localizedMessage: UntranslatedTextVo

  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'TradingStrategyBotRunningError'
    this.localizedMessage = new UntranslatedTextVo(message)
  }
}
