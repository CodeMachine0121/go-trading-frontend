import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

/**
 * 前一則回答還在寫，所以這一句送不出去。
 *
 * 它自成一種，因為使用者要做的事與其他每一種都不同：不是改寫、不是等到明天、
 * 不是換一個助手——只是等一下那則已經在寫的。
 */
export class AssistantAnswerInProgressError extends Error {
  /** 後端說的原文，原樣呈現、不翻。 */
  readonly localizedMessage: UntranslatedTextVo

  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'AssistantAnswerInProgressError'
    this.localizedMessage = new UntranslatedTextVo(message)
  }
}
