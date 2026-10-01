import Decimal from 'decimal.js'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import TradePrefillBanner from '~/components/molecules/TradePrefillBanner.vue'
import { ContractTradePrefillDomain } from '~/domain/models/domains/contract-trade-prefill-domain'
import { ContractTradePrefill } from '~/domain/models/entities/contract-trade-prefill'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

function prefillWithoutReferencePrice() {
  return new ContractTradePrefillDomain(new ContractTradePrefill(
    'link-412', 'newTrade', null, 'BTC 趨勢跟隨', 412, new Date('2026-09-25T06:00:00Z'), 'BTCUSDT', 'long',
    new Decimal(10), null, null, null, null, null, null)).toDto()
}

describe('TradePrefillBanner', () => {
  it('舊的一輪沒有參考價時不寫參考價，並說明', () => {
    const wrapper = mount(TradePrefillBanner, {
      props: { source: prefillWithoutReferencePrice().toSourceDto(), journalPath: '/contract-trade-journal', message: new LocalizedTextVo('這一輪沒有記下參考價，請手動填寫進場價與數量', 'This run did not record a reference price'), timeZoneIdentifier: 'UTC' },
    })

    expect(wrapper.get('[data-testid="prefill-source"]').text()).not.toContain('參考價')
    expect(wrapper.get('[data-testid="prefill-message"]').text()).toContain('沒有記下參考價')
  })

  it('找不到那一輪時只有說明與前往交易日誌，沒有來源', () => {
    const wrapper = mount(TradePrefillBanner, {
      props: { source: null, journalPath: '/contract-trade-journal', message: new LocalizedTextVo('找不到這一輪。這一輪的建議已不在紀錄中，請手動填寫。', 'This run could not be found.'), showJournalLink: true, timeZoneIdentifier: 'UTC' },
      global: { stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
    })

    expect(wrapper.find('[data-testid="prefill-source"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="prefill-message"]').text()).toContain('找不到這一輪')
    expect(wrapper.get('[data-testid="prefill-go-journal"]').attributes('href')).toBe('/contract-trade-journal')
  })

  it('寫出這一輪的方向或信號與提示', () => {
    const wrapper = mount(TradePrefillBanner, { props: { source: prefillWithoutReferencePrice().toSourceDto(), journalPath: '/contract-trade-journal', timeZoneIdentifier: 'UTC' } })

    expect(wrapper.get('[data-testid="prefill-source"]').text()).toContain('來自 BTC 趨勢跟隨・第 412 輪')
    expect(wrapper.text()).toContain('開倉價與數量請改成實際成交')
  })

  it('英文畫面上說明與前往交易日誌跟著換', async () => {
    const wrapper = mount(TradePrefillBanner, {
      props: { source: null, journalPath: '/contract-trade-journal', message: new LocalizedTextVo('找不到這一輪。這一輪的建議已不在紀錄中，請手動填寫。', 'This run could not be found.'), showJournalLink: true, timeZoneIdentifier: 'UTC' },
      global: { stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
    })

    wrapper.vm.$i18n.locale = 'en'
    await nextTick()

    expect(wrapper.get('[data-testid="prefill-message"]').text()).toContain('This run could not be found.')
    expect(wrapper.get('[data-testid="prefill-go-journal"]').text()).toBe('Go to trade journal')
  })

  it('有來源沒有說明時不出現說明', () => {
    const wrapper = mount(TradePrefillBanner, { props: { source: prefillWithoutReferencePrice().toSourceDto(), journalPath: '/contract-trade-journal', timeZoneIdentifier: 'UTC' } })

    expect(wrapper.find('[data-testid="prefill-message"]').exists()).toBe(false)
  })
})
