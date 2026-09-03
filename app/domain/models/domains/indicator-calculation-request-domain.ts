import type { IndicatorCalculationRequestDto } from '~/domain/models/dto/indicator-calculation-request-dto'
import { IndicatorCalculationFieldError } from '~/domain/errors/indicator-calculation-field-error'
import { AggregationIntervalDomain } from '~/domain/models/domains/aggregation-interval-domain'
import { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'
import { IndicatorScriptDomain } from '~/domain/models/domains/indicator-script-domain'

/** 計算根數唯一合法的樣子：一串數字。負號、小數點、空白都不算。 */
const POSITIVE_INTEGER_PATTERN = /^\d+$/

/**
 * Domain Model：一次指標計算的請求，建構當下即驗證。
 *
 * 使用者只寫算式**內容**；送出去的 `script` 是這裡把內容放進外框之後的整段算式。
 * 畫面因此不持有、也不需要知道一整段算式長什麼樣。
 *
 * 單次可用的最大根數**不寫在這裡**——它由後端的設定決定，前端無從得知，
 * 寫死只會在設定改變時說謊。超過上限一律由後端拒絕，前端如實轉達。
 */
export class IndicatorCalculationRequestDomain {
  readonly symbol: string
  readonly aggregationInterval: AggregationIntervalDomain
  readonly candleCount: number
  readonly resultType: IndicatorResultTypeDomain
  readonly script: string
  readonly endTime: Date | null

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
      // 訊息要依「解讀出來的值」決定，而不是依「看起來像不像整數」：
      // `20.0` 解讀出來是整數 20，但它不是我們接受的寫法，該說的是「必須是整數」而不是「必須大於零」。
      const parsedCandleCount = Number(rawCandleCount)
      throw new IndicatorCalculationFieldError(
        'candleCount',
        Number.isFinite(parsedCandleCount) && parsedCandleCount <= 0
          ? '計算根數必須大於零'
          : '計算根數必須是整數')
    }

    const candleCount = Number(rawCandleCount)
    if (candleCount <= 0) {
      throw new IndicatorCalculationFieldError('candleCount', '計算根數必須大於零')
    }

    const normalizedScriptBody = indicatorCalculationRequestDto.scriptBody.trim()
    if (normalizedScriptBody === '') {
      throw new IndicatorCalculationFieldError('scriptBody', '請填寫算式內容')
    }

    this.symbol = normalizedSymbol
    // 刻度不做合法性拒絕：使用者是從清單挑的，挑不出非法值。
    // 認不得的代號一律退回最細的那一種，與指標值種類同一套處理。
    this.aggregationInterval
      = new AggregationIntervalDomain(indicatorCalculationRequestDto.aggregationInterval)
    this.candleCount = candleCount
    this.resultType = new IndicatorResultTypeDomain(indicatorCalculationRequestDto.resultType)
    this.script = new IndicatorScriptDomain(this.resultType).assemble(normalizedScriptBody)
    // 不驗證它落在哪裡：指向未來由系統那頭視同現在，那是它的規則，抄一份下來只會有兩套。
    this.endTime = indicatorCalculationRequestDto.endTime
  }
}
