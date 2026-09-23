import { describe, expect, it } from 'vitest'
import { PublishedStrategyScriptDto } from '~/domain/models/dto/published-strategy-script-dto'
import { StrategyScriptParameterDto } from '~/domain/models/dto/strategy-script-parameter-dto'

describe('PublishedStrategyScriptDto.toContent', () => {
  it('它在工作區裡的樣子：種類與旋鈕照實帶進來，算式是空的', () => {
    const period = new StrategyScriptParameterDto('週期', 'lookbackCount', 20)
    const published = new PublishedStrategyScriptDto(
      9, '均線交叉', '', 'floatList', 'someone@example.com',
      new Date('2026-09-10T08:00:00.000Z'), [period], true, '一串數字')

    const content = published.toContent()

    expect(content.script).toBe('')
    expect(content.resultType).toBe('floatList')
    expect(content.parameters).toEqual([period])
  })
})
