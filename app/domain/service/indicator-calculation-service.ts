import type { IIndicatorCalculationProxy } from '~/domain/interface/i-indicator-calculation-proxy'
import { StrategyParameterKindOptionDto } from '~/domain/models/dto/strategy-parameter-kind-option-dto'
import { StrategyParameterFieldDto } from '~/domain/models/dto/strategy-parameter-field-dto'
import { StrategyParameterDomain } from '~/domain/models/domains/strategy-parameter-domain'
import type { StrategyParameterDto, StrategyParameterKind } from '~/domain/models/dto/strategy-parameter-dto'
import { StrategyParametersDomain } from '~/domain/models/domains/strategy-parameters-domain'
import { IndicatorCalculationFieldError } from '~/domain/errors/indicator-calculation-field-error'
import { CalculationSpanUnitOptionDto } from '~/domain/models/dto/calculation-span-option-dto'
import { CalculationSpanDto } from '~/domain/models/dto/calculation-span-dto'
import { CalculationSpanVo, DEFAULT_CALCULATION_SPAN } from '~/domain/models/vo/calculation-span-vo'
import { AggregationIntervalDomain } from '~/domain/models/domains/aggregation-interval-domain'
import { IndicatorCalculationRequestDomain } from '~/domain/models/domains/indicator-calculation-request-domain'
import { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'
import { IndicatorScriptDomain } from '~/domain/models/domains/indicator-script-domain'
import type { AggregationIntervalOptionDto } from '~/domain/models/dto/aggregation-interval-option-dto'
import type { IndicatorCalculationRequestDto } from '~/domain/models/dto/indicator-calculation-request-dto'
import type { IndicatorCalculationResultDto } from '~/domain/models/dto/indicator-calculation-result-dto'
import type { IndicatorResultTypeOptionDto } from '~/domain/models/dto/indicator-result-type-option-dto'
import type { IndicatorScriptTemplateDto } from '~/domain/models/dto/indicator-script-template-dto'
import type { KCandleFieldDto } from '~/domain/models/dto/k-candle-field-dto'
import type { AggregationIntervalValue } from '~/domain/models/vo/aggregation-interval-vo'
import { AGGREGATION_INTERVALS } from '~/domain/models/vo/aggregation-interval-vo'
import type { IndicatorResultType } from '~/domain/models/vo/indicator-result-type'
import { INDICATOR_RESULT_TYPES } from '~/domain/models/vo/indicator-result-type'
import { K_CANDLE_FIELDS } from '~/domain/models/vo/k-candle-field-vo'

/**
 * 沒特別填時要餵給算式幾根 K 線。
 *
 * 二十根——夠算出一條短均線，又不必等太久。它與彙總刻度的預設值住在一起，
 * 因為兩者是同一件事的兩半：「一次還沒被指定過任何東西的計算」長什麼樣。
 */

/**
 * Domain Service：指標計算的編排。
 * 公開用例方法之間互不呼叫。
 */
export class IndicatorCalculationService {
  constructor(private readonly indicatorCalculationProxy: IIndicatorCalculationProxy) {}

  /** 執行一次計算：驗證輸入（不合法就不送出）→ 執行 → 依名稱排好、值已可直接顯示的結果。 */
  async calculateIndicator(
    indicatorCalculationRequestDto: IndicatorCalculationRequestDto,
  ): Promise<IndicatorCalculationResultDto> {
    const requestDomain = new IndicatorCalculationRequestDomain(indicatorCalculationRequestDto)
    const indicatorCalculation
      = await this.indicatorCalculationProxy.calculateIndicator(requestDomain)

    return indicatorCalculation.toDomain().toDto()
  }

  /** 這個種類之下，算式長什麼樣：外框的頭尾，以及一段可直接執行的範例內容。 */
  describeIndicatorScript(resultType: string): IndicatorScriptTemplateDto {
    return new IndicatorScriptDomain(new IndicatorResultTypeDomain(resultType)).toTemplateDto()
  }

  /** 沒有特別挑時算的是哪一種。畫面不自己指定預設值。 */
  defaultResultType(): IndicatorResultType {
    return new IndicatorResultTypeDomain('').value
  }

  /**
   * 使用者可以挑的彙總刻度，含給人看的名字。
   *
   * 它從策略那邊搬過來的判準是「這個問題屬於誰」：一次計算要吃多粗的 K 線，
   * 不是一支策略的事——同一支策略本來就該能在不同粗細下反覆執行。
   */
  listAggregationIntervalOptions(): AggregationIntervalOptionDto[] {
    return AGGREGATION_INTERVALS.map(
      interval => new AggregationIntervalDomain(interval.value).toOptionDto())
  }

  /**
   * 沒特別挑時是哪一種。畫面不自己指定預設值。
   *
   * 問的是刻度自己——「沒宣告時算哪一種」已經是它建構子裡的規則，
   * 在這裡再讀一次最細的那一個，等於把同一條規則寫第二遍：
   * 哪天退回的對象改了，這裡會安靜地不同意。與隔壁的指標值種類同一個寫法。
   */
  defaultAggregationInterval(): AggregationIntervalValue {
    return new AggregationIntervalDomain('').value
  }

  /** 沒特別填時要算幾根。同上——畫面不自己指定預設值。 */
  /** 「多長」那個單位選單上可以挑的每一個。 */
  listCalculationSpanUnitOptions(): CalculationSpanUnitOptionDto[] {
    return [
      new CalculationSpanUnitOptionDto('minute', '分鐘'),
      new CalculationSpanUnitOptionDto('hour', '小時'),
      new CalculationSpanUnitOptionDto('day', '天'),
    ]
  }

  /** 打開畫面時預先填好的那一段。 */
  defaultCalculationSpan(): CalculationSpanDto {
    return new CalculationSpanDto(
      DEFAULT_CALCULATION_SPAN.amount, DEFAULT_CALCULATION_SPAN.unit)
  }

  /**
   * 這麼長一段、以這個刻度看是幾格；那一段本身不合理時說出來。
   *
   * 畫面問這個而不是自己算，因為「至少一格」、怎麼取整、多長才算合理，
   * 每一條都是規則——而規則不住在畫面上。
   */
  kCandleCountFor(span: CalculationSpanDto, aggregationInterval: string): number {
    const spanVo = new CalculationSpanVo(span.amount, span.unit)
    const message = spanVo.validationMessage()
    if (message !== null) {
      throw new IndicatorCalculationFieldError('span', message)
    }

    return spanVo.kCandleCountAt(
      new AggregationIntervalDomain(aggregationInterval).intervalMinutes)
  }

  /** 種類選單上可以挑的每一個。 */
  listStrategyParameterKindOptions(): StrategyParameterKindOptionDto[] {
    return [
      new StrategyParameterKindOptionDto('lookbackCount', '回看根數'),
      new StrategyParameterKindOptionDto('number', '數值'),
    ]
  }

  /**
   * 每一個旋鈕在畫面上該長什麼樣子。
   *
   * 畫面問這個而不是自己判斷種類——「回看根數要整數鍵盤」是業務規則，
   * 寫進畫面就是把規則搬到了它不該在的地方。
   */
  describeStrategyParameters(
    parameters: readonly StrategyParameterDto[],
  ): StrategyParameterFieldDto[] {
    return parameters.map((parameter) => {
      const parameterDomain = new StrategyParameterDomain(parameter)

      return new StrategyParameterFieldDto(
        parameter,
        parameterDomain.inputMode(),
        parameterDomain.step(),
        parameterDomain.validationMessage() !== null)
    })
  }

  /**
   * 旋鈕的增刪改。每一個都回傳新的一份——一份參數是不可變的，改一下就是換一份。
   *
   * 它們在這裡而不在畫面上，是因為「新增出來的那一列長什麼樣子」是規則：
   * 名稱留白、種類預設回看根數、預設值二十，每一項都有理由（見那個模型）。
   */
  addStrategyParameter(
    parameters: readonly StrategyParameterDto[],
  ): readonly StrategyParameterDto[] {
    return new StrategyParametersDomain(parameters).addingNew().all
  }

  removeStrategyParameter(
    parameters: readonly StrategyParameterDto[], index: number,
  ): readonly StrategyParameterDto[] {
    return new StrategyParametersDomain(parameters).removingAt(index).all
  }

  renameStrategyParameter(
    parameters: readonly StrategyParameterDto[], index: number, name: string,
  ): readonly StrategyParameterDto[] {
    return this.replacing(parameters, index,
      parameter => parameter.renamedTo(name))
  }

  changeStrategyParameterKind(
    parameters: readonly StrategyParameterDto[], index: number, kind: StrategyParameterKind,
  ): readonly StrategyParameterDto[] {
    return this.replacing(parameters, index, parameter => parameter.withKind(kind))
  }

  changeStrategyParameterValue(
    parameters: readonly StrategyParameterDto[], index: number, value: number,
  ): readonly StrategyParameterDto[] {
    return this.replacing(parameters, index, parameter => parameter.withValue(value))
  }

  /** 三個改法只差在改哪一樣，其餘完全相同——共用的是「換掉第幾列」這件事。 */
  private replacing(
    parameters: readonly StrategyParameterDto[],
    index: number,
    change: (parameter: StrategyParameterDomain) => StrategyParameterDto,
  ): readonly StrategyParameterDto[] {
    const wholeSet = new StrategyParametersDomain(parameters)
    const parameter = wholeSet.at(index)
    if (parameter === null) {
      return parameters
    }

    return wholeSet.replacingAt(index, change(parameter)).all
  }

  /** 使用者可以挑的指標值種類，含給人看的名字。 */
  listResultTypeOptions(): IndicatorResultTypeOptionDto[] {
    return INDICATOR_RESULT_TYPES.map(
      resultType => new IndicatorResultTypeDomain(resultType).toOptionDto())
  }

  /**
   * 算式收到的每一根 K 線有哪些欄位。
   *
   * 它與外框（`describeIndicatorScript`）描述的是同一份沙箱契約，因此住在同一個 service——
   * 分開放的話，外框哪天換了型別，欄位說明會繼續說舊的那一套。
   */
  listKCandleFields(): KCandleFieldDto[] {
    return K_CANDLE_FIELDS.map(field => field.toDto())
  }
}
