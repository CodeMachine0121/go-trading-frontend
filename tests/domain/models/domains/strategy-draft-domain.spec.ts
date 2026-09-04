import { describe, expect, it } from 'vitest'
import { StrategyDraftDomain } from '~/domain/models/domains/strategy-draft-domain'
import { StrategyContentDto } from '~/domain/models/dto/strategy-content-dto'
import { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'

function contentOf(
  scriptBody = 'sum := 0.0',
  resultType: 'float' | 'floatList' = 'floatList',
  parameters: readonly StrategyParameterDto[] = [],
): StrategyContentDto {
  return new StrategyContentDto(scriptBody, resultType, parameters)
}

const 期數 = new StrategyParameterDto('期數', 'lookbackCount', 20)

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

describe('StrategyDraftDomain：旋鈕也是策略記著的東西', () => {
  // 旋鈕與算式內容、指標值種類同一個層級。宣告了卻不算「改過」，
  // 使用者剛排好的那幾格會被下一次載入靜靜蓋掉——而他什麼提示都不會看到。
  it.each([
    {
      changed: '多宣告了一個',
      loaded: contentOf('sum := 0.0', 'floatList', []),
      current: contentOf('sum := 0.0', 'floatList', [期數]),
    },
    {
      changed: '把宣告的那個刪掉',
      loaded: contentOf('sum := 0.0', 'floatList', [期數]),
      current: contentOf('sum := 0.0', 'floatList', []),
    },
    {
      changed: '改了名字',
      loaded: contentOf('sum := 0.0', 'floatList', [期數]),
      current: contentOf('sum := 0.0', 'floatList', [
        new StrategyParameterDto('週期', 'lookbackCount', 20)]),
    },
    {
      changed: '改了種類',
      loaded: contentOf('sum := 0.0', 'floatList', [期數]),
      current: contentOf('sum := 0.0', 'floatList', [
        new StrategyParameterDto('期數', 'number', 20)]),
    },
    {
      changed: '改了預設值',
      loaded: contentOf('sum := 0.0', 'floatList', [期數]),
      current: contentOf('sum := 0.0', 'floatList', [
        new StrategyParameterDto('期數', 'lookbackCount', 50)]),
    },
    {
      changed: '換了順序',
      loaded: contentOf('sum := 0.0', 'floatList', [
        期數, new StrategyParameterDto('倍數', 'number', 2)]),
      current: contentOf('sum := 0.0', 'floatList', [
        new StrategyParameterDto('倍數', 'number', 2), 期數]),
    },
  ])('旋鈕$changed 就算有未儲存的變更', ({ loaded, current }) => {
    expect(new StrategyDraftDomain(loaded, current).hasUnsavedChanges()).toBe(true)
  })

  it('旋鈕一模一樣就不算改過', () => {
    const draft = new StrategyDraftDomain(
      contentOf('sum := 0.0', 'floatList', [期數]),
      contentOf('sum := 0.0', 'floatList', [
        new StrategyParameterDto('期數', 'lookbackCount', 20)]))

    expect(draft.hasUnsavedChanges()).toBe(false)
  })

  it('還沒載入過任何策略，但已經宣告了一個旋鈕，就要問', () => {
    const draft = new StrategyDraftDomain(null, contentOf('', 'floatList', [期數]))

    expect(draft.hasUnsavedChanges()).toBe(true)
  })
})
