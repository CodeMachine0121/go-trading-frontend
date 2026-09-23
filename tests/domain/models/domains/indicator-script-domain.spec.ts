import { describe, expect, it } from 'vitest'
import { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'
import { IndicatorScriptDomain } from '~/domain/models/domains/indicator-script-domain'
import { MarketDataKindDomain } from '~/domain/models/domains/market-data-kind-domain'

function scriptOf(resultType: string): IndicatorScriptDomain {
  return new IndicatorScriptDomain(new IndicatorResultTypeDomain(resultType))
}

const PREAMBLE = [
  'package main',
  '',
  'import (',
  '\t"indicator"',
  '\t"math"',
  '\t"sort"',
  ')',
].join('\n')

describe('IndicatorScriptDomain.blankScript', () => {
  it.each([
    { resultType: 'float', signature: 'func Calculate(data []indicator.KCandle) map[string]float64 {' },
    { resultType: 'floatList', signature: 'func Calculate(data []indicator.KCandle) map[string][]float64 {' },
    { resultType: 'bool', signature: 'func Calculate(data []indicator.KCandle) map[string]bool {' },
    { resultType: 'boolList', signature: 'func Calculate(data []indicator.KCandle) map[string][]bool {' },
    { resultType: 'signal', signature: 'func Calculate(data []indicator.KCandle) indicator.Signal {' },
  ])('$resultType 的空白算式是開頭那幾行加一個空的 Calculate', ({ resultType, signature }) => {
    expect(scriptOf(resultType).blankScript()).toBe(`${PREAMBLE}\n\n${signature}\n\t\n}`)
  })

  it.each(['float', 'floatList', 'bool', 'boolList', 'signal'])(
    '開頭那幾行不隨指標值種類變：%s',
    (resultType) => {
      expect(scriptOf(resultType).blankScript().startsWith(`${PREAMBLE}\n\n`)).toBe(true)
    })
})

describe('IndicatorScriptDomain.exampleScript', () => {
  it.each([
    { resultType: 'float', expectedReturn: 'return map[string]float64{' },
    { resultType: 'floatList', expectedReturn: 'return map[string][]float64{' },
    { resultType: 'bool', expectedReturn: 'return map[string]bool{' },
    { resultType: 'boolList', expectedReturn: 'return map[string][]bool{' },
  ])('$resultType 的範例算式是開頭那幾行加一整個 Calculate 函式', ({ resultType, expectedReturn }) => {
    const exampleScript = scriptOf(resultType).exampleScript()

    expect(exampleScript.startsWith(`${PREAMBLE}\n\nfunc Calculate(data []indicator.KCandle) `)).toBe(true)
    expect(exampleScript.endsWith('\n}')).toBe(true)
    expect(exampleScript).toContain(`\t${expectedReturn}`)
  })

  it('信號種類的範例算式用系統提供的方式選一個信號', () => {
    const exampleScript = scriptOf('signal').exampleScript()

    expect(exampleScript).toContain('func Calculate(data []indicator.KCandle) indicator.Signal {')
    expect(exampleScript).toContain('\treturn indicator.Buy')
    expect(exampleScript).toContain('\treturn indicator.Hold')
    expect(exampleScript).not.toContain('map[string]')
  })

  it('範例算式與空白算式都是一整份，開頭一模一樣', () => {
    const scriptDomain = scriptOf('signal')

    expect(scriptDomain.blankScript().startsWith(PREAMBLE)).toBe(true)
    expect(scriptDomain.exampleScript().startsWith(PREAMBLE)).toBe(true)
  })
})

describe('IndicatorScriptDomain.retargetReturnType', () => {
  it('把第一個 Calculate 進入點的回傳型別換成新種類的，開頭與函式主體不動', () => {
    const script = `${PREAMBLE}\n\nfunc Calculate(data []indicator.KCandle) map[string]float64 {\n\tsum := 0.0\n\treturn nil\n}`

    const retargeted = scriptOf('signal').retargetReturnType(script)

    expect(retargeted).toBe(
      `${PREAMBLE}\n\nfunc Calculate(data []indicator.KCandle) indicator.Signal {\n\tsum := 0.0\n\treturn nil\n}`)
  })

  it('進入點之前的 helper 函式不受影響', () => {
    const script = [
      PREAMBLE,
      '',
      'func average(data []indicator.KCandle) float64 {',
      '\treturn 0',
      '}',
      '',
      'func Calculate(data []indicator.KCandle) map[string]float64 {',
      '\treturn nil',
      '}',
    ].join('\n')

    const retargeted = scriptOf('floatList').retargetReturnType(script)

    expect(retargeted).toContain('func average(data []indicator.KCandle) float64 {')
    expect(retargeted).toContain('func Calculate(data []indicator.KCandle) map[string][]float64 {')
  })

  it('使用者改過的開頭不會被改回來', () => {
    const script = 'package main\n\nimport "indicator"\n\n'
      + 'func Calculate(data []indicator.KCandle) map[string]float64 {\n\treturn nil\n}'

    const retargeted = scriptOf('signal').retargetReturnType(script)

    expect(retargeted).toContain('import "indicator"')
    expect(retargeted).not.toContain('"math"')
  })

  it('算式裡沒有符合的進入點那一行時，一字不動', () => {
    const script = `${PREAMBLE}\n\nfunc Compute(rows []indicator.KCandle) map[string]float64 {\n\treturn nil\n}`

    expect(scriptOf('signal').retargetReturnType(script)).toBe(script)
  })
})

describe('IndicatorScriptDomain 吃合約行情的算式', () => {
  function contractScriptOf(resultType: string): IndicatorScriptDomain {
    return new IndicatorScriptDomain(
      new IndicatorResultTypeDomain(resultType), new MarketDataKindDomain('contractKCandle'))
  }

  it.each([
    { resultType: 'float', signature: 'func Calculate(data []indicator.ContractKCandle) map[string]float64 {' },
    { resultType: 'signal', signature: 'func Calculate(data []indicator.ContractKCandle) indicator.Signal {' },
  ])('$resultType 的空白算式收一串合約行情格', ({ resultType, signature }) => {
    expect(contractScriptOf(resultType).blankScript()).toBe(`${PREAMBLE}\n\n${signature}\n\t\n}`)
  })

  it('改成信號時，進入點仍收合約行情格、回傳改成一個信號', () => {
    const script = contractScriptOf('float').blankScript()

    const retargeted = contractScriptOf('signal').retargetReturnType(script)

    expect(retargeted).toContain('func Calculate(data []indicator.ContractKCandle) indicator.Signal {')
    expect(retargeted).not.toContain('map[string]float64')
  })

  it('一份照現貨寫法的算式，在合約那一頁改種類時連收的東西一起對上', () => {
    const spotScript = scriptOf('float').blankScript()

    const retargeted = contractScriptOf('bool').retargetReturnType(spotScript)

    expect(retargeted).toContain('func Calculate(data []indicator.ContractKCandle) map[string]bool {')
  })

  it.each([
    { resultType: 'float', reads: 'candle.FundingRate' },
    { resultType: 'floatList', reads: 'candle.OpenInterest' },
    { resultType: 'bool', reads: 'last.Mark.Close' },
    { resultType: 'boolList', reads: 'candle.FundingSettledInBar' },
    { resultType: 'signal', reads: 'last.FundingRate' },
  ])('$resultType 的範例收合約行情格，而且讀了合約才有的 $reads', ({ resultType, reads }) => {
    const example = contractScriptOf(resultType).exampleScript()

    expect(example).toContain('func Calculate(data []indicator.ContractKCandle)')
    expect(example).toContain(reads)
  })

  it('K 線那一種的範例照舊讀收盤價', () => {
    expect(scriptOf('float').exampleScript()).toContain('candle.Close')
    expect(scriptOf('float').exampleScript()).toContain('[]indicator.KCandle')
  })
})
