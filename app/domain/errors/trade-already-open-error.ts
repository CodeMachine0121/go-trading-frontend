import { LocalizedError } from '~/domain/errors/localized-error'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

export class TradeAlreadyOpenError extends LocalizedError {
  constructor(
    message: string,
    public readonly existingTradeId: number | null,
    options?: { cause?: unknown },
  ) {
    super(new UntranslatedTextVo(message), options)
    this.name = 'TradeAlreadyOpenError'
  }
}
