import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import ContractTradeListPanel from '~/components/organisms/ContractTradeListPanel.vue'
import { ContractTradeListDomain } from '~/domain/models/domains/contract-trade-list-domain'
import { ContractTradeListFilterDto } from '~/domain/models/dto/contract-trade-list-filter-dto'
import { buildStatistics, buildSummary, measured } from '../../fixtures/contract-trade-journal'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

const STUBS = { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } }

function listOf(summaries = [buildSummary(), buildSummary({ id: 32, status: 'open', netProfit: null, averageExitPrice: null, floatingProfit: measured('38.2') })], closedTradeCount = 30) {
  return new ContractTradeListDomain(summaries, buildStatistics({ closedTradeCount }), new ContractTradeListFilterDto()).toDto()
}

function mountPanel(props: Record<string, unknown> = {}) {
  return mount(ContractTradeListPanel, {
    props: { statusFilter: 'all', sourceFilter: 'all', symbolFilter: '', list: listOf(), ...props },
    global: { stubs: STUBS },
  })
}

describe('ContractTradeListPanel', () => {
  it('頂上說出期間與筆數，摘要五格，每一列連到那一筆', () => {
    const wrapper = mountPanel()

    expect(wrapper.get('[data-testid="trade-list-counts"]').text()).toBe('最近 30 天・已平倉 30 筆・持倉中 1 筆')
    expect(wrapper.get('[data-testid="trade-list-summary"]').text()).toContain('+1,284.60')
    expect(wrapper.get('[data-testid="trade-list-summary"]').text()).toContain('14 勝 16 敗')
    expect(wrapper.get('[data-testid="trade-row-27"] a').attributes('href')).toBe('/contract-trade-journal/27')
    expect(wrapper.get('[data-testid="trade-row-32"]').text()).toContain('浮')
  })

  it('待檢討一眼看得到，點了只列出那幾筆', async () => {
    const wrapper = mountPanel()

    await wrapper.get('[data-testid="pending-review"]').trigger('click')

    expect(wrapper.get('[data-testid="pending-review"]').text()).toBe('待檢討 1')
    expect(wrapper.emitted('showPendingReview')).toHaveLength(1)
  })

  it('一筆都沒有時說明兩種記法，摘要不出現', () => {
    const wrapper = mountPanel({ list: listOf([], 0) })

    expect(wrapper.get('[data-testid="trade-list-empty"]').text()).toContain('記到交易日誌')
    expect(wrapper.find('[data-testid="trade-list-summary"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="pending-review"]').exists()).toBe(false)
  })

  it('讀取中不先閃空狀態', () => {
    const wrapper = mountPanel({ list: null, loading: true })

    expect(wrapper.find('[data-testid="trade-list-loading"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="trade-list-empty"]').exists()).toBe(false)
  })

  it('連不上時整塊說明並提供重試，不呈現空狀態', async () => {
    const wrapper = mountPanel({ list: null, failureMessage: new UntranslatedTextVo('連不上交易服務') })

    await wrapper.get('[data-testid="trade-list-retry"]').trigger('click')

    expect(wrapper.get('[data-testid="trade-list-failure"]').text()).toContain('連不上交易服務')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('依狀態、來源與合約標的篩選', async () => {
    const wrapper = mountPanel()

    await wrapper.get('[data-testid="status-filter"]').findAll('button').find(button => button.text() === '持倉中')!.trigger('click')
    await wrapper.get('[data-testid="source-filter"]').findAll('button').find(button => button.text() === '自行判斷')!.trigger('click')
    await wrapper.get('[data-testid="symbol-filter"]').setValue('BTCUSDT')

    expect(wrapper.emitted('update:statusFilter')).toEqual([['open']])
    expect(wrapper.emitted('update:sourceFilter')).toEqual([['selfJudged']])
    expect(wrapper.emitted('update:symbolFilter')).toEqual([['BTCUSDT']])
  })

  it('換成英文時期間、筆數、欄名、篩選與每一列的方向狀態都說英文', async () => {
    const wrapper = mountPanel()

    wrapper.vm.$i18n.locale = 'en'
    await nextTick()

    expect(wrapper.get('[data-testid="trade-list-counts"]').text()).toBe('Last 30 days · 30 closed · 1 open')
    expect(wrapper.get('[data-testid="status-filter"]').text()).toContain('Reviewed')
    expect(wrapper.get('[data-testid="source-filter"]').text()).toContain('Self-judged')
    expect(wrapper.get('thead').text()).toContain('Avg entry')
    expect(wrapper.get('[data-testid="trade-row-27"]').text()).toContain('Long 10x')
    expect(wrapper.get('[data-testid="trade-row-32"]').text()).toContain('unrealized')
  })
})
