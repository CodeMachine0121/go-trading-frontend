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
        this.shortCoverageMessage(),
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
      null,
      null,
      this.shortCoverageMessage(),
    )
  }

  /**
   * 這一次沒有畫滿時該說的那一句話，畫滿了就是 `null`。
   *
   * 它與「湊不出最少可算根數」那一句刻意不像：那一句是拒絕（什麼都畫不出來、得動手），
   * 這一句是通知（結果有效、只是以較少的行情算出來的）。讀起來像同一件事的話，
   * 這兩句就等於只有一句。
   *
   * **系統沒說填滿要幾根時一律不說。** 不猜、也不從送出去的那個數字反推——
   * 那條式子是系統的規則，抄一份到這裡，兩邊哪天算得不一樣時這句話會安靜地錯。
   *
   * 兩個分支都要它，所以它留成一個共用的 helper 而不是內聯兩份。
   */
  private shortCoverageMessage(): string | null {
    const candleCount = this.indicatorCalculation.candleCount
    if (candleCount === null || this.indicatorCalculation.usedCandleCount >= candleCount) {
      return null
    }

    return `這一次需要 ${candleCount} 根才畫得滿，`
      + `但走完的刻度區間只湊得出 ${this.indicatorCalculation.usedCandleCount} 根——`
      + '下面的數字是以這段較短的行情算出來的。'
  }
}
