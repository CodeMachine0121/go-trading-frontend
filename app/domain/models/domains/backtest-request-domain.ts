import type Decimal from 'decimal.js'
import type { BacktestRequestDto } from '~/domain/models/dto/backtest-request-dto'
import type { PositionSizingMode } from '~/domain/models/vo/position-sizing-mode-vo'
import { AggregationIntervalDomain } from '~/domain/models/domains/aggregation-interval-domain'
import { BacktestTimeRangeDomain } from '~/domain/models/domains/backtest-time-range-domain'
import { PositionSizingDomain } from '~/domain/models/domains/position-sizing-domain'
import { StrategyParametersDomain } from '~/domain/models/domains/strategy-parameters-domain'
import { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'
import { IndicatorScriptDomain } from '~/domain/models/domains/indicator-script-domain'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'

/**
 * 重演一律以「一個數字」的種類執行算式：讀的是信號，而信號是一個數字。
 * 使用者在工作區挑的那個種類只管指標預覽——重演這一邊沒有東西要他宣告。
 */
const BACKTEST_RESULT_TYPE = 'float'

/**
 * Domain Model：一次回測的請求，建構當下即驗證。
 *
 * 「不合法就不送出」與「說明留在那一格旁邊」是同一條規則的兩半，所以驗證在這裡而不在畫面上。
 * 建構成功就代表條件成立；失敗一定帶著是哪一格出了問題。
 *
 * 使用者只寫算式**內容**；送出去的是把內容放進外框之後的整段算式——與指標預覽同一條路，
 * 因為兩個去處讀的本來就是同一份算式。
 */
export class BacktestRequestDomain {
  readonly symbol: string
  readonly aggregationInterval: AggregationIntervalDomain
  readonly startTime: Date
  readonly endTime: Date
  readonly script: string
  readonly parameters: StrategyParametersDomain
  readonly initialCapital: Decimal
  readonly positionSizingMode: PositionSizingMode
  readonly positionSizingValue: Decimal

  constructor(backtestRequestDto: BacktestRequestDto) {
    const normalizedSymbol = backtestRequestDto.symbol.trim()
    if (normalizedSymbol === '') {
      throw new BacktestFieldError('symbol', '請指定交易標的')
    }

    const normalizedScriptBody = backtestRequestDto.scriptBody.trim()
    if (normalizedScriptBody === '') {
      throw new BacktestFieldError('scriptBody', '請填寫算式內容')
    }

    new BacktestTimeRangeDomain(
      backtestRequestDto.startTime, backtestRequestDto.endTime).validate()

    if (backtestRequestDto.initialCapital.isNaN()
      || backtestRequestDto.initialCapital.lessThanOrEqualTo(0)) {
      throw new BacktestFieldError('initialCapital', '請填一個大於零的數。')
    }

    new PositionSizingDomain(
      backtestRequestDto.positionSizingMode, backtestRequestDto.positionSizingValue).validate()

    this.symbol = normalizedSymbol
    // 刻度不做合法性拒絕：使用者是從清單挑的，挑不出非法值。與指標預覽同一套處理。
    this.aggregationInterval
      = new AggregationIntervalDomain(backtestRequestDto.aggregationInterval)
    this.startTime = backtestRequestDto.startTime
    this.endTime = backtestRequestDto.endTime
    this.script = new IndicatorScriptDomain(
      new IndicatorResultTypeDomain(BACKTEST_RESULT_TYPE)).assemble(normalizedScriptBody)
    this.initialCapital = backtestRequestDto.initialCapital
    this.positionSizingMode = backtestRequestDto.positionSizingMode
    this.positionSizingValue = backtestRequestDto.positionSizingValue

    // 旋鈕的規則由它們自己的模型把關，這裡只負責把拒絕說成這個表單聽得懂的話。
    // 它落在算式那一格：參數宣告與算式同屬工作區，而回測這一側沒有參數那一列可以標。
    this.parameters = new StrategyParametersDomain(backtestRequestDto.parameters)
    const parametersMessage = this.parameters.validationMessage()
    if (parametersMessage !== null) {
      throw new BacktestFieldError('scriptBody', parametersMessage)
    }
  }
}
