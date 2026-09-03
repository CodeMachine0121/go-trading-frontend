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

  it('樣板說得出使用者寫的第一行是整段算式的第幾行', () => {
    const templateDto = scriptOf('float').toTemplateDto()

    // 外框開頭九行（package、空行、import 三行加頭尾、空行、簽章），內容從第十行開始。
    expect(templateDto.frameHeaderLineCount).toBe(9)
    expect(templateDto.bodyStartLineNumber).toBe(10)
  })

  it('每一種種類的外框行數都一樣，只有簽章那一行不同', () => {
    const lineCounts = ['float', 'floatList', 'bool', 'boolList']
      .map(resultType => scriptOf(resultType).toTemplateDto().frameHeaderLineCount)

    expect(lineCounts).toEqual([9, 9, 9, 9])
  })

  it('化成樣板時，外框頭尾與範例內容一次拿齊', () => {
    const templateDto = scriptOf('boolList').toTemplateDto()

    expect(templateDto.frameHeader).toContain('map[string][]bool')
    expect(templateDto.frameFooter).toBe('}')
    expect(templateDto.exampleBody).toContain('return map[string][]bool{')
  })
})

describe('IndicatorScriptDomain.disassemble', () => {
  it.each(['float', 'floatList', 'bool', 'boolList'])(
    '%s 的算式拆得回當初寫的內容',
    (resultType) => {
      const scriptBody = 'sum := 0.0\nreturn nil'
      const script = scriptOf(resultType).assemble(scriptBody)

      const disassembled = scriptOf(resultType).disassemble(script)

      expect(disassembled.body).toBe(scriptBody)
      expect(disassembled.frameRecognised).toBe(true)
    })

  it('內容本來就有的縮排原樣取回，不多一層也不少一層', () => {
    const scriptBody = 'for _, candle := range data {\n\tsum += candle.Close\n}'
    const script = scriptOf('float').assemble(scriptBody)

    expect(scriptOf('float').disassemble(script).body).toBe(scriptBody)
  })

  it('內容裡的空行仍然是空行', () => {
    const scriptBody = 'sum := 0.0\n\nreturn map[string]float64{"均價": sum}'
    const script = scriptOf('float').assemble(scriptBody)

    expect(scriptOf('float').disassemble(script).body).toBe(scriptBody)
  })

  it('外框日後多一個匯入，既有的算式仍然拆得開', () => {
    // 拆解錨定的是進入點與收尾，不是外框的字面。逐字比對的話，
    // 外框只要動一個字，所有既有的算式就會一起認不出來。
    const script = [
      'package main',
      '',
      'import (',
      '\t"indicator"',
      '\t"math"',
      '\t"sort"',
      '\t"strings"',
      ')',
      '',
      'func Calculate(data []indicator.KCandle) map[string]float64 {',
      '\tsum := 0.0',
      '\treturn nil',
      '}',
      '',
    ].join('\n')

    const disassembled = scriptOf('float').disassemble(script)

    expect(disassembled.body).toBe('sum := 0.0\nreturn nil')
    expect(disassembled.frameRecognised).toBe(true)
  })

  it('外框日後改了進入點的參數名，既有的算式仍然拆得開', () => {
    // 錨定的是「這一行是進入點」，不是「這一行長得跟現在的外框一模一樣」。
    const script = [
      'package main',
      '',
      'func Calculate(candles []indicator.KCandle) map[string]float64 {',
      '\tsum := 0.0',
      '\treturn nil',
      '}',
      '',
    ].join('\n')

    const disassembled = scriptOf('float').disassemble(script)

    expect(disassembled.body).toBe('sum := 0.0\nreturn nil')
    expect(disassembled.frameRecognised).toBe(true)
  })

  it.each([
    { name: '沒有進入點那一行', script: 'sum := 0.0\nreturn nil' },
    { name: '空字串', script: '' },
    { name: '有進入點卻沒有收尾', script: 'func Calculate(data []indicator.KCandle) map[string]float64 {\n\tsum := 0.0' },
  ])('認不出外框時整段原樣交還：$name', ({ script }) => {
    // 硬拆的代價太高——使用者可能過很久才發現程式碼被剪壞，而那時原稿已經沒了。
    const disassembled = scriptOf('float').disassemble(script)

    expect(disassembled.body).toBe(script)
    expect(disassembled.frameRecognised).toBe(false)
  })

  it('包起來再拆開再包起來，與第一次包的完全相同', () => {
    const scriptDomain = scriptOf('floatList')
    const scriptBody = 'closePrices := []float64{}\nfor _, candle := range data {\n\tclosePrices = append(closePrices, candle.Close)\n}\n\nreturn map[string][]float64{"收盤價": closePrices}'

    const firstAssembly = scriptDomain.assemble(scriptBody)
    const roundTripped = scriptDomain.assemble(scriptDomain.disassemble(firstAssembly).body)

    expect(roundTripped).toBe(firstAssembly)
  })

  it('拆開再包起來再拆開，與第一次拆的完全相同', () => {
    const scriptDomain = scriptOf('float')
    const script = scriptDomain.assemble('sum := 0.0\nreturn nil')

    const firstBody = scriptDomain.disassemble(script).body
    const roundTrippedBody = scriptDomain.disassemble(scriptDomain.assemble(firstBody)).body

    expect(roundTrippedBody).toBe(firstBody)
  })
})
