import type { IndicatorCalculationService } from '~/domain/service/indicator-calculation-service'
import type { CalculationSpanUnitOptionDto } from '~/domain/models/dto/calculation-span-option-dto'
import type { StrategyParameterKindOptionDto } from '~/domain/models/dto/strategy-parameter-kind-option-dto'
import type { StrategyParameterFieldDto } from '~/domain/models/dto/strategy-parameter-field-dto'
import type { StrategyParameterDto, StrategyParameterKind } from '~/domain/models/dto/strategy-parameter-dto'
import type { CalculationSpanDto } from '~/domain/models/dto/calculation-span-dto'
import type { AggregationIntervalOptionDto } from '~/domain/models/dto/aggregation-interval-option-dto'
import type { IndicatorCalculationRequestDto } from '~/domain/models/dto/indicator-calculation-request-dto'
import type { IndicatorCalculationResultDto } from '~/domain/models/dto/indicator-calculation-result-dto'
import type { IndicatorResultTypeOptionDto } from '~/domain/models/dto/indicator-result-type-option-dto'
import type { IndicatorScriptTemplateDto } from '~/domain/models/dto/indicator-script-template-dto'
import type { KCandleFieldDto } from '~/domain/models/dto/k-candle-field-dto'
import type { AggregationIntervalValue } from '~/domain/models/vo/aggregation-interval-vo'
import type { IndicatorResultType } from '~/domain/models/vo/indicator-result-type'
import type { ScriptParameterAccessDto } from '~/domain/models/dto/script-parameter-access-dto'

/** Application：指標計算的用例編排，全程只碰 DTO。 */
export class IndicatorCalculationApplication {
  constructor(private readonly indicatorCalculationService: IndicatorCalculationService) {}

  async calculateIndicator(
    indicatorCalculationRequestDto: IndicatorCalculationRequestDto,
  ): Promise<IndicatorCalculationResultDto> {
    return this.indicatorCalculationService.calculateIndicator(indicatorCalculationRequestDto)
  }

  describeIndicatorScript(resultType: string): IndicatorScriptTemplateDto {
    return this.indicatorCalculationService.describeIndicatorScript(resultType)
  }

  defaultResultType(): IndicatorResultType {
    return this.indicatorCalculationService.defaultResultType()
  }

  listAggregationIntervalOptions(): AggregationIntervalOptionDto[] {
    return this.indicatorCalculationService.listAggregationIntervalOptions()
  }

  defaultAggregationInterval(): AggregationIntervalValue {
    return this.indicatorCalculationService.defaultAggregationInterval()
  }

  listCalculationSpanUnitOptions(): CalculationSpanUnitOptionDto[] {
    return this.indicatorCalculationService.listCalculationSpanUnitOptions()
  }

  defaultCalculationSpan(): CalculationSpanDto {
    return this.indicatorCalculationService.defaultCalculationSpan()
  }

  kCandleCountFor(span: CalculationSpanDto, aggregationInterval: string): number {
    return this.indicatorCalculationService.kCandleCountFor(span, aggregationInterval)
  }

  listStrategyParameterKindOptions(): StrategyParameterKindOptionDto[] {
    return this.indicatorCalculationService.listStrategyParameterKindOptions()
  }

  describeStrategyParameters(
    parameters: readonly StrategyParameterDto[],
  ): StrategyParameterFieldDto[] {
    return this.indicatorCalculationService.describeStrategyParameters(parameters)
  }

  addStrategyParameter(
    parameters: readonly StrategyParameterDto[],
  ): readonly StrategyParameterDto[] {
    return this.indicatorCalculationService.addStrategyParameter(parameters)
  }

  removeStrategyParameter(
    parameters: readonly StrategyParameterDto[], index: number,
  ): readonly StrategyParameterDto[] {
    return this.indicatorCalculationService.removeStrategyParameter(parameters, index)
  }

  renameStrategyParameter(
    parameters: readonly StrategyParameterDto[], index: number, name: string,
  ): readonly StrategyParameterDto[] {
    return this.indicatorCalculationService.renameStrategyParameter(parameters, index, name)
  }

  changeStrategyParameterKind(
    parameters: readonly StrategyParameterDto[], index: number, kind: StrategyParameterKind,
  ): readonly StrategyParameterDto[] {
    return this.indicatorCalculationService.changeStrategyParameterKind(parameters, index, kind)
  }

  changeStrategyParameterValue(
    parameters: readonly StrategyParameterDto[], index: number, value: number,
  ): readonly StrategyParameterDto[] {
    return this.indicatorCalculationService.changeStrategyParameterValue(parameters, index, value)
  }

  listResultTypeOptions(): IndicatorResultTypeOptionDto[] {
    return this.indicatorCalculationService.listResultTypeOptions()
  }

  listScriptParameterAccesses(): ScriptParameterAccessDto[] {
    return this.indicatorCalculationService.listScriptParameterAccesses()
  }

  listKCandleFields(): KCandleFieldDto[] {
    return this.indicatorCalculationService.listKCandleFields()
  }
}
