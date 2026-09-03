import type { ChartIndicatorService } from '~/domain/service/chart-indicator-service'
import type { ChartIndicatorDto } from '~/domain/models/dto/chart-indicator-dto'
import type { ChartIndicatorRequestDto } from '~/domain/models/dto/chart-indicator-request-dto'
import type { ChartLineColorOptionDto } from '~/domain/models/dto/chart-line-color-option-dto'

/** Application：圖表指標的用例編排，全程只碰 DTO。 */
export class ChartIndicatorApplication {
  constructor(private readonly chartIndicatorService: ChartIndicatorService) {}

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
