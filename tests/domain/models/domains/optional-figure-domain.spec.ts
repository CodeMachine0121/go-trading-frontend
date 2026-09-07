import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { OptionalFigureDomain } from '~/domain/models/domains/optional-figure-domain'

describe('OptionalFigureDomain', () => {
  it('沒有值與零是兩件不同的事', () => {
    // 某五分鐘沒有成交，成交量是零；某個市場不公布成交額，成交額沒有值。
    expect(new OptionalFigureDomain(null).toValue()).toBeNull()
    expect(new OptionalFigureDomain(new Decimal('0')).toValue()?.toString()).toBe('0')
  })

  it('沒有加上沒有還是沒有', () => {
    // 合併一個不公布成交額的市場，不該憑空生出一個成交額。
    expect(new OptionalFigureDomain(null).plus(null).toValue()).toBeNull()
  })

  it('兩個讀數加起來', () => {
    expect(new OptionalFigureDomain(new Decimal('100')).plus(new Decimal('23.5'))
      .toValue()?.toString()).toBe('123.5')
  })

  it('沒有加上一個讀數就是那個讀數', () => {
    // 那個市場既然報了，把沒報的那幾筆當成零是唯一不會扔掉已知資訊的讀法。
    expect(new OptionalFigureDomain(null).plus(new Decimal('42'))
      .toValue()?.toString()).toBe('42')
  })

  it('一個讀數加上沒有仍是那個讀數', () => {
    expect(new OptionalFigureDomain(new Decimal('42')).plus(null)
      .toValue()?.toString()).toBe('42')
  })

  it('報出來的零仍然是一個讀數', () => {
    expect(new OptionalFigureDomain(null).plus(new Decimal('0'))
      .toValue()?.toString()).toBe('0')
  })
})
