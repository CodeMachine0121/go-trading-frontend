import { LocalizedError } from '~/domain/errors/localized-error'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/** 一根 K 線在畫面上可以填的每一個欄位。錯誤帶著它，畫面才知道訊息要標在哪一欄旁邊。 */
export type KCandleWriteField
  = | 'symbol'
    | 'openTime'
    | 'open'
    | 'high'
    | 'low'
    | 'close'
    | 'volume'
    | 'quoteVolume'
    | 'takerBuyBaseVolume'
    | 'takerBuyQuoteVolume'

/**
 * 哨兵錯誤：使用者自己可以修正的輸入錯誤。
 * 帶著出問題的欄位，畫面把訊息標在該欄位旁即可，不必靠比對訊息內容來決定位置。
 */
export class KCandleFieldError extends LocalizedError {
  constructor(
    public readonly field: KCandleWriteField,
    localizedMessage: LocalizedTextVo,
  ) {
    super(localizedMessage)
    this.name = 'KCandleFieldError'
  }
}
