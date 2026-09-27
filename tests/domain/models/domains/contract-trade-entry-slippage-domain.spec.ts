import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { ContractTradeEntrySlippageDomain } from '~/domain/models/domains/contract-trade-entry-slippage-domain'

describe('ContractTradeEntrySlippageDomain', () => {
  it.each([
    { name: '做多買得比參考價高是滑點', direction: 'long', average: '97927.6', reference: '97850', expected: '比參考價高 0.08%（滑點）' },
    { name: '做多買得比參考價低不算滑點', direction: 'long', average: '97800', reference: '97850', expected: '比參考價低 0.05%' },
    { name: '做空賣得比參考價低是滑點', direction: 'short', average: '3493', reference: '3500', expected: '比參考價低 0.20%（滑點）' },
    { name: '做空賣得比參考價高不算滑點', direction: 'short', average: '3507', reference: '3500', expected: '比參考價高 0.20%' },
    { name: '剛好等於參考價', direction: 'long', average: '100', reference: '100', expected: '比參考價高 0.00%' },
  ] as const)('$name', ({ direction, average, reference, expected }) => {
    expect(new ContractTradeEntrySlippageDomain(direction, new Decimal(average), new Decimal(reference)).text).toBe(expected)
  })
})
