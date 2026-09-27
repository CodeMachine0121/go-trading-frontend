import Decimal from 'decimal.js'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SpotTradeLiveComparisonPanel from '~/components/organisms/SpotTradeLiveComparisonPanel.vue'
import { SpotTradeLiveComparisonDomain } from '~/domain/models/domains/spot-trade-live-comparison-domain'
import { SpotTradeLiveComparison } from '~/domain/models/entities/spot-trade-live-comparison'
import { SpotTradeLiveComparisonRow } from '~/domain/models/entities/spot-trade-live-comparison-row'
import { SpotTradePerformance } from '~/domain/models/entities/spot-trade-performance'
import type { TradingStrategyDto } from '~/domain/models/dto/trading-strategy-dto'

function comparison() {
  return new SpotTradeLiveComparisonDomain(new SpotTradeLiveComparison('台股均線', false, [
    new SpotTradeLiveComparisonRow('2330', 'taiwanStock', new SpotTradePerformance(8, 0.5, new Decimal('0.1'), 2), new SpotTradePerformance(12, 0.62, null, 0), null),
    new SpotTradeLiveComparisonRow('2317', 'taiwanStock', new SpotTradePerformance(3, 0.67, null, 0), null, '行情不夠'),
  ], new Decimal('0.1'), 2)).toDto()
}

function mountPanel(props: Record<string, unknown> = {}) {
  return mount(SpotTradeLiveComparisonPanel, {
    props: { tradingStrategies: [], selectedTradingStrategyId: null, ...props },
  })
}

describe('SpotTradeLiveComparisonPanel', () => {
  it('並排每個標的的回測與實盤，說明重演不計成本與整份策略的滑點', () => {
    const wrapper = mountPanel({ comparison: comparison() })

    expect(wrapper.get('[data-testid="comparison-cost-note"]').text()).toBe('現貨不設手續費率，重演不計成本')
    expect(wrapper.get('[data-testid="comparison-strategy-slippage"]').text()).toContain('0.10%')
    expect(wrapper.get('[data-testid="comparison-row-2330"]').text()).toContain('比回測低 12 個百分點')
    expect(wrapper.get('[data-testid="comparison-row-2317"]').text()).toContain('行情不夠，無法重演')
  })

  it('挑一份策略交給上層；重演中與失敗各說一句', async () => {
    const strategy = { id: 7, name: '台股均線' } as TradingStrategyDto
    const wrapper = mountPanel({ tradingStrategies: [strategy] })

    await wrapper.get('[data-testid="comparison-strategy"]').setValue('7')
    await wrapper.get('[data-testid="comparison-strategy"]').setValue('')

    expect(wrapper.emitted('update:selectedTradingStrategyId')).toEqual([[7], [null]])
    expect(mountPanel({ replaying: true }).find('[data-testid="comparison-replaying"]').exists()).toBe(true)
    expect(mountPanel({ failureMessage: '找不到' }).get('[data-testid="comparison-failure"]').text()).toBe('找不到')
  })

  it('沒有已平倉實單時只說明', () => {
    const empty = new SpotTradeLiveComparisonDomain(new SpotTradeLiveComparison('台股均線', false, [], null, 0)).toDto()

    const wrapper = mountPanel({ comparison: empty, selectedTradingStrategyId: 7 })

    expect(wrapper.get('[data-testid="comparison-notice"]').text()).toBe('還沒有已平倉的實單可以對照')
    expect(wrapper.find('[data-testid="comparison-table"]').exists()).toBe(false)
  })
})
