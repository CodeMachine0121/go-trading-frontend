import { KCandleFieldError } from '~/domain/errors/k-candle-field-error'

/**
 * VO：一根 K 線的身分——交易標的 + 起始時間，兩者一起才指得出唯一一根。
 * 建構當下即驗證，因此拿得到這個物件就代表指名是完整的。
 */
export class KCandleIdentityVo {
  readonly symbol: string
  readonly openTime: Date

  constructor(symbol: string, openTime: Date) {
    const normalizedSymbol = symbol.trim()
    if (normalizedSymbol === '') {
      throw new KCandleFieldError('symbol', '請指定交易標的')
    }

    if (Number.isNaN(openTime.getTime())) {
      throw new KCandleFieldError('openTime', '請填寫起始時間')
    }

    this.symbol = normalizedSymbol
    this.openTime = openTime
  }
}
