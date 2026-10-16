import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import SpotKCandleChartPage from '~/pages/k-candles/chart.vue'
import ContractKCandleChartPage from '~/pages/contract-k-candles/chart.vue'
import MarketSwitch from '~/components/molecules/MarketSwitch.vue'
import { MarketCounterpartDto } from '~/domain/models/dto/market-counterpart-dto'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { buildTimeZone } from '../fixtures/time-zone'

// 頁面只做接線，這裡只看兩件事：現貨／合約開關放進了看盤工作區的上方細邊，
// 以及工作區要打開主選單時，頁面把它交給版型那一份共用的開關。
const { navigations, openedMenu } = vi.hoisted(() => ({ navigations: [] as string[], openedMenu: { count: 0 } }))

mockNuxtImport('definePageMeta', () => () => {})
mockNuxtImport('useRoute', () => () => ({ path: '/k-candles/chart' }))
mockNuxtImport('navigateTo', () => (path: string) => {
  navigations.push(path)
})
mockNuxtImport('useNuxtApp', () => () => ({
  $marketCounterpartApplication: {
    describeCounterpart: () => new MarketCounterpartDto('spot', '/contract-k-candles/chart', new LocalizedTextVo('切到合約', 'Switch to contract')),
  },
}))
mockNuxtImport('useSelectedTimeZone', () => () => ({ selectedTimeZone: buildTimeZone('UTC') }))
mockNuxtImport('useChartWorkspaceMenu', () => () => ({
  openMenu: () => {
    openedMenu.count += 1
  },
}))

/** 面板的替身：照樣把頁面給的那一格現貨／合約開關畫出來，並能像使用者按了主選單那樣發出要求。 */
const PANEL_STUB = {
  emits: ['openMenu'],
  template: '<section><slot name="market" /><button data-testid="panel-open-menu" @click="$emit(\'openMenu\')" /></section>',
}

describe.each([
  ['現貨', SpotKCandleChartPage, 'KCandleChartPanel'],
  ['合約', ContractKCandleChartPage, 'KCandleContractChartPanel'],
])('%s K 線圖表頁', (_, page, panelName) => {
  it('上方細邊有現貨／合約開關，按下去換到另一邊', async () => {
    navigations.length = 0
    const wrapper = mount(page, { global: { stubs: { [panelName]: PANEL_STUB } } })

    wrapper.getComponent(MarketSwitch).vm.$emit('navigate', '/contract-k-candles/chart')

    expect(navigations).toEqual(['/contract-k-candles/chart'])
  })

  it('工作區要打開主選單：交給版型那一份共用的開關', async () => {
    openedMenu.count = 0
    const wrapper = mount(page, { global: { stubs: { [panelName]: PANEL_STUB } } })

    await wrapper.get('[data-testid="panel-open-menu"]').trigger('click')

    expect(openedMenu.count).toBe(1)
  })
})
