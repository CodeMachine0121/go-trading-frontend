import { describe, expect, it } from 'vitest'
import { ContractTradingModeDomain } from '~/domain/models/domains/contract-trading-mode-domain'

describe('ContractTradingModeDomain', () => {
  it.each([
    { declared: 'longShort', value: 'longShort', label: '多空反手' },
    { declared: 'longOnly', value: 'longOnly', label: '只做多' },
    { declared: ' SHORTONLY ', value: 'shortOnly', label: '只做空' },
    { declared: '', value: 'longShort', label: '多空反手' },
    { declared: 'spot', value: 'longShort', label: '多空反手' },
  ])('「$declared」讀成 $value（$label）', ({ declared, value, label }) => {
    const tradingMode = new ContractTradingModeDomain(declared)

    expect(tradingMode.value).toBe(value)
    expect(tradingMode.label()).toBe(label)
  })

  it('每一個選項都說得出它買入與賣出各是什麼意思', () => {
    const option = new ContractTradingModeDomain('shortOnly').toOptionDto()

    expect(option.description).toContain('賣出：空手開空')
    expect(option.description).toContain('買入：持空倉就平掉')
  })
})
