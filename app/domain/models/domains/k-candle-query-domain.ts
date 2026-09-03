import type { KCandleQueryDto } from '~/domain/models/dto/k-candle-query-dto'
import { KCandleQueryValidationError } from '~/domain/errors/k-candle-query-validation-error'

/**
 * Domain Model：一組查詢條件，建構當下即驗證。
 *
 * 實例存在就代表條件合法，因此 proxy 拿到的條件必定合法、不必再防禦。
 * 查詢的起始時間可精確到分鐘，**不必**對齊五分鐘刻度（那是 K 線起始時間的規則，不是查詢的）。
 *
 * 結束時間不由使用者指定：看行情看的是「到現在為止」，因此它一律是建構當下的時間。
 * 也因此，指向未來的開始時間是條件錯誤，而不是一段查得到東西的區間。
 */
export class KCandleQueryDomain {
  readonly symbol: string
  readonly startTime: Date
  readonly endTime: Date

  constructor(kCandleQueryDto: KCandleQueryDto) {
    const currentTime = new Date()

    const normalizedSymbol = kCandleQueryDto.symbol.trim()
    if (normalizedSymbol === '') {
      throw new KCandleQueryValidationError('symbol', '請指定交易標的')
    }

    // 時間欄位被清空或只填一半時會得到一個無效的時間值，它與任何時間比較都不成立，
    // 因此必須先擋下來，否則會一路帶到後端才以看不懂的方式失敗。
    if (Number.isNaN(kCandleQueryDto.startTime.getTime())) {
      throw new KCandleQueryValidationError('startTime', '請填寫開始時間')
    }

    if (kCandleQueryDto.startTime.getTime() > currentTime.getTime()) {
      throw new KCandleQueryValidationError('startTime', '開始時間不得晚於目前時間')
    }

    this.symbol = normalizedSymbol
    this.startTime = kCandleQueryDto.startTime
    this.endTime = currentTime
  }
}
