import type { IIndicatorCalculationProxy } from '~/domain/interface/i-indicator-calculation-proxy'
import { IndicatorCalculationRequestDomain } from '~/domain/models/domains/indicator-calculation-request-domain'
import { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'
import { IndicatorScriptDomain } from '~/domain/models/domains/indicator-script-domain'
import type { IndicatorCalculationRequestDto } from '~/domain/models/dto/indicator-calculation-request-dto'
import type { IndicatorCalculationResultDto } from '~/domain/models/dto/indicator-calculation-result-dto'
import type { IndicatorResultTypeOptionDto } from '~/domain/models/dto/indicator-result-type-option-dto'
import type { IndicatorScriptTemplateDto } from '~/domain/models/dto/indicator-script-template-dto'
import type { KCandleFieldDto } from '~/domain/models/dto/k-candle-field-dto'
import type { IndicatorResultType } from '~/domain/models/vo/indicator-result-type'
import { INDICATOR_RESULT_TYPES } from '~/domain/models/vo/indicator-result-type'
import { K_CANDLE_FIELDS } from '~/domain/models/vo/k-candle-field-vo'

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
