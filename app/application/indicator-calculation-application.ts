import type { IndicatorCalculationService } from '~/domain/service/indicator-calculation-service'
import type { IndicatorCalculationRequestDto } from '~/domain/models/dto/indicator-calculation-request-dto'
import type { IndicatorCalculationResultDto } from '~/domain/models/dto/indicator-calculation-result-dto'

/** Application：指標計算的用例編排，全程只碰 DTO。 */
export class IndicatorCalculationApplication {
  constructor(private readonly indicatorCalculationService: IndicatorCalculationService) {}

  async calculateIndicator(
    indicatorCalculationRequestDto: IndicatorCalculationRequestDto,
  ): Promise<IndicatorCalculationResultDto> {
    return this.indicatorCalculationService.calculateIndicator(indicatorCalculationRequestDto)
  }

  buildExampleScript(): string {
    return this.indicatorCalculationService.buildExampleScript()
  }
}
