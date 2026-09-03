import { describe, expect, it } from 'vitest'
import { AggregationIntervalDomain } from '~/domain/models/domains/aggregation-interval-domain'

describe('AggregationIntervalDomain', () => {
  it.each([
    { declared: '5m', expected: '5m' },
    { declared: '15m', expected: '15m' },
    { declared: '1h', expected: '1h' },
    { declared: '4h', expected: '4h' },
    { declared: '1d', expected: '1d' },
  ])('認得 $declared', ({ declared, expected }) => {
    expect(new AggregationIntervalDomain(declared).value).toBe(expected)
  })

  it.each([
    { name: '大寫', declared: '1D' },
    { name: '前後有空白', declared: '  1d  ' },
    { name: '大寫又有空白', declared: ' 1D ' },
  ])('$name 也認得——那是同一種刻度的另一種寫法', ({ declared }) => {
    expect(new AggregationIntervalDomain(declared).value).toBe('1d')
  })

  it.each([
    { name: '完全沒宣告', declared: '' },
    { name: '只有空白', declared: '   ' },
    { name: '認不得的代號', declared: '7m' },
    { name: '根本不是代號', declared: '一小時' },
  ])('$name 時退回最細的那一種，而不是拒絕', ({ declared }) => {
    // 使用者從清單挑，挑不出非法值；真正會給出陌生字串的是後端，
    // 而讓整個結果畫面因為一個沒見過的刻度壞掉，遠比當成五分鐘呈現更糟。
    // 退回最細的那一種也剛好等於「不彙總」——那是「沒特別指定」最誠實的意思。
    expect(new AggregationIntervalDomain(declared).value).toBe('5m')
  })

  it.each([
    { declared: '5m', expected: '五分鐘' },
    { declared: '15m', expected: '十五分鐘' },
    { declared: '1h', expected: '一小時' },
    { declared: '4h', expected: '四小時' },
    { declared: '1d', expected: '一天' },
  ])('$declared 說出來是「$expected」', ({ declared, expected }) => {
    // 翻譯屬於領域：畫面拿到的已經是給人看的名字，不必自己認得代號。
    expect(new AggregationIntervalDomain(declared).label()).toBe(expected)
  })

  it('認不得的代號說出來的是最細那一種的名字', () => {
    expect(new AggregationIntervalDomain('7m').label()).toBe('五分鐘')
  })

  it('交出選項時代號與名字一起交，選單不必自己配對', () => {
    const optionDto = new AggregationIntervalDomain('4h').toOptionDto()

    expect(optionDto.value).toBe('4h')
    expect(optionDto.label).toBe('四小時')
  })
})
