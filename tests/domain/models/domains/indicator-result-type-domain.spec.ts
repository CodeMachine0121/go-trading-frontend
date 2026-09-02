import { describe, expect, it } from 'vitest'
import { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'

describe('IndicatorResultTypeDomain', () => {
  it.each([
    { declared: 'float', label: '一個數字', isList: false, holdsNumbers: true },
    { declared: 'floatList', label: '一串數字', isList: true, holdsNumbers: true },
    { declared: 'bool', label: '一個是非', isList: false, holdsNumbers: false },
    { declared: 'boolList', label: '一串是非', isList: true, holdsNumbers: false },
  ])('$declared 是「$label」', ({ declared, label, isList, holdsNumbers }) => {
    const resultType = new IndicatorResultTypeDomain(declared)

    expect(resultType.value).toBe(declared)
    expect(resultType.label()).toBe(label)
    expect(resultType.isList()).toBe(isList)
    expect(resultType.holdsNumbers()).toBe(holdsNumbers)
  })

  it.each([
    { description: '完全沒有宣告', declared: '' },
    { description: '只有空白', declared: '   ' },
    { description: '宣告了不認得的種類', declared: 'string' },
  ])('$description 時當作一個數字', ({ declared }) => {
    const resultType = new IndicatorResultTypeDomain(declared)

    expect(resultType.value).toBe('float')
    expect(resultType.label()).toBe('一個數字')
  })

  it('前後空白與大小寫都不影響解讀', () => {
    expect(new IndicatorResultTypeDomain('  FloatList ').value).toBe('floatList')
  })

  it('化成選項時帶著給人看的名字', () => {
    const optionDto = new IndicatorResultTypeDomain('boolList').toOptionDto()

    expect(optionDto.value).toBe('boolList')
    expect(optionDto.label).toBe('一串是非')
  })
})
