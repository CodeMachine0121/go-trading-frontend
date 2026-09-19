import { describe, expect, it } from 'vitest'
import { StrategyScript } from '~/domain/models/entities/strategy-script'

describe('StrategyScript', () => {
  it('交出去的形狀帶著它記住的那一整份算式', () => {
    const script = 'package main\n\nimport "indicator"\n\n'
      + 'func Calculate(data []indicator.KCandle) map[string][]float64 {\n\treturn nil\n}\n'
    const strategyScript = new StrategyScript(7, '二十根均線', '', script, 'floatList')

    const strategyScriptDto = strategyScript.toDomain().toDto()

    expect(strategyScriptDto.id).toBe(7)
    expect(strategyScriptDto.name).toBe('二十根均線')
    expect(strategyScriptDto.content.script).toBe(script)
    expect(strategyScriptDto.content.resultType).toBe('floatList')
  })

  it('開頭與這裡預填的不一樣時，照樣一字不動地交出去', () => {
    const strategyScript = new StrategyScript(7, '手寫的', '', '這根本不是一段程式碼', 'float')

    expect(strategyScript.toDomain().toDto().content.script).toBe('這根本不是一段程式碼')
  })

  it.each([
    { declared: 'boolList', expected: 'boolList' },
    { declared: '不認得的種類', expected: 'float' },
  ])('指標值種類 $declared 收成 $expected', ({ declared, expected }) => {
    const strategyScript = new StrategyScript(1, 'x', '', 'y', declared)

    expect(strategyScript.toDomain().toDto().content.resultType).toBe(expected)
  })
})
