import type { IndicatorValueVo } from '~/domain/models/vo/indicator-value-vo'
import { IndicatorCalculationDomain } from '~/domain/models/domains/indicator-calculation-domain'

/**
 * Entity：一次指標計算的結果本體，只有欄位。
 * 指標的數量與名稱都是算式決定的，空的一組也是合法結果。
 * `resultType` 與 `interval` 都是**後端回報的**，不是送出時挑的那兩個——
 * 照回報的呈現才不會說謊。彙總刻度尤其如此：它剛從「寫下來但沒生效」變成真的生效，
 * 而在那之後最糟的失敗不是報錯，是安靜地用了另一種刻度。
 */
export class IndicatorCalculation {
  constructor(
    public readonly symbol: string,
    public readonly interval: string,
    public readonly usedCandleCount: number,
    public readonly resultType: string,
    public readonly indicatorValues: IndicatorValueVo[],
  ) {}

  toDomain(): IndicatorCalculationDomain {
    return new IndicatorCalculationDomain(this)
  }
}
