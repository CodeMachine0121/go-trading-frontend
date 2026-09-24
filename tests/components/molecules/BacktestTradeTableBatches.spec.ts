import Decimal from 'decimal.js'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BacktestTradeTable from '~/components/molecules/BacktestTradeTable.vue'
import { ClosedTradeDto } from '~/domain/models/dto/closed-trade-dto'
import { buildTimeZone } from '../../fixtures/time-zone'

function tradesOf(tradeCount: number): ClosedTradeDto[] {
  return Array.from({ length: tradeCount }, (_, tradeIndex) => new ClosedTradeDto(
    '做多', new Date(tradeIndex * 60_000), '100', new Date(tradeIndex * 60_000 + 30_000), '101',
    new Decimal(1).toFixed(2), 'positive', '訊號', '0.00', '0.00'))
}

describe('BacktestTradeTable 分批顯示', () => {
  it('一千筆先顯示兩百筆，並說出顯示了幾筆、共幾筆', () => {
    const wrapper = mount(BacktestTradeTable, {
      props: { closedTrades: tradesOf(1000), timeZone: buildTimeZone() },
    })

    expect(wrapper.findAll('tbody tr')).toHaveLength(200)
    expect(wrapper.get('[data-testid="shown-trade-count"]').text()).toBe('顯示 200 筆，共 1000 筆')
  })

  it('按再顯示更多就多一批', async () => {
    const wrapper = mount(BacktestTradeTable, {
      props: { closedTrades: tradesOf(1000), timeZone: buildTimeZone() },
    })

    await wrapper.get('[data-testid="show-more-trades-button"]').trigger('click')

    expect(wrapper.findAll('tbody tr')).toHaveLength(400)
  })

  it('不到一批時全部顯示，也沒有再顯示更多', () => {
    const wrapper = mount(BacktestTradeTable, {
      props: { closedTrades: tradesOf(150), timeZone: buildTimeZone() },
    })

    expect(wrapper.findAll('tbody tr')).toHaveLength(150)
    expect(wrapper.find('[data-testid="show-more-trades-button"]').exists()).toBe(false)
  })
  it('換了一次結果就從第一批重新開始', async () => {
    const wrapper = mount(BacktestTradeTable, {
      props: { closedTrades: tradesOf(1000), timeZone: buildTimeZone() },
    })
    await wrapper.get('[data-testid="show-more-trades-button"]').trigger('click')

    await wrapper.setProps({ closedTrades: tradesOf(900) })

    expect(wrapper.findAll('tbody tr')).toHaveLength(200)
  })
})
