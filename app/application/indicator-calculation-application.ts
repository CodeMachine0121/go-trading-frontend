import type { IndicatorCalculationService } from '~/domain/service/indicator-calculation-service'
import type { IndicatorCalculationRequestDto } from '~/domain/models/dto/indicator-calculation-request-dto'
import type { IndicatorCalculationResultDto } from '~/domain/models/dto/indicator-calculation-result-dto'
import type { IndicatorResultTypeOptionDto } from '~/domain/models/dto/indicator-result-type-option-dto'
import type { IndicatorScriptTemplateDto } from '~/domain/models/dto/indicator-script-template-dto'
import type { KCandleFieldDto } from '~/domain/models/dto/k-candle-field-dto'
import type { IndicatorResultType } from '~/domain/models/vo/indicator-result-type'

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

  listResultTypeOptions(): IndicatorResultTypeOptionDto[] {
    return this.indicatorCalculationService.listResultTypeOptions()
  }

  listKCandleFields(): KCandleFieldDto[] {
    return this.indicatorCalculationService.listKCandleFields()
  }
}
