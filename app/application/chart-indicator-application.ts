import type { ChartIndicatorService } from '~/domain/service/chart-indicator-service'
import type { ChartIndicatorDto } from '~/domain/models/dto/chart-indicator-dto'
import type { ChartIndicatorRequestDto } from '~/domain/models/dto/chart-indicator-request-dto'
import type { ChartLineColorOptionDto } from '~/domain/models/dto/chart-line-color-option-dto'
import type { AppliedIndicatorDto } from '~/domain/models/dto/applied-indicator-dto'
import type { ChartApplicableStrategyScriptDto } from '~/domain/models/dto/chart-applicable-strategy-script-dto'
import type { StrategyScriptParameterDto } from '~/domain/models/dto/strategy-script-parameter-dto'
import type { StrategyScriptParameterFieldDto } from '~/domain/models/dto/strategy-script-parameter-field-dto'

/** Application：圖表指標的用例編排，全程只碰 DTO。 */
export class ChartIndicatorApplication {
  constructor(private readonly chartIndicatorService: ChartIndicatorService) {}

  prepareAppliedIndicator(strategyScript: ChartApplicableStrategyScriptDto, appliedIndicatorId: number): AppliedIndicatorDto {
    return this.chartIndicatorService.prepareAppliedIndicator(strategyScript, appliedIndicatorId)
  }

  restoreAppliedIndicators(
    strategyScripts: readonly ChartApplicableStrategyScriptDto[], lastAppliedIndicatorId: number,
  ): AppliedIndicatorDto[] {
    return this.chartIndicatorService.restoreAppliedIndicators(strategyScripts, lastAppliedIndicatorId)
  }

  rememberAppliedIndicators(appliedIndicatorDtos: readonly AppliedIndicatorDto[]): void {
    this.chartIndicatorService.rememberAppliedIndicators(appliedIndicatorDtos)
  }

  rememberAppliedIndicatorParameters(appliedIndicatorDto: AppliedIndicatorDto): void {
    this.chartIndicatorService.rememberAppliedIndicatorParameters(appliedIndicatorDto)
  }

  describeAppliedIndicatorParameters(
    parameters: readonly StrategyScriptParameterDto[],
  ): StrategyScriptParameterFieldDto[] {
    return this.chartIndicatorService.describeAppliedIndicatorParameters(parameters)
  }

  validateAppliedIndicatorParameters(
    parameters: readonly StrategyScriptParameterDto[],
  ): string | null {
    return this.chartIndicatorService.validateAppliedIndicatorParameters(parameters)
  }

  async calculateChartIndicator(
    chartIndicatorRequestDto: ChartIndicatorRequestDto,
  ): Promise<ChartIndicatorDto> {
    return this.chartIndicatorService.calculateChartIndicator(chartIndicatorRequestDto)
  }

  /** 跟著最新那一根重算——畫面自己做的那一次，不是使用者在等的。 */
  async recalculateChartIndicator(
    chartIndicatorRequestDto: ChartIndicatorRequestDto,
  ): Promise<ChartIndicatorDto> {
    return this.chartIndicatorService.recalculateChartIndicator(chartIndicatorRequestDto)
  }

  changeChartLineColor(
    chartIndicatorDtos: readonly ChartIndicatorDto[], lineKey: string, colorToken: string,
  ): ChartIndicatorDto[] {
    return this.chartIndicatorService.changeChartLineColor(
      chartIndicatorDtos, lineKey, colorToken)
  }

  listChartLineColorOptions(): ChartLineColorOptionDto[] {
    return this.chartIndicatorService.listChartLineColorOptions()
  }
}
