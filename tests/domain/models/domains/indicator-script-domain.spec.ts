import { describe, expect, it } from 'vitest'
import { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'
import { IndicatorScriptDomain } from '~/domain/models/domains/indicator-script-domain'

function scriptOf(resultType: string): IndicatorScriptDomain {
  return new IndicatorScriptDomain(new IndicatorResultTypeDomain(resultType))
}

const FIXED_FRAME_HEADER = [
  'package main',
  '',
  'import (',
  '\t"indicator"',
  '\t"math"',
  '\t"sort"',
  ')',
].join('\n')

describe('IndicatorScriptDomain', () => {
  it('唯讀外框就是那七行，不含進入點', () => {
    expect(scriptOf('float').frameHeader()).toBe(FIXED_FRAME_HEADER)
    expect(scriptOf('float').frameHeader()).not.toContain('func Calculate')
  })

  it.each(['float', 'floatList', 'bool', 'boolList', 'signal'])(
    '唯讀外框不隨指標值種類變：%s',
    (resultType) => {
      expect(scriptOf(resultType).frameHeader()).toBe(FIXED_FRAME_HEADER)
    })

  it.each([
    { resultType: 'float', signature: 'func Calculate(data []indicator.KCandle) map[string]float64 {' },
    { resultType: 'floatList', signature: 'func Calculate(data []indicator.KCandle) map[string][]float64 {' },
    { resultType: 'bool', signature: 'func Calculate(data []indicator.KCandle) map[string]bool {' },
    { resultType: 'boolList', signature: 'func Calculate(data []indicator.KCandle) map[string][]bool {' },
    { resultType: 'signal', signature: 'func Calculate(data []indicator.KCandle) indicator.Signal {' },
  ])('$resultType 的空白 stub 是一個空的 Calculate，簽章帶對應的回傳型別', ({ resultType, signature }) => {
    expect(scriptOf(resultType).blankBody()).toBe(`${signature}\n\t\n}`)
  })

  it.each([
    { resultType: 'float', expectedReturn: 'return map[string]float64{' },
    { resultType: 'floatList', expectedReturn: 'return map[string][]float64{' },
    { resultType: 'bool', expectedReturn: 'return map[string]bool{' },
    { resultType: 'boolList', expectedReturn: 'return map[string][]bool{' },
  ])('$resultType 的範例主體是一整個 Calculate 函式', ({ resultType, expectedReturn }) => {
    const exampleBody = scriptOf(resultType).exampleBody()

    expect(exampleBody.startsWith('func Calculate(data []indicator.KCandle) ')).toBe(true)
    expect(exampleBody.endsWith('\n}')).toBe(true)
    expect(exampleBody).toContain(`\t${expectedReturn}`)
    expect(exampleBody).not.toContain('package main')
  })

  it('信號種類的範例主體用系統提供的方式選一個信號', () => {
    const exampleBody = scriptOf('signal').exampleBody()

    expect(exampleBody).toContain('func Calculate(data []indicator.KCandle) indicator.Signal {')
    expect(exampleBody).toContain('\treturn indicator.Buy')
    expect(exampleBody).toContain('\treturn indicator.Hold')
    expect(exampleBody).not.toContain('map[string]')
  })
})

describe('IndicatorScriptDomain.retargetReturnType', () => {
  it('把第一個 Calculate 進入點的回傳型別換成新種類的，函式主體不動', () => {
    const body = 'func Calculate(data []indicator.KCandle) map[string]float64 {\n\tsum := 0.0\n\treturn nil\n}'

    const retargeted = scriptOf('signal').retargetReturnType(body)

    expect(retargeted).toBe(
      'func Calculate(data []indicator.KCandle) indicator.Signal {\n\tsum := 0.0\n\treturn nil\n}')
  })

  it('進入點之前的 helper 函式不受影響', () => {
    const body = [
      'func average(data []indicator.KCandle) float64 {',
      '\treturn 0',
      '}',
      '',
      'func Calculate(data []indicator.KCandle) map[string]float64 {',
      '\treturn nil',
      '}',
    ].join('\n')

    const retargeted = scriptOf('floatList').retargetReturnType(body)

    expect(retargeted).toContain('func average(data []indicator.KCandle) float64 {')
    expect(retargeted).toContain('func Calculate(data []indicator.KCandle) map[string][]float64 {')
  })

  it('主體裡沒有符合的進入點那一行時，一字不動', () => {
    const body = 'func Compute(rows []indicator.KCandle) map[string]float64 {\n\treturn nil\n}'

    expect(scriptOf('signal').retargetReturnType(body)).toBe(body)
  })
})

describe('IndicatorScriptDomain.assemble', () => {
  it('把主體接在唯讀外框後面，中間留一個空行，不縮排、不加收尾', () => {
    const assembled = scriptOf('float').assemble(
      'func Calculate(data []indicator.KCandle) map[string]float64 {\n\treturn nil\n}')

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
      '\treturn nil',
      '}',
      '',
    ].join('\n'))
  })

  it('主體是頂層 Go，原樣接上——helper 函式也一起送出去', () => {
    const body = [
      'func helper() int { return 1 }',
      '',
      'func Calculate(data []indicator.KCandle) indicator.Signal {',
      '\treturn indicator.Hold',
      '}',
    ].join('\n')

    const assembled = scriptOf('signal').assemble(body)

    expect(assembled).toContain('func helper() int { return 1 }')
    expect(assembled).toContain(`${FIXED_FRAME_HEADER}\n\nfunc helper() int`)
  })
})

