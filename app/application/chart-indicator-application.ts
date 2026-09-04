import type { ChartIndicatorService } from '~/domain/service/chart-indicator-service'
import type { ChartIndicatorDto } from '~/domain/models/dto/chart-indicator-dto'
import type { ChartIndicatorRequestDto } from '~/domain/models/dto/chart-indicator-request-dto'
import type { ChartLineColorOptionDto } from '~/domain/models/dto/chart-line-color-option-dto'
import type { AppliedIndicatorDto } from '~/domain/models/dto/applied-indicator-dto'
import type { StrategyDto } from '~/domain/models/dto/strategy-dto'
import type { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'
import type { StrategyParameterFieldDto } from '~/domain/models/dto/strategy-parameter-field-dto'

/** Application：圖表指標的用例編排，全程只碰 DTO。 */
export class ChartIndicatorApplication {
  constructor(private readonly chartIndicatorService: ChartIndicatorService) {}

  prepareAppliedIndicator(strategy: StrategyDto, appliedIndicatorId: number): AppliedIndicatorDto {
    return this.chartIndicatorService.prepareAppliedIndicator(strategy, appliedIndicatorId)
  }

  restoreAppliedIndicators(
    strategies: readonly StrategyDto[], lastAppliedIndicatorId: number,
  ): AppliedIndicatorDto[] {
    return this.chartIndicatorService.restoreAppliedIndicators(strategies, lastAppliedIndicatorId)
  }

  rememberAppliedIndicators(appliedIndicatorDtos: readonly AppliedIndicatorDto[]): void {
    this.chartIndicatorService.rememberAppliedIndicators(appliedIndicatorDtos)
  }

  rememberAppliedIndicatorParameters(appliedIndicatorDto: AppliedIndicatorDto): void {
    this.chartIndicatorService.rememberAppliedIndicatorParameters(appliedIndicatorDto)
  }

  describeAppliedIndicatorParameters(
    parameters: readonly StrategyParameterDto[],
  ): StrategyParameterFieldDto[] {
    return this.chartIndicatorService.describeAppliedIndicatorParameters(parameters)
  }

  validateAppliedIndicatorParameters(
    parameters: readonly StrategyParameterDto[],
  ): string | null {
    return this.chartIndicatorService.validateAppliedIndicatorParameters(parameters)
  }

  async calculateChartIndicator(
    chartIndicatorRequestDto: ChartIndicatorRequestDto,
  ): Promise<ChartIndicatorDto> {
    return this.chartIndicatorService.calculateChartIndicator(chartIndicatorRequestDto)
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
