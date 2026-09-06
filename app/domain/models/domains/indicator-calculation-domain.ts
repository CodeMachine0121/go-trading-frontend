import type { IndicatorCalculation } from '~/domain/models/entities/indicator-calculation'
import type { IndicatorValueVo } from '~/domain/models/vo/indicator-value-vo'
import { AggregationIntervalDomain } from '~/domain/models/domains/aggregation-interval-domain'
import { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'
import { SignalDomain } from '~/domain/models/domains/signal-domain'
import { IndicatorCalculationResultDto } from '~/domain/models/dto/indicator-calculation-result-dto'
import { IndicatorValueDto } from '~/domain/models/dto/indicator-value-dto'

/** 是非在這個領域裡就是這麼說的。畫面不自己翻譯。 */
const TRUE_LABEL = '是'
const FALSE_LABEL = '否'

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
    const resultType = new IndicatorResultTypeDomain(this.indicatorCalculation.resultType)
    const intervalLabel = new AggregationIntervalDomain(this.indicatorCalculation.interval).label()

    // 「一個信號」種類的產出是一個結論，沒有指標名稱——所以它走 signalLabel，
    // 不進 indicatorValues。中文與語氣由信號自己給。
    if (resultType.isSignal()) {
      const signal = new SignalDomain(this.indicatorCalculation.signal)

      return new IndicatorCalculationResultDto(
        this.indicatorCalculation.symbol,
        intervalLabel,
        this.indicatorCalculation.usedCandleCount,
        resultType.label(),
        [],
        signal.label(),
        signal.tone(),
      )
    }

    return new IndicatorCalculationResultDto(
      this.indicatorCalculation.symbol,
      intervalLabel,
      this.indicatorCalculation.usedCandleCount,
      resultType.label(),
      this.sortedIndicatorValues().map(indicatorValue => new IndicatorValueDto(
        indicatorValue.name,
        indicatorValue.items.map(
          item => (typeof item === 'boolean' ? (item ? TRUE_LABEL : FALSE_LABEL) : String(item))),
        resultType.isList(),
      )),
    )
  }
}
