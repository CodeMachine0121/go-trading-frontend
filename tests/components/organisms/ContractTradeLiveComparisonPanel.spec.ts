import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ContractTradeLiveComparisonPanel from '~/components/organisms/ContractTradeLiveComparisonPanel.vue'
import { ContractTradeLiveComparisonDomain } from '~/domain/models/domains/contract-trade-live-comparison-domain'
import { ContractTradeLiveComparison } from '~/domain/models/entities/contract-trade-live-comparison'
import { ContractTradeLiveComparisonRow } from '~/domain/models/entities/contract-trade-live-comparison-row'
import { ContractTradePerformance } from '~/domain/models/entities/contract-trade-performance'
import { TradingStrategyDto } from '~/domain/models/dto/trading-strategy-dto'

const STRATEGIES = [new TradingStrategyDto(5, 'BTC 趨勢跟隨', [], null, null, 'contractKCandle')]

function comparisonOf(rows: ContractTradeLiveComparisonRow[], deleted = false) {
  return new ContractTradeLiveComparisonDomain(new ContractTradeLiveComparison('BTC 趨勢跟隨', deleted, rows)).toDto()
}

describe('ContractTradeLiveComparisonPanel', () => {
  it('挑一份策略', async () => {
    const wrapper = mount(ContractTradeLiveComparisonPanel, { props: { tradingStrategies: STRATEGIES, selectedTradingStrategyId: null } })

    await wrapper.get('[data-testid="comparison-strategy"]').setValue('5')
    await wrapper.get('[data-testid="comparison-strategy"]').setValue('')

    expect(wrapper.emitted('update:selectedTradingStrategyId')).toEqual([[5], [null]])
  })

  it('重演中看得出來', () => {
    const wrapper = mount(ContractTradeLiveComparisonPanel, { props: { tradingStrategies: STRATEGIES, selectedTradingStrategyId: 5, replaying: true } })

    expect(wrapper.get('[data-testid="comparison-replaying"]').text()).toBe('重演中…')
  })

  it('每個標的一列；偏離的那一列寫出差幾個百分點；失敗的那一列寫原因', () => {
    const wrapper = mount(ContractTradeLiveComparisonPanel, {
      props: {
        tradingStrategies: STRATEGIES,
        selectedTradingStrategyId: 5,
        comparison: comparisonOf([
          new ContractTradeLiveComparisonRow('ETHUSDT', new ContractTradePerformance(8, 0.38, 0.38, null), new ContractTradePerformance(20, 0.61, 0.61, null), null),
          new ContractTradeLiveComparisonRow('SOLUSDT', new ContractTradePerformance(2, 0.5, 0.5, null), null, '合約行情不夠'),
        ]),
      },
    })

    expect(wrapper.get('[data-testid="comparison-row-ETHUSDT"]').text()).toContain('比回測低 23 個百分點')
    expect(wrapper.get('[data-testid="comparison-row-SOLUSDT"]').text()).toContain('合約行情不夠，無法重演')
    expect(wrapper.get('[data-testid="comparison-row-SOLUSDT"]').text()).toContain('50%')
  })

  it('沒有已平倉實單或策略已刪除時寫說明；失敗時寫原因', () => {
    const empty = mount(ContractTradeLiveComparisonPanel, { props: { tradingStrategies: STRATEGIES, selectedTradingStrategyId: 5, comparison: comparisonOf([]) } })
    const failed = mount(ContractTradeLiveComparisonPanel, { props: { tradingStrategies: STRATEGIES, selectedTradingStrategyId: 5, failureMessage: '連不上' } })

    expect(empty.get('[data-testid="comparison-notice"]').text()).toBe('還沒有已平倉的實單可以對照')
    expect(empty.find('[data-testid="comparison-table"]').exists()).toBe(false)
    expect(failed.get('[data-testid="comparison-failure"]').text()).toBe('連不上')
  })
})