describe('IndicatorScriptDomain.disassemble', () => {
  it.each(['float', 'floatList', 'bool', 'boolList', 'signal'])(
    '%s 的算式拆得回當初寫的主體',
    (resultType) => {
      const body = scriptOf(resultType).blankBody()
      const script = scriptOf(resultType).assemble(body)

      const disassembled = scriptOf(resultType).disassemble(script)

      expect(disassembled.body).toBe(body)
      expect(disassembled.frameRecognised).toBe(true)
    })

  it('舊編輯器存的算式（外框含 func Calculate 那一行）認得，主體剛好是整個函式', () => {
    const oldStyleScript = [
      'package main',
      '',
      'import (',
      '\t"indicator"',
      '\t"math"',
      '\t"sort"',
      ')',
      '',
      'func Calculate(data []indicator.KCandle) map[string]float64 {',
      '\tsum := 0.0',
      '\treturn nil',
      '}',
      '',
    ].join('\n')

    const disassembled = scriptOf('float').disassemble(oldStyleScript)

    expect(disassembled.frameRecognised).toBe(true)
    expect(disassembled.body).toBe(
      'func Calculate(data []indicator.KCandle) map[string]float64 {\n\tsum := 0.0\n\treturn nil\n}')
  })

  it.each([
    { name: '最上面那一塊不是那七行', script: 'package main\n\nfunc Calculate() {}\n' },
    { name: '多了一個匯入', script: 'package main\n\nimport (\n\t"indicator"\n\t"math"\n\t"sort"\n\t"strings"\n)\n\nfunc Calculate() {}\n' },
    { name: '空字串', script: '' },
  ])('認不出最上面那一塊時整段原樣交還：$name', ({ script }) => {
    const disassembled = scriptOf('float').disassemble(script)

    expect(disassembled.body).toBe(script)
    expect(disassembled.frameRecognised).toBe(false)
  })

  it('認得的算式沒有尾端換行時，主體照樣完整取回', () => {
    const script = `${FIXED_FRAME_HEADER}\n\nfunc Calculate(data []indicator.KCandle) map[string]float64 {\n\treturn nil\n}`

    const disassembled = scriptOf('float').disassemble(script)

    expect(disassembled.frameRecognised).toBe(true)
    expect(disassembled.body).toBe(
      'func Calculate(data []indicator.KCandle) map[string]float64 {\n\treturn nil\n}')
  })

  it('包起來再拆開再包起來，與第一次包的完全相同', () => {
    const scriptDomain = scriptOf('floatList')
    const body = scriptDomain.exampleBody()

    const firstAssembly = scriptDomain.assemble(body)
    const roundTripped = scriptDomain.assemble(scriptDomain.disassemble(firstAssembly).body)

    expect(roundTripped).toBe(firstAssembly)
  })

  it('拆開再包起來再拆開，與第一次拆的完全相同', () => {
    const scriptDomain = scriptOf('signal')
    const script = scriptDomain.assemble(scriptDomain.blankBody())

    const firstBody = scriptDomain.disassemble(script).body
    const roundTrippedBody = scriptDomain.disassemble(scriptDomain.assemble(firstBody)).body

    expect(roundTrippedBody).toBe(firstBody)
  })
})

describe('IndicatorScriptDomain template DTO', () => {
  it('外框七行，主體從第九行開始（外框加一個分隔的空行）', () => {
    const templateDto = scriptOf('float').toTemplateDto()

    expect(templateDto.frameHeaderLineCount).toBe(7)
    expect(templateDto.bodyStartLineNumber).toBe(9)
  })

  it('化成樣板時，外框、範例主體、空白 stub 一次拿齊', () => {
    const templateDto = scriptOf('signal').toTemplateDto()

    expect(templateDto.frameHeader).toBe(FIXED_FRAME_HEADER)
    expect(templateDto.exampleBody).toContain('func Calculate(data []indicator.KCandle) indicator.Signal {')
    expect(templateDto.blankBody).toBe('func Calculate(data []indicator.KCandle) indicator.Signal {\n\t\n}')
  })
})
