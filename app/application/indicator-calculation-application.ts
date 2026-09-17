import type { IndicatorCalculationService } from '~/domain/service/indicator-calculation-service'
import type { CalculationSpanUnitOptionDto } from '~/domain/models/dto/calculation-span-option-dto'
import type { StrategyScriptParameterKindOptionDto } from '~/domain/models/dto/strategy-script-parameter-kind-option-dto'
import type { StrategyScriptParameterFieldDto } from '~/domain/models/dto/strategy-script-parameter-field-dto'
import type { StrategyScriptParameterDto, StrategyScriptParameterKind } from '~/domain/models/dto/strategy-script-parameter-dto'
import type { CalculationSpanDto } from '~/domain/models/dto/calculation-span-dto'
import type { AggregationIntervalOptionDto } from '~/domain/models/dto/aggregation-interval-option-dto'
import type { IndicatorCalculationRequestDto } from '~/domain/models/dto/indicator-calculation-request-dto'
import type { IndicatorCalculationResultDto } from '~/domain/models/dto/indicator-calculation-result-dto'
import type { IndicatorResultTypeOptionDto } from '~/domain/models/dto/indicator-result-type-option-dto'
import type { SignalReadingDto } from '~/domain/models/dto/signal-reading-dto'
import type { IndicatorScriptTemplateDto } from '~/domain/models/dto/indicator-script-template-dto'
import type { KCandleFieldDto } from '~/domain/models/dto/k-candle-field-dto'
import type { AggregationIntervalValue } from '~/domain/models/vo/aggregation-interval-vo'
import type { IndicatorResultType } from '~/domain/models/vo/indicator-result-type'
import type { ScriptParameterAccessDto } from '~/domain/models/dto/script-parameter-access-dto'
import type { ObservationWindowVo } from '~/domain/models/vo/observation-window-vo'

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

  retargetScriptReturnType(scriptBody: string, resultType: string): string {
    return this.indicatorCalculationService.retargetScriptReturnType(scriptBody, resultType)
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

  observationWindowFor(span: CalculationSpanDto): ObservationWindowVo {
    return this.indicatorCalculationService.observationWindowFor(span)
  }

  listStrategyScriptParameterKindOptions(): StrategyScriptParameterKindOptionDto[] {
    return this.indicatorCalculationService.listStrategyScriptParameterKindOptions()
  }

  describeStrategyScriptParameters(
    parameters: readonly StrategyScriptParameterDto[],
  ): StrategyScriptParameterFieldDto[] {
    return this.indicatorCalculationService.describeStrategyScriptParameters(parameters)
  }

  addStrategyScriptParameter(
    parameters: readonly StrategyScriptParameterDto[],
  ): readonly StrategyScriptParameterDto[] {
    return this.indicatorCalculationService.addStrategyScriptParameter(parameters)
  }

  removeStrategyScriptParameter(
    parameters: readonly StrategyScriptParameterDto[], index: number,
  ): readonly StrategyScriptParameterDto[] {
    return this.indicatorCalculationService.removeStrategyScriptParameter(parameters, index)
  }

  renameStrategyScriptParameter(
    parameters: readonly StrategyScriptParameterDto[], index: number, name: string,
  ): readonly StrategyScriptParameterDto[] {
    return this.indicatorCalculationService.renameStrategyScriptParameter(parameters, index, name)
  }

  changeStrategyScriptParameterKind(
    parameters: readonly StrategyScriptParameterDto[], index: number, kind: StrategyScriptParameterKind,
  ): readonly StrategyScriptParameterDto[] {
    return this.indicatorCalculationService.changeStrategyScriptParameterKind(parameters, index, kind)
  }

  changeStrategyScriptParameterValue(
    parameters: readonly StrategyScriptParameterDto[], index: number, value: number,
  ): readonly StrategyScriptParameterDto[] {
    return this.indicatorCalculationService.changeStrategyScriptParameterValue(parameters, index, value)
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

  listSignalReadings(): SignalReadingDto[] {
    return this.indicatorCalculationService.listSignalReadings()
  }
}
