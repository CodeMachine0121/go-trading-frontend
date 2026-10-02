import { describe, expect, it } from 'vitest'
import { TradeHoldingDurationDomain } from '~/domain/models/domains/trade-holding-duration-domain'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

describe('TradeHoldingDurationDomain', () => {
  it.each([
    { name: '一天以內寫小時與分', openedAt: '2026-09-25T06:03:00Z', closedAt: '2026-09-26T08:40:00Z', expected: '持倉 1 天 2 小時' },
    { name: '超過一小時寫小時與分', openedAt: '2026-09-25T06:03:00Z', closedAt: '2026-09-25T08:40:00Z', expected: '持倉 2 小時 37 分' },
    { name: '不到一小時只寫分', openedAt: '2026-09-25T06:03:00Z', closedAt: '2026-09-25T06:40:00Z', expected: '持倉 37 分' },
    { name: '剛好一小時', openedAt: '2026-09-25T06:00:00Z', closedAt: '2026-09-25T07:00:00Z', expected: '持倉 1 小時 0 分' },
    { name: '同一分鐘進出', openedAt: '2026-09-25T06:00:10Z', closedAt: '2026-09-25T06:00:50Z', expected: '持倉 0 分' },
  ])('$name', ({ openedAt, closedAt, expected }) => {
    expect(new TradeHoldingDurationDomain(new Date(openedAt), new Date(closedAt)).text.in('zh-TW')).toBe(expected)
  })

  it.each([
    { openedAt: '2026-09-25T06:03:00Z', closedAt: '2026-09-26T08:40:00Z', expected: 'Held 1d 2h' },
    { openedAt: '2026-09-25T06:03:00Z', closedAt: '2026-09-25T08:40:00Z', expected: 'Held 2h 37m' },
    { openedAt: '2026-09-25T06:03:00Z', closedAt: '2026-09-25T06:40:00Z', expected: 'Held 37m' },
  ])('英文寫成 $expected', ({ openedAt, closedAt, expected }) => {
    expect(new TradeHoldingDurationDomain(new Date(openedAt), new Date(closedAt)).text.in('en')).toBe(expected)
  })

  it('用呼叫端給的那個詞', () => {
    const text = new TradeHoldingDurationDomain(
      new Date('2026-09-25T06:03:00Z'), new Date('2026-09-25T06:40:00Z'), new LocalizedTextVo('持有', 'Held')).text

    expect(text.in('zh-TW')).toBe('持有 37 分')
  })
})
