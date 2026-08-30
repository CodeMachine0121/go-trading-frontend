import type { IndicatorValueVo } from '~/domain/models/vo/indicator-value-vo'
import { IndicatorCalculationDomain } from '~/domain/models/domains/indicator-calculation-domain'

/**
 * Entity：一次指標計算的結果本體，只有欄位。
 * 指標的數量與名稱都是算式決定的，空的一組也是合法結果。
 */
export class IndicatorCalculation {
  constructor(
    public readonly symbol: string,
    public readonly usedCandleCount: number,
    public readonly indicatorValues: IndicatorValueVo[],
  ) {}

  toDomain(): IndicatorCalculationDomain {
    return new IndicatorCalculationDomain(this)
  }
}
