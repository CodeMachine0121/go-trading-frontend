import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { JournalNumberDomain } from '~/domain/models/domains/journal-number-domain'

describe('JournalNumberDomain', () => {
  it.each([
    ['正的金額加正號與千分位', '1284.6', '+1,284.60'],
    ['負的金額用減號', '-76.4', '−76.40'],
    ['四捨五入後是零就不帶正負號', '-0.001', '0.00'],
  ])('signedAmount：%s', (_, value, expected) => {
    expect(new JournalNumberDomain(new Decimal(value)).signedAmount()).toBe(expected)
  })

  it.each([
    ['正的 R', '1.534', '+1.53R'],
    ['負的 R', '-0.53', '−0.53R'],
    ['零 R', '0.001', '0.00R'],
  ])('rMultiple：%s', (_, value, expected) => {
    expect(new JournalNumberDomain(new Decimal(value)).rMultiple()).toBe(expected)
  })

  it.each([
    ['價格去掉多餘的零並加千分位', '97927.60', '97,927.6'],
    ['負的價格', '-1234.5', '−1,234.5'],
  ])('price：%s', (_, value, expected) => {
    expect(new JournalNumberDomain(new Decimal(value)).price()).toBe(expected)
  })

  it('priceAt 依指定位數四捨五入', () => {
    expect(new JournalNumberDomain(new Decimal('97927.647')).priceAt(1)).toBe('97,927.6')
  })

  it.each([
    ['負的百分比', '-1.234', '−1.23%'],
    ['四捨五入成零', '-0.001', '0.00%'],
  ])('percentage：%s', (_, value, expected) => {
    expect(new JournalNumberDomain(new Decimal(value)).percentage(2)).toBe(expected)
  })

  it.each([
    ['正是上漲色', '1', 'success'],
    ['負是下跌色', '-1', 'danger'],
    ['零是中性', '0', 'neutral'],
  ])('tone：%s', (_, value, expected) => {
    expect(new JournalNumberDomain(new Decimal(value)).tone()).toBe(expected)
  })
})
