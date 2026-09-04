import type { IndicatorCalculationRequestDto } from '~/domain/models/dto/indicator-calculation-request-dto'
import { StrategyParametersDomain } from '~/domain/models/domains/strategy-parameters-domain'
import { IndicatorCalculationFieldError } from '~/domain/errors/indicator-calculation-field-error'
import { AggregationIntervalDomain } from '~/domain/models/domains/aggregation-interval-domain'
import { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'
import { IndicatorScriptDomain } from '~/domain/models/domains/indicator-script-domain'

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
  readonly parameters: StrategyParametersDomain

  constructor(indicatorCalculationRequestDto: IndicatorCalculationRequestDto) {
    const normalizedSymbol = indicatorCalculationRequestDto.symbol.trim()
    if (normalizedSymbol === '') {
      throw new IndicatorCalculationFieldError('symbol', '請指定交易標的')
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
    this.candleCount = indicatorCalculationRequestDto.candleCount
    this.resultType = new IndicatorResultTypeDomain(indicatorCalculationRequestDto.resultType)
    this.script = new IndicatorScriptDomain(this.resultType).assemble(normalizedScriptBody)
    // 不驗證它落在哪裡：指向未來由系統那頭視同現在，那是它的規則，抄一份下來只會有兩套。
    this.endTime = indicatorCalculationRequestDto.endTime

    // 旋鈕的規則由它們自己的模型把關，這裡只負責把拒絕說成這個表單聽得懂的話：
    // 錯的是「參數」那一塊，不是算式、也不是任何一個執行條件。
    this.parameters = new StrategyParametersDomain(indicatorCalculationRequestDto.parameters)
    const parametersMessage = this.parameters.validationMessage()
    if (parametersMessage !== null) {
      throw new IndicatorCalculationFieldError('parameters', parametersMessage)
    }
  }
}
