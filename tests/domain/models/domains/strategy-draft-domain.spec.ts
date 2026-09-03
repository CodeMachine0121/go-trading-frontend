import { describe, expect, it } from 'vitest'
import { StrategyDraftDomain } from '~/domain/models/domains/strategy-draft-domain'
import { StrategyContentDto } from '~/domain/models/dto/strategy-content-dto'

function contentOf(
  scriptBody = 'sum := 0.0',
  resultType: 'float' | 'floatList' = 'floatList',
): StrategyContentDto {
  return new StrategyContentDto(scriptBody, resultType)
}

describe('StrategyDraftDomain', () => {
  it('載入之後一個字都沒改，就沒有東西會被弄丟', () => {
    const draft = new StrategyDraftDomain(contentOf(), contentOf())

    expect(draft.hasUnsavedChanges()).toBe(false)
  })

  it.each([
    { changed: '算式內容', current: contentOf('sum := 1.0') },
    { changed: '指標值種類', current: contentOf('sum := 0.0', 'float') },
  ])('$changed 改了就算有未儲存的變更', ({ current }) => {
    const draft = new StrategyDraftDomain(contentOf(), current)

    expect(draft.hasUnsavedChanges()).toBe(true)
  })

  it('改掉又改回來算沒改——那確實是同一份東西', () => {
    const draft = new StrategyDraftDomain(contentOf(), contentOf())

    expect(draft.hasUnsavedChanges()).toBe(false)
  })

  it.each([
    { name: '完全空白', scriptBody: '' },
    { name: '只有空白字元', scriptBody: '  \n\t ' },
  ])('還沒載入過任何策略，且內容$name時不必問', ({ scriptBody }) => {
    const draft = new StrategyDraftDomain(null, contentOf(scriptBody))

    expect(draft.hasUnsavedChanges()).toBe(false)
  })

  it('還沒載入過任何策略，但已經寫了東西時要問', () => {
    // 那些字一樣是使用者寫的。該問卻不問會弄丟它們，不該問卻問只是煩人。
    const draft = new StrategyDraftDomain(null, contentOf('sum := 0.0'))

    expect(draft.hasUnsavedChanges()).toBe(true)
  })
})
