import { LocalizedError } from '~/domain/errors/localized-error'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

export class SymbolScreeningRunAlreadyEndedError extends LocalizedError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(new UntranslatedTextVo(message), { cause: options?.cause })
    this.name = 'SymbolScreeningRunAlreadyEndedError'
  }
}
