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
    expect(tradingMode.label().in('zh-TW')).toBe(label)
  })

  it('每一個選項都說得出它買入與賣出各是什麼意思', () => {
    const option = new ContractTradingModeDomain('shortOnly').toOptionDto()

    expect(option.description.in('zh-TW')).toContain('賣出：空手開空')
    expect(option.description.in('zh-TW')).toContain('買入：持空倉就平掉')
  })
})

describe('ContractTradingModeDomain 的英文說法', () => {
  it.each([
    ['longShort', 'Long & short', 'reverse into a short'],
    ['longOnly', 'Long only', 'close the long'],
    ['shortOnly', 'Short only', 'close the short'],
  ])('%s 叫 %s，說明講得出賣出或買入的意思', (declared, expectedLabel, expectedPhrase) => {
    const option = new ContractTradingModeDomain(declared).toOptionDto()

    expect(option.label.in('en')).toBe(expectedLabel)
    expect(option.description.in('en')).toContain(expectedPhrase)
  })
})
