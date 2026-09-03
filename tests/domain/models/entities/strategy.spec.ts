import { describe, expect, it } from 'vitest'
import { Strategy } from '~/domain/models/entities/strategy'
import { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'
import { IndicatorScriptDomain } from '~/domain/models/domains/indicator-script-domain'

function wholeScriptOf(resultType: string, scriptBody: string): string {
  return new IndicatorScriptDomain(new IndicatorResultTypeDomain(resultType)).assemble(scriptBody)
}

describe('Strategy', () => {
  it('交出去的形狀帶著它記住的算法', () => {
    const scriptBody = 'sum := 0.0\nreturn nil'
    const strategy = new Strategy(
      7, '二十根均線', wholeScriptOf('floatList', scriptBody), 'floatList')

    const strategyDto = strategy.toDomain().toDto()

    expect(strategyDto.id).toBe(7)
    expect(strategyDto.name).toBe('二十根均線')
    expect(strategyDto.content.scriptBody).toBe(scriptBody)
    expect(strategyDto.content.resultType).toBe('floatList')
    expect(strategyDto.frameRecognised).toBe(true)
  })

  it('算式認不出外框時整段原樣交出並說明', () => {
    const strategy = new Strategy(7, '手寫的', '這根本不是一段程式碼', 'float')

    const strategyDto = strategy.toDomain().toDto()

    expect(strategyDto.content.scriptBody).toBe('這根本不是一段程式碼')
    expect(strategyDto.frameRecognised).toBe(false)
  })

  it.each([
    { declared: 'boolList', expected: 'boolList' },
    { declared: '不認得的種類', expected: 'float' },
  ])('指標值種類 $declared 收成 $expected', ({ declared, expected }) => {
    const strategy = new Strategy(1, 'x', 'y', declared)

    expect(strategy.toDomain().toDto().content.resultType).toBe(expected)
  })
})
