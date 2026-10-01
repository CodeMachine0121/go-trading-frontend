import { LocalizedError } from '~/domain/errors/localized-error'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import type { BinanceTradingKeyFieldVo } from '~/domain/models/vo/binance-trading-key-field-vo'

/**
 * 哨兵錯誤：某一格金鑰被擋下來了。說這句話的可能是畫面自己（沒填），也可能是後端（原文照轉），
 * 所以它收的是一句已經決定好怎麼說的話，而不是一段字。
 */
export class BinanceTradingKeyFieldError extends LocalizedError {
  constructor(
    localizedMessage: LocalizedTextVo,
    public readonly field: BinanceTradingKeyFieldVo | null,
    options?: { cause?: unknown },
  ) {
    super(localizedMessage, options)
    this.name = 'BinanceTradingKeyFieldError'
  }
}
