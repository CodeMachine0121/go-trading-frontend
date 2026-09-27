import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SpotTradeFillLedgerPanel from '~/components/organisms/SpotTradeFillLedgerPanel.vue'
import { buildSpotRecord } from '../../fixtures/spot-trade-journal'

function mountPanel(recordOverrides: Record<string, unknown> = {}) {
  const record = buildSpotRecord(recordOverrides).toDomain().toDto()

  return mount(SpotTradeFillLedgerPanel, {
    props: { fills: record.fills, canEditFills: record.canEditFills, timeZoneIdentifier: 'UTC' },
  })
}

describe('SpotTradeFillLedgerPanel', () => {
  it('每一筆寫出買進或賣出、價格數量與手續費；平倉後不能改', () => {
    const wrapper = mountPanel()

    expect(wrapper.get('[data-testid="detail-fill-1"]').text()).toContain('買進')
    expect(wrapper.get('[data-testid="detail-fill-1"]').text()).toContain('1,050 × 1000')
    expect(wrapper.get('[data-testid="detail-fill-2"]').text()).toContain('手續費 1,983.00')
    expect(wrapper.find('[data-testid="detail-fill-edit"]').exists()).toBe(false)
  })

  it('持有中可以修改一筆、取消、或刪除', async () => {
    const wrapper = mountPanel({ status: 'open', closedAt: null })

    await wrapper.get('[data-testid="detail-fill-1"] [data-testid="detail-fill-edit"]').trigger('click')
    await wrapper.get('[data-testid="detail-fill-price"]').setValue('1051')
    await wrapper.get('[data-testid="detail-fill-quantity"]').setValue('900')
    await wrapper.get('[data-testid="detail-fill-fee"]').setValue('100')
    await wrapper.get('[data-testid="detail-fill-save"]').trigger('click')
    await wrapper.get('[data-testid="detail-fill-cancel"]').trigger('click')
    await wrapper.get('[data-testid="detail-fill-2"] [data-testid="detail-fill-remove"]').trigger('click')

    expect(wrapper.emitted('amendFill')?.[0]?.slice(1)).toEqual(['1051', '900', '100'])
    expect(wrapper.emitted('removeFill')?.[0]).toEqual([2])
    expect(wrapper.find('[data-testid="detail-fill-price"]').exists()).toBe(false)
  })

  it('換了一批買賣就收起正在修改的那一筆', async () => {
    const wrapper = mountPanel({ status: 'open', closedAt: null })
    await wrapper.get('[data-testid="detail-fill-1"] [data-testid="detail-fill-edit"]').trigger('click')

    await wrapper.setProps({ fills: buildSpotRecord({ status: 'open', closedAt: null }).toDomain().toDto().fills })

    expect(wrapper.find('[data-testid="detail-fill-price"]').exists()).toBe(false)
  })
})
