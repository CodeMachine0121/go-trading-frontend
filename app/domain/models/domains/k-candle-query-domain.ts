import type { KCandleQueryDto } from '~/domain/models/dto/k-candle-query-dto'
import { KCandleQueryValidationError } from '~/domain/errors/k-candle-query-validation-error'

/**
 * Domain Model：一組查詢條件，建構當下即驗證。
 *
 * 實例存在就代表條件合法，因此 proxy 拿到的條件必定合法、不必再防禦。
 * 查詢區間的起訖可精確到分鐘，**不必**對齊五分鐘刻度（那是 K 線起始時間的規則，不是查詢的）。
 */
export class KCandleQueryDomain {
  readonly symbol: string
  readonly startTime: Date
  readonly endTime: Date

  constructor(kCandleQueryDto: KCandleQueryDto) {
    const normalizedSymbol = kCandleQueryDto.symbol.trim()
    if (normalizedSymbol === '') {
      throw new KCandleQueryValidationError('symbol', '請指定交易標的')
    }

    if (kCandleQueryDto.endTime.getTime() < kCandleQueryDto.startTime.getTime()) {
      throw new KCandleQueryValidationError('endTime', '結束時間不得早於開始時間')
    }

    this.symbol = normalizedSymbol
    this.startTime = kCandleQueryDto.startTime
    this.endTime = kCandleQueryDto.endTime
  }
}
