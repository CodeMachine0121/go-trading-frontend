import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MarketSwitch from '~/components/molecules/MarketSwitch.vue'
import { MarketCounterpartDto } from '~/domain/models/dto/market-counterpart-dto'

function mountSwitch(counterpart: MarketCounterpartDto) {
  return mount(MarketSwitch, { props: { counterpart } })
}

describe('MarketSwitch', () => {
  it.each([
    { name: '在現貨那一邊，按下去到合約的對應畫面', side: 'spot' as const, path: '/contract-k-candles/chart' },
    { name: '在合約那一邊，按下去回到現貨的對應畫面', side: 'contract' as const, path: '/k-candles/chart' },
  ])('$name', async ({ side, path }) => {
    const wrapper = mountSwitch(new MarketCounterpartDto(side, path, '切換到另一個市場的同一個畫面'))

    await wrapper.get('[role="switch"]').trigger('click')

    expect(wrapper.emitted('navigate')).toEqual([[path]])
  })

  it.each([
    { name: '在合約畫面時停在合約', side: 'contract' as const, checked: 'true' },
    { name: '在現貨畫面時停在現貨', side: 'spot' as const, checked: 'false' },
  ])('$name', ({ side, checked }) => {
    const wrapper = mountSwitch(new MarketCounterpartDto(side, '/somewhere', '切換到另一個市場的同一個畫面'))

    expect(wrapper.get('[role="switch"]').attributes('aria-checked')).toBe(checked)
  })

  it('不分現貨合約的畫面上按不動，並說明原因', async () => {
    const wrapper = mountSwitch(new MarketCounterpartDto(null, null, '這個畫面不分現貨與合約'))

    await wrapper.get('[role="switch"]').trigger('click')

    expect(wrapper.emitted('navigate')).toBeUndefined()
    expect(wrapper.get('[role="switch"]').attributes('aria-disabled')).toBe('true')
    expect(wrapper.get('[role="switch"]').attributes('title')).toBe('這個畫面不分現貨與合約')
  })
})
