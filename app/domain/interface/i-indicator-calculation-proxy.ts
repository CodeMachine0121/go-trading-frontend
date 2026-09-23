import type { IndicatorCalculation } from '~/domain/models/entities/indicator-calculation'
import type { IndicatorCalculationRequestDomain } from '~/domain/models/domains/indicator-calculation-request-domain'

/**
 * 介面以「能力」命名，不以供應商命名。
 * 參數收已驗證的請求，實作端因此不必重覆驗證。
 * 實作在 app/infrastructure/proxy/indicator-calculation-proxy.ts。
 */
export interface IIndicatorCalculationProxy {
  calculateIndicator(
    indicatorCalculationRequestDomain: IndicatorCalculationRequestDomain,
  ): Promise<IndicatorCalculation>

  /** 跟著最新那一根重算：與 `calculateIndicator` 同一件事，但那是畫面自己做的，不是使用者在等的。 */
  recalculateIndicator(
    indicatorCalculationRequestDomain: IndicatorCalculationRequestDomain,
  ): Promise<IndicatorCalculation>
}
