import type { IndicatorCalculationRequestDto } from '~/domain/models/dto/indicator-calculation-request-dto'
import { StrategyParametersDomain } from '~/domain/models/domains/strategy-parameters-domain'
import { IndicatorCalculationFieldError } from '~/domain/errors/indicator-calculation-field-error'
import { AggregationIntervalDomain } from '~/domain/models/domains/aggregation-interval-domain'
import { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'
import { IndicatorScriptDomain } from '~/domain/models/domains/indicator-script-domain'
import type { ObservationWindowVo } from '~/domain/models/vo/observation-window-vo'

/**
 * Domain Model：一次指標計算的請求，建構當下即驗證。
 *
 * 使用者只寫算式**內容**；送出去的 `script` 是這裡把內容放進外框之後的整段算式。
 * 畫面因此不持有、也不需要知道一整段算式長什麼樣。
 *
 * 要跑什麼有兩種說法，**恰好挑一種**：指名一支已存的策略，或帶一段算式內容。
 * 指名策略是圖表那一邊走的路——它套用的可能是從市集加入的策略，那種沒有算式可以送；
 * 帶算式內容是指標計算畫面走的路——在編輯器裡寫了什麼就跑什麼，不必先存。
 * 兩個都給就說不出實際跑的是哪一個，兩個都不給就沒有東西可以跑，因此兩者都當場拒絕。
 *
 * 單次可用的最大根數**不寫在這裡**——它由後端的設定決定，前端無從得知，
 * 寫死只會在設定改變時說謊。超過上限一律由後端拒絕，前端如實轉達。
 */
export class IndicatorCalculationRequestDomain {
  readonly symbol: string
  readonly aggregationInterval: AggregationIntervalDomain
  readonly observationWindow: ObservationWindowVo
  readonly resultType: IndicatorResultTypeDomain
  /** 指名的那一支已存策略；帶了算式內容時是 undefined。 */
  readonly strategyId: number | undefined
  /** 要送出去的那一整段算式；指名了策略時是空字串——那時算式由系統自己取出。 */
  readonly script: string
  readonly parameters: StrategyParametersDomain

  constructor(indicatorCalculationRequestDto: IndicatorCalculationRequestDto) {
    const normalizedSymbol = indicatorCalculationRequestDto.symbol.trim()
    if (normalizedSymbol === '') {
      throw new IndicatorCalculationFieldError('symbol', '請指定交易標的')
    }

    const normalizedScriptBody = indicatorCalculationRequestDto.scriptBody.trim()
    const namesAStrategy = indicatorCalculationRequestDto.strategyId !== undefined
    const carriesAnAlgorithm = normalizedScriptBody !== ''

    if (namesAStrategy && carriesAnAlgorithm) {
      throw new IndicatorCalculationFieldError(
        'scriptBody', '指名一支策略與自帶一段算式只能挑一種')
    }
    if (!namesAStrategy && !carriesAnAlgorithm) {
      throw new IndicatorCalculationFieldError('scriptBody', '請填寫算式內容')
    }

    this.symbol = normalizedSymbol
    // 刻度不做合法性拒絕：使用者是從清單挑的，挑不出非法值。
    // 認不得的代號一律退回最細的那一種，與指標值種類同一套處理。
    this.aggregationInterval
      = new AggregationIntervalDomain(indicatorCalculationRequestDto.aggregationInterval)
    this.observationWindow = indicatorCalculationRequestDto.observationWindow
    this.resultType = new IndicatorResultTypeDomain(indicatorCalculationRequestDto.resultType)
    this.strategyId = indicatorCalculationRequestDto.strategyId
    // 指名策略時沒有算式要包外框——那一段從頭到尾不離開系統，正是它跑得動卻讀不到的理由。
    this.script = namesAStrategy
      ? ''
      : new IndicatorScriptDomain(this.resultType).assemble(normalizedScriptBody)

    // 旋鈕的規則由它們自己的模型把關，這裡只負責把拒絕說成這個表單聽得懂的話：
    // 錯的是「參數」那一塊，不是算式、也不是任何一個執行條件。
    this.parameters = new StrategyParametersDomain(indicatorCalculationRequestDto.parameters)
    const parametersMessage = this.parameters.validationMessage()
    if (parametersMessage !== null) {
      throw new IndicatorCalculationFieldError('parameters', parametersMessage)
    }
  }
}
