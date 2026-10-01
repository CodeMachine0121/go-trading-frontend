import { describe, expect, it } from 'vitest'
import { FillTimingDomain } from '~/domain/models/domains/fill-timing-domain'

describe('FillTimingDomain', () => {
  it.each([
    ['close', '收盤成交', 'Fill at close', true],
    ['nextOpen', '下一格開盤成交', 'Fill at next open', false],
    ['intraday', '收盤成交', 'Fill at close', true],
  ])('%s 讀成「%s」', (declared, label, englishLabel, isDefault) => {
    const fillTiming = new FillTimingDomain(declared)

    expect(fillTiming.label().in('zh-TW')).toBe(label)
    expect(fillTiming.label().in('en')).toBe(englishLabel)
    expect(fillTiming.isDefault).toBe(isDefault)
  })

  it('下一格開盤成交的選項說出最後一格的信號不成交', () => {
    expect(new FillTimingDomain('nextOpen').toOptionDto().description.in('zh-TW')).toContain('最後一格的信號不成交')
  })
})
