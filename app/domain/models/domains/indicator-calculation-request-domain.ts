import type { IndicatorCalculationRequestDto } from '~/domain/models/dto/indicator-calculation-request-dto'
import { IndicatorCalculationFieldError } from '~/domain/errors/indicator-calculation-field-error'

/** 計算根數唯一合法的樣子：一串數字。負號、小數點、空白都不算。 */
const POSITIVE_INTEGER_PATTERN = /^\d+$/

/**
 * Domain Model：一次指標計算的請求，建構當下即驗證。
 *
 * 單次可用的最大根數**不寫在這裡**——它由後端的設定決定，前端無從得知，
 * 寫死只會在設定改變時說謊。超過上限一律由後端拒絕，前端如實轉達。
 */
export class IndicatorCalculationRequestDomain {
  readonly symbol: string
  readonly candleCount: number
  readonly script: string

  constructor(indicatorCalculationRequestDto: IndicatorCalculationRequestDto) {
    const normalizedSymbol = indicatorCalculationRequestDto.symbol.trim()
    if (normalizedSymbol === '') {
      throw new IndicatorCalculationFieldError('symbol', '請指定交易標的')
    }

    const rawCandleCount = indicatorCalculationRequestDto.candleCount.trim()
    if (rawCandleCount === '') {
      throw new IndicatorCalculationFieldError('candleCount', '請填寫計算根數')
    }

    if (!POSITIVE_INTEGER_PATTERN.test(rawCandleCount)) {
      throw new IndicatorCalculationFieldError(
        'candleCount',
        Number.isInteger(Number(rawCandleCount))
          ? '計算根數必須大於零'
          : '計算根數必須是整數')
    }

    const candleCount = Number(rawCandleCount)
    if (candleCount <= 0) {
      throw new IndicatorCalculationFieldError('candleCount', '計算根數必須大於零')
    }

    const normalizedScript = indicatorCalculationRequestDto.script.trim()
    if (normalizedScript === '') {
      throw new IndicatorCalculationFieldError('script', '請填寫指標算式')
    }

    this.symbol = normalizedSymbol
    this.candleCount = candleCount
    this.script = normalizedScript
  }
}
