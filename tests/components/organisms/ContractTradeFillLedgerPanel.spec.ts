import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import ContractTradeFillLedgerPanel from '~/components/organisms/ContractTradeFillLedgerPanel.vue'
import { buildRecord } from '../../fixtures/contract-trade-journal'

function mountPanel(recordOverrides: Record<string, unknown> = {}) {
  return mount(ContractTradeFillLedgerPanel, {
    props: { record: buildRecord(recordOverrides).toDomain().toDto(), timeZoneIdentifier: 'UTC' },
  })
}

describe('ContractTradeFillLedgerPanel', () => {
  it('平倉後成交沒有修改與刪除入口', () => {
    expect(mountPanel().find('[data-testid="detail-fill-edit"]').exists()).toBe(false)
  })

  it('持倉中可以修正與刪除成交', async () => {
    const wrapper = mountPanel({ status: 'open' })

    await wrapper.get('[data-testid="detail-fill-remove"]').trigger('click')
    await wrapper.get('[data-testid="detail-fill-edit"]').trigger('click')
    await wrapper.get('[data-testid="detail-fill-price"]').setValue('97906')
    await wrapper.get('[data-testid="detail-fill-quantity"]').setValue('0.031')
    await wrapper.get('[data-testid="detail-fill-fee"]').setValue('1.2')
    await wrapper.get('[data-testid="detail-fill-save"]').trigger('click')
    await wrapper.get('[data-testid="detail-fill-cancel"]').trigger('click')

    expect(wrapper.emitted('removeFill')).toEqual([[1]])
    const [[fill, priceText, quantityText, feeText]] = wrapper.emitted('amendFill') as [[{ id: number }, string, string, string]]
    expect([fill.id, priceText, quantityText, feeText]).toEqual([1, '97906', '0.031', '1.2'])
    expect(wrapper.find('[data-testid="detail-fill-price"]').exists()).toBe(false)
  })

  it('頁面重新讀取但成交沒變時保留修改中的輸入；成交變了（剛存下修正）才收起', async () => {
    const wrapper = mountPanel({ status: 'open' })
    await wrapper.get('[data-testid="detail-fill-edit"]').trigger('click')
    await wrapper.get('[data-testid="detail-fill-price"]').setValue('97906')

    await wrapper.setProps({ record: buildRecord({ status: 'open', notes: [] }).toDomain().toDto() })

    expect((wrapper.get('[data-testid="detail-fill-price"]').element as HTMLInputElement).value).toBe('97906')

    await wrapper.setProps({ record: buildRecord({ status: 'open', fills: buildRecord().fills.slice(0, 2) }).toDomain().toDto() })

    expect(wrapper.find('[data-testid="detail-fill-price"]').exists()).toBe(false)
  })

  it('換成英文時開倉平倉、掛單吃單與費率提示都說英文', async () => {
    const wrapper = mountPanel()

    wrapper.vm.$i18n.locale = 'en'
    await nextTick()

    expect(wrapper.text()).toContain('Entries and exits')
    expect(wrapper.get('[data-testid="detail-fill-3"]').text()).toContain('Exit')
    expect(wrapper.get('[data-testid="detail-fill-3"]').text()).toContain('Maker fee')
    expect(wrapper.get('[data-testid="detail-fill-3"]').text()).toContain('Fee rate not set')
  })
})
