import Decimal from 'decimal.js'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ContractTradePrefillBanner from '~/components/molecules/ContractTradePrefillBanner.vue'
import { ContractTradePrefillDomain } from '~/domain/models/domains/contract-trade-prefill-domain'
import { ContractTradePrefill } from '~/domain/models/entities/contract-trade-prefill'

function prefillWithoutReferencePrice() {
  return new ContractTradePrefillDomain(new ContractTradePrefill(
    'link-412', 'newTrade', null, 'BTC 趨勢跟隨', 412, new Date('2026-09-25T06:00:00Z'), 'BTCUSDT', 'long',
    new Decimal(10), null, null, null, null, null, null)).toDto()
}

describe('ContractTradePrefillBanner', () => {
  it('舊的一輪沒有參考價時不寫參考價，並說明', () => {
    const wrapper = mount(ContractTradePrefillBanner, {
      props: { prefill: prefillWithoutReferencePrice(), message: '這一輪沒有記下參考價，請手動填寫進場價與數量', timeZoneIdentifier: 'UTC' },
    })

    expect(wrapper.get('[data-testid="prefill-source"]').text()).not.toContain('參考價')
    expect(wrapper.get('[data-testid="prefill-message"]').text()).toContain('沒有記下參考價')
  })

  it('找不到那一輪時只有說明與前往交易日誌，沒有來源', () => {
    const wrapper = mount(ContractTradePrefillBanner, {
      props: { prefill: null, message: '找不到這一輪。這一輪的建議已不在紀錄中，請手動填寫。', showJournalLink: true, timeZoneIdentifier: 'UTC' },
      global: { stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
    })

    expect(wrapper.find('[data-testid="prefill-source"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="prefill-message"]').text()).toContain('找不到這一輪')
    expect(wrapper.get('[data-testid="prefill-go-journal"]').attributes('href')).toBe('/contract-trade-journal')
  })

  it('有來源沒有說明時不出現說明', () => {
    const wrapper = mount(ContractTradePrefillBanner, { props: { prefill: prefillWithoutReferencePrice(), timeZoneIdentifier: 'UTC' } })

    expect(wrapper.find('[data-testid="prefill-message"]').exists()).toBe(false)
  })
})
