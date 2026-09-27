import { describe, expect, it } from 'vitest'
import { ContractTradeHoldingDurationDomain } from '~/domain/models/domains/contract-trade-holding-duration-domain'

describe('ContractTradeHoldingDurationDomain', () => {
  it.each([
    { name: '一天以內寫小時與分', openedAt: '2026-09-25T06:03:00Z', closedAt: '2026-09-26T08:40:00Z', expected: '持倉 1 天 2 小時' },
    { name: '超過一小時寫小時與分', openedAt: '2026-09-25T06:03:00Z', closedAt: '2026-09-25T08:40:00Z', expected: '持倉 2 小時 37 分' },
    { name: '不到一小時只寫分', openedAt: '2026-09-25T06:03:00Z', closedAt: '2026-09-25T06:40:00Z', expected: '持倉 37 分' },
    { name: '剛好一小時', openedAt: '2026-09-25T06:00:00Z', closedAt: '2026-09-25T07:00:00Z', expected: '持倉 1 小時 0 分' },
    { name: '同一分鐘進出', openedAt: '2026-09-25T06:00:10Z', closedAt: '2026-09-25T06:00:50Z', expected: '持倉 0 分' },
  ])('$name', ({ openedAt, closedAt, expected }) => {
    expect(new ContractTradeHoldingDurationDomain(new Date(openedAt), new Date(closedAt)).text).toBe(expected)
  })
})
