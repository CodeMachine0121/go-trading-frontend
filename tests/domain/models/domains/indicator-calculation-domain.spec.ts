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
    { resultType: 'signal', label: '一個信號' },
  ])('結果說明自己是「$label」', ({ resultType, label }) => {
    const resultDto = new IndicatorCalculation('BTCUSDT', '5m', 3, resultType, [], [], 'buy')
      .toDomain().toDto()

    expect(resultDto.resultTypeLabel).toBe(label)
  })

  it.each([
    { signal: 'buy', signalLabel: '買入', signalTone: 'positive' },
    { signal: 'sell', signalLabel: '賣出', signalTone: 'negative' },
    { signal: 'hold', signalLabel: '持有', signalTone: 'neutral' },
  ])('信號種類的結果是一個「$signalLabel」結論，沒有指標名稱', ({ signal, signalLabel, signalTone }) => {
    const resultDto = new IndicatorCalculation('BTCUSDT', '5m', 3, 'signal', [], [], signal)
      .toDomain().toDto()

    expect(resultDto.isSignal).toBe(true)
    expect(resultDto.signalLabel).toBe(signalLabel)
    expect(resultDto.signalTone).toBe(signalTone)
    expect(resultDto.indicatorValues).toHaveLength(0)
    expect(resultDto.isEmpty).toBe(false)
  })

  it('後端回報了不認得的種類時，仍以一個數字呈現而不是壞掉', () => {
    const resultDto = new IndicatorCalculation('BTCUSDT', '5m', 3, 'somethingNew', [
      new IndicatorValueVo('均價', [110]),
    ]).toDomain().toDto()

    expect(resultDto.resultTypeLabel).toBe('一個數字')
    expect(resultDto.indicatorValues[0]?.displayValues).toEqual(['110'])
  })
})

describe('這一次有沒有畫滿', () => {
  /** 一次結果，只給會影響「有沒有畫滿」的那兩個根數。 */
  function resultOf(usedCandleCount: number, candleCount: number | null) {
    return new IndicatorCalculation(
      'BTCUSDT', '5m', usedCandleCount, 'float',
      [new IndicatorValueVo('均價', [110])], [], null, candleCount,
    ).toDomain().toDto()
  }

  it('畫滿了就不多說什麼', () => {
    expect(resultOf(119, 119).shortCoverageMessage).toBeNull()
  })

  it('沒畫滿時說出需要幾根與只湊得出幾根', () => {
    // 那裡的根數是使用者自己打的，所以他有權知道沒拿到他要的量——
    // 而「實際採用 50 根」單獨擺著，看不出 50 是不是他要的。
    //
    // **兩個數字各自綁在自己的那半句上。** 只檢查兩個數字有出現，
    // 對「裝反」是瞎的——而裝反之後那句話讀起來完全通順。
    const message = resultOf(50, 119).shortCoverageMessage

    expect(message).toMatch(/需要 119 根/)
    expect(message).toMatch(/只湊得出 50 根/)
  })

  it('兩個數字裝反了要看得出來', () => {
    const message = resultOf(19, 20).shortCoverageMessage

    expect(message).toMatch(/需要 20 根/)
    expect(message).toMatch(/只湊得出 19 根/)
  })

  it('兩個數字照抄，不自己算', () => {
    // 送出去的是格數、回來的已經含了回看根數，兩者不是同一個數。
    // 這裡若自己推算，說出來的數字會少掉回看的那一段。
    const message = resultOf(50, 119).shortCoverageMessage

    expect(message).not.toContain('100')
    expect(message).not.toContain('69')
  })

  it('系統沒說填滿要幾根時不猜，那句話就不出現', () => {
    expect(resultOf(50, null).shortCoverageMessage).toBeNull()
  })

  it('實際採用比填滿要的還多時也不算沒畫滿', () => {
    // 回看根數會讓實際餵進去的比要畫的格數多，那不是短，是正常。
    expect(resultOf(119, 100).shortCoverageMessage).toBeNull()
  })

  it('「一個信號」種類下沒畫滿也照樣說', () => {
    // 一個買賣結論由較短的行情推出來，比一串數字更需要說清楚。
    const resultDto = new IndicatorCalculation(
      'BTCUSDT', '5m', 50, 'signal', [], [], 'buy', 119,
    ).toDomain().toDto()

    expect(resultDto.signalLabel).not.toBeNull()
    expect(resultDto.shortCoverageMessage).toContain('50')
  })
})
