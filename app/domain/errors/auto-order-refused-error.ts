import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'
import type { AutoOrderRefusalReasonVo } from '~/domain/models/vo/auto-order-refusal-reason-vo'

export class AutoOrderRefusedError extends Error {
  /** 後端說的原文，原樣呈現、不翻。 */
  readonly localizedMessage: UntranslatedTextVo

  constructor(
    message: string,
    public readonly reason: AutoOrderRefusalReasonVo,
    options?: { cause?: unknown },
  ) {
    super(message, options)
    this.name = 'AutoOrderRefusedError'
    this.localizedMessage = new UntranslatedTextVo(message)
  }
}
