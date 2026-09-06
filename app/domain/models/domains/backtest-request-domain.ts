import type Decimal from 'decimal.js'
import type { BacktestRequestDto } from '~/domain/models/dto/backtest-request-dto'
import type { PositionSizingMode } from '~/domain/models/vo/position-sizing-mode-vo'
import type { IndicatorResultType } from '~/domain/models/vo/indicator-result-type'
import { SIGNAL_INDICATOR_NAME } from '~/domain/models/vo/signal-vo'
import { AggregationIntervalDomain } from '~/domain/models/domains/aggregation-interval-domain'
import { BacktestTimeRangeDomain } from '~/domain/models/domains/backtest-time-range-domain'
import { PositionSizingDomain } from '~/domain/models/domains/position-sizing-domain'
import { StrategyParametersDomain } from '~/domain/models/domains/strategy-parameters-domain'
import { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'
import { IndicatorScriptDomain } from '~/domain/models/domains/indicator-script-domain'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'

/**
 * 重演只吃「一個數字」的算式。
 *
 * 這不是限制，是重演的形狀本身：算式**一根 K 線跑一次**，每一次只被問一個問題——
 * 這一棒要做什麼。答案是一個數字。一支回傳一串數字的算式，重演也不知道該讀哪一格
 * 當這一棒的意見。
 */
const BACKTEST_RESULT_TYPE: IndicatorResultType = 'float'

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

    // 種類不對就當場說清楚，而不是硬套一個「一個數字」的外框送出去。
    // 硬套的代價是：使用者什麼都沒改，卻收到一句直譯器的型別抱怨——
    // 那句話不會告訴他該去按哪一個下拉選單。
    const resultType = new IndicatorResultTypeDomain(backtestRequestDto.resultType)
    if (resultType.value !== BACKTEST_RESULT_TYPE) {
      throw new BacktestFieldError(
        'scriptBody',
        `回測只跑「一個數字」的算式：它一根 K 線問一次，每一次讀一個叫 `
        + `${SIGNAL_INDICATOR_NAME} 的數字。這支目前宣告的是「${resultType.label()}」，`
        + `請把指標值種類改成「一個數字」。`)
    }

    this.symbol = normalizedSymbol
    // 刻度不做合法性拒絕：使用者是從清單挑的，挑不出非法值。與指標預覽同一套處理。
    this.aggregationInterval
      = new AggregationIntervalDomain(backtestRequestDto.aggregationInterval)
    this.startTime = backtestRequestDto.startTime
    this.endTime = backtestRequestDto.endTime
    this.script = new IndicatorScriptDomain(resultType).assemble(normalizedScriptBody)
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
