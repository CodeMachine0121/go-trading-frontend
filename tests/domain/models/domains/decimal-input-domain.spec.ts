import { describe, expect, it } from 'vitest'
import { DecimalInputDomain } from '~/domain/models/domains/decimal-input-domain'

describe('DecimalInputDomain', () => {
  it.each([
    ['一般數字', '97905', '97905'],
    ['前後空白與千分位', ' 97,927.6 ', '97927.6'],
    ['負數', '-0.01', '-0.01'],
  ])('%s讀得懂', (_, text, expected) => {
    expect(new DecimalInputDomain(text).value?.toString()).toBe(expected)
  })

  it.each([
    ['空白', '   '],
    ['不是數字', 'abc'],
  ])('%s讀作沒有', (_, text) => {
    expect(new DecimalInputDomain(text).value).toBeNull()
  })
})
