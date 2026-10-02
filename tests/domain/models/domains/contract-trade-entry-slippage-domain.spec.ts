import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { ContractTradeEntrySlippageDomain } from '~/domain/models/domains/contract-trade-entry-slippage-domain'

describe('ContractTradeEntrySlippageDomain', () => {
  it.each([
    { name: '做多買得比參考價高是滑點', direction: 'long', average: '97927.6', reference: '97850', expected: '比參考價高 0.08%（滑點）', expectedEnglish: '0.08% above the reference price (slippage)' },
    { name: '做多買得比參考價低不算滑點', direction: 'long', average: '97800', reference: '97850', expected: '比參考價低 0.05%', expectedEnglish: '0.05% below the reference price' },
    { name: '做空賣得比參考價低是滑點', direction: 'short', average: '3493', reference: '3500', expected: '比參考價低 0.20%（滑點）', expectedEnglish: '0.20% below the reference price (slippage)' },
    { name: '做空賣得比參考價高不算滑點', direction: 'short', average: '3507', reference: '3500', expected: '比參考價高 0.20%', expectedEnglish: '0.20% above the reference price' },
    { name: '剛好等於參考價', direction: 'long', average: '100', reference: '100', expected: '比參考價高 0.00%', expectedEnglish: '0.00% above the reference price' },
  ] as const)('$name', ({ direction, average, reference, expected, expectedEnglish }) => {
    const text = new ContractTradeEntrySlippageDomain(direction, new Decimal(average), new Decimal(reference)).text

    expect(text.in('zh-TW')).toBe(expected)
    expect(text.in('en')).toBe(expectedEnglish)
  })
})
