import { describe, expect, it } from 'vitest'
import { SignalDomain } from '~/domain/models/domains/signal-domain'

describe('SignalDomain', () => {
  it.each([
    { declared: 'buy', label: '買入', englishLabel: 'Buy', tone: 'positive' },
    { declared: 'sell', label: '賣出', englishLabel: 'Sell', tone: 'negative' },
    { declared: 'hold', label: '持有', englishLabel: 'Hold', tone: 'neutral' },
  ])('$declared 讀作「$label」，語氣是 $tone', ({ declared, label, englishLabel, tone }) => {
    const signal = new SignalDomain(declared)

    expect(signal.label().in('zh-TW')).toBe(label)
    expect(signal.label().in('en')).toBe(englishLabel)
    expect(signal.tone()).toBe(tone)
  })

  it('前後空白與大小寫都不影響解讀', () => {
    expect(new SignalDomain('  BUY ').label().in('zh-TW')).toBe('買入')
  })

  it.each([
    { description: '沒有值', declared: null },
    { description: '空字串', declared: '' },
    { description: '認不得的字串', declared: 'moonshot' },
  ])('$description 時當作持有——不讓結果畫面壞掉', ({ declared }) => {
    const signal = new SignalDomain(declared)

    expect(signal.label().in('zh-TW')).toBe('持有')
    expect(signal.tone()).toBe('neutral')
  })
})
