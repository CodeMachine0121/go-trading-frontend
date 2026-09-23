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
import type { StrategyScriptContentDto } from '~/domain/models/dto/strategy-script-content-dto'
import type { ScriptInputGuideDto } from '~/domain/models/dto/script-input-guide-dto'
import type { StrategyScriptWorkbenchDto } from '~/domain/models/dto/strategy-script-workbench-dto'
import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'
import type { AggregationIntervalValue } from '~/domain/models/vo/aggregation-interval-vo'
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

  describeExampleScript(resultType: string, marketDataKind: MarketDataKind = 'kCandle'): string {
    return this.indicatorCalculationService.describeExampleScript(resultType, marketDataKind)
  }

  retargetScriptReturnType(
    script: string, resultType: string, marketDataKind: MarketDataKind = 'kCandle',
  ): string {
    return this.indicatorCalculationService.retargetScriptReturnType(script, resultType, marketDataKind)
  }

  describeBlankStrategyScript(marketDataKind: MarketDataKind = 'kCandle'): StrategyScriptContentDto {
    return this.indicatorCalculationService.describeBlankStrategyScript(marketDataKind)
  }

  describeStrategyScriptWorkbench(marketDataKind: MarketDataKind): StrategyScriptWorkbenchDto {
    return this.indicatorCalculationService.describeStrategyScriptWorkbench(marketDataKind)
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

  describeScriptInputGuide(marketDataKind: MarketDataKind = 'kCandle'): ScriptInputGuideDto {
    return this.indicatorCalculationService.describeScriptInputGuide(marketDataKind)
  }

  listSignalReadings(): SignalReadingDto[] {
    return this.indicatorCalculationService.listSignalReadings()
  }
}
