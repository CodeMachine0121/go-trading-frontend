import { describe, expect, it } from 'vitest'
import { Strategy } from '~/domain/models/entities/strategy'
import { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'
import { IndicatorScriptDomain } from '~/domain/models/domains/indicator-script-domain'

function wholeScriptOf(resultType: string, scriptBody: string): string {
  return new IndicatorScriptDomain(new IndicatorResultTypeDomain(resultType)).assemble(scriptBody)
}

describe('Strategy', () => {
  it('交出去的形狀帶著它記住的四樣東西', () => {
    const scriptBody = 'sum := 0.0\nreturn nil'
    // 根數刻意不用任何一個像預設值的數字——寫死一個常見值也能通過的測試等於沒測。
    const strategy = new Strategy(
      7, '二十根均線', wholeScriptOf('floatList', scriptBody), 'floatList', '1h', 45)

    const strategyDto = strategy.toDomain().toDto()

    expect(strategyDto.id).toBe(7)
    expect(strategyDto.name).toBe('二十根均線')
    expect(strategyDto.content.scriptBody).toBe(scriptBody)
    expect(strategyDto.content.resultType).toBe('floatList')
    expect(strategyDto.content.aggregationInterval).toBe('1h')
    expect(strategyDto.content.candleCount).toBe(45)
    expect(strategyDto.frameRecognised).toBe(true)
  })

  it('算式認不出外框時整段原樣交出並說明', () => {
    const strategy = new Strategy(7, '手寫的', '這根本不是一段程式碼', 'float', '5m', 20)

    const strategyDto = strategy.toDomain().toDto()

    expect(strategyDto.content.scriptBody).toBe('這根本不是一段程式碼')
    expect(strategyDto.frameRecognised).toBe(false)
  })

  it.each([
    { declared: '5m', expected: '5m' },
    { declared: '1d', expected: '1d' },
    { declared: '7m', expected: '5m' },
    { declared: '', expected: '5m' },
  ])('彙總刻度 $declared 收成 $expected', ({ declared, expected }) => {
    // 認不得的刻度退回最細的那一種——讓畫面卡住或顯示一個空選項都比這更糟。
    const strategy = new Strategy(1, 'x', 'y', 'float', declared, 20)

    expect(strategy.toDomain().toDto().content.aggregationInterval).toBe(expected)
  })

  it.each([
    { declared: 'boolList', expected: 'boolList' },
    { declared: '不認得的種類', expected: 'float' },
  ])('指標值種類 $declared 收成 $expected', ({ declared, expected }) => {
    const strategy = new Strategy(1, 'x', 'y', declared, '5m', 20)

    expect(strategy.toDomain().toDto().content.resultType).toBe(expected)
  })
})
