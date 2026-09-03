import { describe, expect, it } from 'vitest'
import { IndicatorCalculation } from '~/domain/models/entities/indicator-calculation'
import { IndicatorValueVo } from '~/domain/models/vo/indicator-value-vo'

describe('IndicatorCalculationDomain', () => {
  it('指標一律依名稱排序，讓同一次結果每次看起來都一樣', () => {
    const resultDto = new IndicatorCalculation('BTCUSDT', '5m', 3, 'float', [
      new IndicatorValueVo('最高', [120]),
      new IndicatorValueVo('均價', [110]),
      new IndicatorValueVo('最低', [90]),
    ]).toDomain().toDto()

    expect(resultDto.indicatorValues.map(indicatorValue => indicatorValue.name))
      .toEqual(['均價', '最低', '最高'])
  })

  it('同名的指標不會被排序打亂', () => {
    const resultDto = new IndicatorCalculation('BTCUSDT', '5m', 3, 'float', [
      new IndicatorValueVo('均價', [110]),
      new IndicatorValueVo('均價', [120]),
    ]).toDomain().toDto()

    expect(resultDto.indicatorValues.map(indicatorValue => indicatorValue.displayValues[0]))
      .toEqual(['110', '120'])
  })

  it('帶著實際採用的根數與每個指標的值', () => {
    const resultDto = new IndicatorCalculation('BTCUSDT', '5m', 3, 'float', [
      new IndicatorValueVo('均價', [110]),
    ]).toDomain().toDto()

    expect(resultDto.symbol).toBe('BTCUSDT')
    expect(resultDto.usedCandleCount).toBe(3)
    expect(resultDto.indicatorValues[0]?.displayValues).toEqual(['110'])
    expect(resultDto.isEmpty).toBe(false)
  })

  it('一個指標都沒有時是空結果，而不是錯誤', () => {
    const resultDto = new IndicatorCalculation('BTCUSDT', '5m', 3, 'float', []).toDomain().toDto()

    expect(resultDto.isEmpty).toBe(true)
    expect(resultDto.indicatorValues).toHaveLength(0)
  })

  it('一個數字的值不是一串，直接顯示那個數字', () => {
    const resultDto = new IndicatorCalculation('BTCUSDT', '5m', 3, 'float', [
      new IndicatorValueVo('均價', [110]),
    ]).toDomain().toDto()

    expect(resultDto.indicatorValues[0]?.isSeries).toBe(false)
    expect(resultDto.indicatorValues[0]?.displayValues).toEqual(['110'])
  })

  it('一串數字的每個值都看得到，順序不變', () => {
    const resultDto = new IndicatorCalculation('BTCUSDT', '5m', 3, 'floatList', [
      new IndicatorValueVo('均線', [100, 105, 110]),
    ]).toDomain().toDto()

    expect(resultDto.indicatorValues[0]?.isSeries).toBe(true)
    expect(resultDto.indicatorValues[0]?.displayValues).toEqual(['100', '105', '110'])
  })

  it('是非以「是」與「否」呈現，畫面不必自己翻譯', () => {
    const resultDto = new IndicatorCalculation('BTCUSDT', '5m', 3, 'bool', [
      new IndicatorValueVo('黃金交叉', [true]),
      new IndicatorValueVo('死亡交叉', [false]),
    ]).toDomain().toDto()

    expect(resultDto.indicatorValues.map(indicatorValue => indicatorValue.displayValues[0]))
      .toEqual(['否', '是'])
  })

  it('一串是非依序呈現', () => {
    const resultDto = new IndicatorCalculation('BTCUSDT', '5m', 3, 'boolList', [
      new IndicatorValueVo('逐根收紅', [true, false, true]),
    ]).toDomain().toDto()

    expect(resultDto.indicatorValues[0]?.displayValues).toEqual(['是', '否', '是'])
  })

  it('空的一串是一串，只是裡面沒有值', () => {
    const resultDto = new IndicatorCalculation('BTCUSDT', '5m', 3, 'floatList', [
      new IndicatorValueVo('均線', []),
    ]).toDomain().toDto()

    expect(resultDto.indicatorValues[0]?.isSeries).toBe(true)
    expect(resultDto.indicatorValues[0]?.isEmptySeries).toBe(true)
    expect(resultDto.isEmpty).toBe(false)
  })

  it.each([
    { resultType: 'float', label: '一個數字' },
    { resultType: 'floatList', label: '一串數字' },
    { resultType: 'bool', label: '一個是非' },
    { resultType: 'boolList', label: '一串是非' },
  ])('結果說明自己是「$label」', ({ resultType, label }) => {
    const resultDto = new IndicatorCalculation('BTCUSDT', '5m', 3, resultType, []).toDomain().toDto()

    expect(resultDto.resultTypeLabel).toBe(label)
  })

  it('後端回報了不認得的種類時，仍以一個數字呈現而不是壞掉', () => {
    const resultDto = new IndicatorCalculation('BTCUSDT', '5m', 3, 'somethingNew', [
      new IndicatorValueVo('均價', [110]),
    ]).toDomain().toDto()

    expect(resultDto.resultTypeLabel).toBe('一個數字')
    expect(resultDto.indicatorValues[0]?.displayValues).toEqual(['110'])
  })
})
