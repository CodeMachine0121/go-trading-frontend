import { describe, expect, it } from 'vitest'
import { StrategyScript } from '~/domain/models/entities/strategy-script'
import { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'
import { IndicatorScriptDomain } from '~/domain/models/domains/indicator-script-domain'

function wholeScriptOf(resultType: string, scriptBody: string): string {
  return new IndicatorScriptDomain(new IndicatorResultTypeDomain(resultType)).assemble(scriptBody)
}

describe('StrategyScript', () => {
  it('交出去的形狀帶著它記住的算法', () => {
    const scriptBody = 'sum := 0.0\nreturn nil'
    const strategyScript = new StrategyScript(
      7, '二十根均線', '', wholeScriptOf('floatList', scriptBody), 'floatList')

    const strategyScriptDto = strategyScript.toDomain().toDto()

    expect(strategyScriptDto.id).toBe(7)
    expect(strategyScriptDto.name).toBe('二十根均線')
    expect(strategyScriptDto.content.scriptBody).toBe(scriptBody)
    expect(strategyScriptDto.content.resultType).toBe('floatList')
    expect(strategyScriptDto.frameRecognised).toBe(true)
  })

  it('算式認不出外框時整段原樣交出並說明', () => {
    const strategyScript = new StrategyScript(7, '手寫的', '', '這根本不是一段程式碼', 'float')

    const strategyScriptDto = strategyScript.toDomain().toDto()

    expect(strategyScriptDto.content.scriptBody).toBe('這根本不是一段程式碼')
    expect(strategyScriptDto.frameRecognised).toBe(false)
  })

  it.each([
    { declared: 'boolList', expected: 'boolList' },
    { declared: '不認得的種類', expected: 'float' },
  ])('指標值種類 $declared 收成 $expected', ({ declared, expected }) => {
    const strategyScript = new StrategyScript(1, 'x', '', 'y', declared)

    expect(strategyScript.toDomain().toDto().content.resultType).toBe(expected)
  })
})
