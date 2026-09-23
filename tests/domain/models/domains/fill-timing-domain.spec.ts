import { describe, expect, it } from 'vitest'
import { FillTimingDomain } from '~/domain/models/domains/fill-timing-domain'

describe('FillTimingDomain', () => {
  it.each([
    ['close', '收盤成交', true],
    ['nextOpen', '下一格開盤成交', false],
    ['intraday', '收盤成交', true],
  ])('%s 讀成「%s」', (declared, label, isDefault) => {
    const fillTiming = new FillTimingDomain(declared)

    expect(fillTiming.label()).toBe(label)
    expect(fillTiming.isDefault).toBe(isDefault)
  })

  it('下一格開盤成交的選項說出最後一格的信號不成交', () => {
    expect(new FillTimingDomain('nextOpen').toOptionDto().description).toContain('最後一格的信號不成交')
  })
})
