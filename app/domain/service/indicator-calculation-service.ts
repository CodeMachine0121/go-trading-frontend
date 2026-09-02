import type { IIndicatorCalculationProxy } from '~/domain/interface/i-indicator-calculation-proxy'
import { IndicatorCalculationRequestDomain } from '~/domain/models/domains/indicator-calculation-request-domain'
import { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'
import { IndicatorScriptDomain } from '~/domain/models/domains/indicator-script-domain'
import type { IndicatorCalculationRequestDto } from '~/domain/models/dto/indicator-calculation-request-dto'
import type { IndicatorCalculationResultDto } from '~/domain/models/dto/indicator-calculation-result-dto'
import type { IndicatorResultTypeOptionDto } from '~/domain/models/dto/indicator-result-type-option-dto'
import type { IndicatorScriptTemplateDto } from '~/domain/models/dto/indicator-script-template-dto'
import type { IndicatorResultType } from '~/domain/models/vo/indicator-result-type'
import { INDICATOR_RESULT_TYPES } from '~/domain/models/vo/indicator-result-type'

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

  /** 使用者可以挑的指標值種類，含給人看的名字。 */
  listResultTypeOptions(): IndicatorResultTypeOptionDto[] {
    return INDICATOR_RESULT_TYPES.map(
      resultType => new IndicatorResultTypeDomain(resultType).toOptionDto())
  }
}
