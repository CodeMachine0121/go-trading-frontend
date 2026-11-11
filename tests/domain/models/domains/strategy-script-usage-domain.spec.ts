import { describe, expect, it } from 'vitest'
import { StrategyScriptUsageDomain } from '~/domain/models/domains/strategy-script-usage-domain'

describe('StrategyScriptUsageDomain', () => {
  it.each([
    { declared: 'chart', value: 'chart', label: '圖表用', switchLabel: '改成計算用', appliesToChart: true, feedsCalculation: false },
    { declared: 'calculation', value: 'calculation', label: '計算用', switchLabel: '改成圖表用', appliesToChart: false, feedsCalculation: true },
    { declared: '', value: 'calculation', label: '計算用', switchLabel: '改成圖表用', appliesToChart: false, feedsCalculation: true },
    { declared: 'backtest', value: 'calculation', label: '計算用', switchLabel: '改成圖表用', appliesToChart: false, feedsCalculation: true },
  ])('宣告「$declared」讀作 $value（$label）', ({ declared, value, label, switchLabel, appliesToChart, feedsCalculation }) => {
    const usage = new StrategyScriptUsageDomain(declared).toDto()

    expect(usage.value).toBe(value)
    expect(usage.label.in('zh-TW')).toBe(label)
    expect(usage.switchLabel.in('zh-TW')).toBe(switchLabel)
    expect(usage.switchTarget).toBe(value === 'chart' ? 'calculation' : 'chart')
    expect(usage.appliesToChart).toBe(appliesToChart)
    expect(usage.feedsCalculation).toBe(feedsCalculation)
  })

  it('英文的名字與切換鍵', () => {
    const usage = new StrategyScriptUsageDomain('calculation').toDto()

    expect(usage.label.in('en')).toBe('Calculation')
    expect(usage.switchLabel.in('en')).toBe('Switch to chart')
  })
})
