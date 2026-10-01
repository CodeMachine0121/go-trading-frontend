import { LocalizedError } from '~/domain/errors/localized-error'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'
import type { AutoOrderRefusalReasonVo } from '~/domain/models/vo/auto-order-refusal-reason-vo'

export class AutoOrderRefusedError extends LocalizedError {
  constructor(
    message: string,
    public readonly reason: AutoOrderRefusalReasonVo,
    options?: { cause?: unknown },
  ) {
    super(new UntranslatedTextVo(message), options)
    this.name = 'AutoOrderRefusedError'
  }
}
