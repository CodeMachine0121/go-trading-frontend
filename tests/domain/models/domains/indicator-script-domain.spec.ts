import { describe, expect, it } from 'vitest'
import { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'
import { IndicatorScriptDomain } from '~/domain/models/domains/indicator-script-domain'

function scriptOf(resultType: string): IndicatorScriptDomain {
  return new IndicatorScriptDomain(new IndicatorResultTypeDomain(resultType))
}

describe('IndicatorScriptDomain', () => {
  it.each([
    { resultType: 'float', valueShape: 'map[string]float64' },
    { resultType: 'floatList', valueShape: 'map[string][]float64' },
    { resultType: 'bool', valueShape: 'map[string]bool' },
    { resultType: 'boolList', valueShape: 'map[string][]bool' },
  ])('$resultType 的外框宣告產出 $valueShape', ({ resultType, valueShape }) => {
    expect(scriptOf(resultType).frameHeader())
      .toContain(`func Calculate(data []indicator.KCandle) ${valueShape} {`)
  })

  it('外框備妥常用的匯入，使用者不必自己張羅', () => {
    const frameHeader = scriptOf('float').frameHeader()

    expect(frameHeader).toContain('package main')
    expect(frameHeader).toContain('"indicator"')
    expect(frameHeader).toContain('"math"')
    expect(frameHeader).toContain('"sort"')
  })

  it('外框的結尾收掉進入點', () => {
    expect(scriptOf('float').frameFooter()).toBe('}')
  })

  it.each([
    { resultType: 'float', expectedReturn: 'return map[string]float64{' },
    { resultType: 'floatList', expectedReturn: 'return map[string][]float64{' },
    { resultType: 'bool', expectedReturn: 'return map[string]bool{' },
    { resultType: 'boolList', expectedReturn: 'return map[string][]bool{' },
  ])('$resultType 的範例內容回傳對應的形狀', ({ resultType, expectedReturn }) => {
    const exampleBody = scriptOf(resultType).exampleBody()

    expect(exampleBody).toContain(expectedReturn)
    expect(exampleBody).not.toContain('package main')
    expect(exampleBody).not.toContain('func Calculate')
  })

  it('組出來的算式是外框夾著內容', () => {
    const assembled = scriptOf('float').assemble('return map[string]float64{"一": 1}')

    expect(assembled).toBe([
      'package main',
      '',
      'import (',
      '\t"indicator"',
      '\t"math"',
      '\t"sort"',
      ')',
      '',
      'func Calculate(data []indicator.KCandle) map[string]float64 {',
      '\treturn map[string]float64{"一": 1}',
      '}',
      '',
    ].join('\n'))
  })

  it('內容整段縮排一層，但行數一行不多一行不少', () => {
    const body = 'sum := 0.0\nfor _, candle := range data {\n\tsum += candle.Close\n}'

    const assembled = scriptOf('float').assemble(body)

    expect(assembled).toContain('\tsum := 0.0\n\tfor _, candle := range data {\n\t\tsum += candle.Close\n\t}')
    expect(assembled.split('\n')).toHaveLength(
      scriptOf('float').frameHeader().split('\n').length + body.split('\n').length + 2)
  })

  it('內容裡的空行不會被塞進沒有意義的縮排', () => {
    const assembled = scriptOf('float').assemble('sum := 0.0\n\nreturn nil')

    expect(assembled).toContain('\tsum := 0.0\n\n\treturn nil')
  })

  it('化成樣板時，外框頭尾與範例內容一次拿齊', () => {
    const templateDto = scriptOf('boolList').toTemplateDto()

    expect(templateDto.frameHeader).toContain('map[string][]bool')
    expect(templateDto.frameFooter).toBe('}')
    expect(templateDto.exampleBody).toContain('return map[string][]bool{')
  })
})
