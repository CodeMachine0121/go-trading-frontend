import { LocalizedError } from '~/domain/errors/localized-error'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

/**
 * 哨兵錯誤：交易服務說這一次重演沒在整次允許時間內跑完。
 *
 * 它自成一類，因為下一步與其他失敗都不同：算式沒有錯、請求也沒有錯、後端也沒有壞——
 * 是這一段太長或刻度太細。說成其中任何一種，都會讓人去改一個沒有問題的東西。
 */
export class BacktestTimeAllowanceSpentError extends LocalizedError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(new UntranslatedTextVo(message), { cause: options?.cause })
    this.name = 'BacktestTimeAllowanceSpentError'
  }
}
