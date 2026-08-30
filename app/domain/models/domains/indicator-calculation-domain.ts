import type { IndicatorCalculation } from '~/domain/models/entities/indicator-calculation'
import type { IndicatorValueVo } from '~/domain/models/vo/indicator-value-vo'
import { IndicatorCalculationResultDto } from '~/domain/models/dto/indicator-calculation-result-dto'

/**
 * Domain Model：解讀一次計算的結果。
 *
 * 指標一律依名稱排序——算式產出的順序不保證固定，
 * 讓「同一次結果每次看起來一樣」成為業務保證，而不是畫面的巧合。
 */
export class IndicatorCalculationDomain {
  constructor(private readonly indicatorCalculation: IndicatorCalculation) {}

  sortedIndicatorValues(): IndicatorValueVo[] {
    // 刻意不用依語系而變的比較方式：那會讓同一組結果在不同瀏覽器上排出不同順序，
    // 正好違背這條規則想保證的事。碼位比較在哪裡跑都一樣。
    return [...this.indicatorCalculation.indicatorValues]
      .sort((former, latter) => {
        if (former.name === latter.name) {
          return 0
        }

        return former.name < latter.name ? -1 : 1
      })
  }

  toDto(): IndicatorCalculationResultDto {
    return new IndicatorCalculationResultDto(
      this.indicatorCalculation.symbol,
      this.indicatorCalculation.usedCandleCount,
      this.sortedIndicatorValues(),
    )
  }
}
