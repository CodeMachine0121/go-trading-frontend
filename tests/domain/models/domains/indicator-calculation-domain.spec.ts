import { describe, expect, it } from 'vitest'
import { IndicatorCalculation } from '~/domain/models/entities/indicator-calculation'
import { IndicatorValueVo } from '~/domain/models/vo/indicator-value-vo'

describe('IndicatorCalculationDomain', () => {
  it('指標一律依名稱排序，讓同一次結果每次看起來都一樣', () => {
    const resultDto = new IndicatorCalculation('BTCUSDT', 3, [
      new IndicatorValueVo('最高', 120),
      new IndicatorValueVo('均價', 110),
      new IndicatorValueVo('最低', 90),
    ]).toDomain().toDto()

    expect(resultDto.indicatorValues.map(indicatorValue => indicatorValue.name))
      .toEqual(['均價', '最低', '最高'])
  })

  it('帶著實際採用的根數與每個指標的數值', () => {
    const resultDto = new IndicatorCalculation('BTCUSDT', 3, [
      new IndicatorValueVo('均價', 110),
    ]).toDomain().toDto()

    expect(resultDto.symbol).toBe('BTCUSDT')
    expect(resultDto.usedCandleCount).toBe(3)
    expect(resultDto.indicatorValues[0]?.value).toBe(110)
    expect(resultDto.isEmpty).toBe(false)
  })

  it('一個指標都沒有時是空結果，而不是錯誤', () => {
    const resultDto = new IndicatorCalculation('BTCUSDT', 3, []).toDomain().toDto()

    expect(resultDto.isEmpty).toBe(true)
    expect(resultDto.indicatorValues).toHaveLength(0)
  })
})
