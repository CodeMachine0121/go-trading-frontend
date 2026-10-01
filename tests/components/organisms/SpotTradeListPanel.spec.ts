import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import SpotTradeListPanel from '~/components/organisms/SpotTradeListPanel.vue'
import { SpotTradeListDomain } from '~/domain/models/domains/spot-trade-list-domain'
import { SpotTradeListFilterDto } from '~/domain/models/dto/spot-trade-list-filter-dto'
import { measured } from '../../fixtures/contract-trade-journal'
import { buildSpotRecord, closedSpotOutcome, spotStatistics } from '../../fixtures/spot-trade-journal'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

const STUBS = { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } }

function listOf(records = [
  buildSpotRecord(),
  buildSpotRecord({ id: 6, symbol: 'BTCUSDT', market: 'crypto', status: 'open', closedAt: null, outcome: closedSpotOutcome({ floatingProfit: measured('12.5'), averageSellPrice: null }) }),
]) {
  return new SpotTradeListDomain(records, spotStatistics(), new SpotTradeListFilterDto()).toDto()
}

function mountPanel(props: Record<string, unknown> = {}) {
  return mount(SpotTradeListPanel, {
    props: { statusFilter: 'all', sourceFilter: 'all', marketFilter: 'all', symbolFilter: '', list: listOf(), ...props },
    global: { stubs: STUBS },
  })
}

describe('SpotTradeListPanel', () => {
  it('頂上說出期間與筆數，摘要依市場，每一列連到那一筆並標出市場', () => {
    const wrapper = mountPanel()

    expect(wrapper.get('[data-testid="trade-list-counts"]').text()).toBe('最近 30 天・已平倉 10 筆・持有中 1 筆')
    expect(wrapper.get('[data-testid="trade-list-summary-台股"]').text()).toContain('+120,000.00')
    expect(wrapper.find('[data-testid="trade-list-summary-加密貨幣"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="trade-row-5"] a').attributes('href')).toBe('/spot-trade-journal/5')
    expect(wrapper.get('[data-testid="trade-row-5"]').text()).toContain('+6.47%')
    expect(wrapper.get('[data-testid="trade-row-6"]').text()).toContain('加密貨幣')
    expect(wrapper.get('[data-testid="trade-row-6"]').text()).toContain('浮')
  })

  it('英文畫面上期間、筆數、欄名與市場都換成英文', async () => {
    const wrapper = mountPanel()

    wrapper.vm.$i18n.locale = 'en'
    await nextTick()

    expect(wrapper.get('[data-testid="trade-list-counts"]').text()).toBe('Last 30 days · 10 closed · 1 open')
    expect(wrapper.text()).toContain('Avg buy price')
    expect(wrapper.get('[data-testid="trade-row-6"]').text()).toContain('Crypto')
    expect(wrapper.get('[data-testid="pending-review"]').text()).toBe('To review 1')
  })

  it('待檢討一眼看得到，點了交給上層', async () => {
    const wrapper = mountPanel()

    await wrapper.get('[data-testid="pending-review"]').trigger('click')

    expect(wrapper.get('[data-testid="pending-review"]').text()).toBe('待檢討 1')
    expect(wrapper.emitted('showPendingReview')).toHaveLength(1)
  })

  it('切換狀態、來源、市場與標的篩選', async () => {
    const wrapper = mountPanel()

    await wrapper.get('[data-testid="status-filter"] button:nth-child(2)').trigger('click')
    await wrapper.get('[data-testid="source-filter"] button:nth-child(3)').trigger('click')
    await wrapper.get('[data-testid="market-filter"] button:nth-child(3)').trigger('click')
    await wrapper.get('[data-testid="symbol-filter"]').setValue('2330')

    expect(wrapper.emitted('update:statusFilter')?.[0]).toEqual(['open'])
    expect(wrapper.emitted('update:sourceFilter')?.[0]).toEqual(['selfJudged'])
    expect(wrapper.emitted('update:marketFilter')?.[0]).toEqual(['crypto'])
    expect(wrapper.emitted('update:symbolFilter')?.[0]).toEqual(['2330'])
  })

  it('讀取中、連不上可重試、沒有交易時說明', async () => {
    expect(mountPanel({ list: null, loading: true }).find('[data-testid="trade-list-loading"]').exists()).toBe(true)

    const failed = mountPanel({ list: null, failureMessage: new UntranslatedTextVo('連不上交易服務') })
    await failed.get('[data-testid="trade-list-retry"]').trigger('click')
    expect(failed.get('[data-testid="trade-list-failure"]').text()).toContain('連不上交易服務')
    expect(failed.emitted('retry')).toHaveLength(1)

    expect(mountPanel({ list: listOf([]) }).get('[data-testid="trade-list-empty"]').text()).toContain('還沒有任何現貨交易')
  })
})
