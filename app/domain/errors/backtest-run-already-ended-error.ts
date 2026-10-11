import { LocalizedError } from '~/domain/errors/localized-error'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

/** 哨兵錯誤：要取消的那一筆已經結束了，後端的原話帶回。 */
export class BacktestRunAlreadyEndedError extends LocalizedError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(new UntranslatedTextVo(message), { cause: options?.cause })
    this.name = 'BacktestRunAlreadyEndedError'
  }
}
