import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import SpotKCandleBrowsePage from '~/pages/k-candles/index.vue'
import SpotKCandleChartPage from '~/pages/k-candles/chart.vue'
import ContractKCandleBrowsePage from '~/pages/contract-k-candles/index.vue'
import ContractKCandleChartPage from '~/pages/contract-k-candles/chart.vue'
import { buildTimeZone } from '../fixtures/time-zone'
import { onADesktop } from '../fixtures/layout-density'

// 頁面只做接線，這裡只看一件事：每一個看行情的畫面，名字都說出它看的是哪一條線。
// 往下接的有機體與時區、連線燈、登入身分都換成替身——它們各自有自己的測試。
mockNuxtImport('useNuxtApp', () => () => ({}))
mockNuxtImport('useSelectedTimeZone', () => () => ({
  selectableTimeZones: [], selectedTimeZone: buildTimeZone('UTC'), selectTimeZone: () => {},
}))
mockNuxtImport('useBackendHealth', () => () => ({
  health: null, checking: false, errorMessage: null, checkBackendHealth: () => {},
}))
mockNuxtImport('useUserSession', () => () => ({ currentUser: null, signOut: () => {} }))
mockNuxtImport('useLayoutDensity', () => () => ({ layoutDensity: onADesktop() }))

const LAYOUT_STUB = { props: ['title', 'subtitle'], template: '<h1>{{ title }}</h1>' }

describe('看行情的四個畫面', () => {
  it.each([
    ['現貨 K 線瀏覽', SpotKCandleBrowsePage],
    ['現貨 K 線圖表', SpotKCandleChartPage],
    ['合約 K 線瀏覽', ContractKCandleBrowsePage],
    ['合約 K 線圖表', ContractKCandleChartPage],
  ])('標題是「%s」', (expectedTitle, page) => {
    const wrapper = mount(page, { global: { stubs: { ConsoleLayout: LAYOUT_STUB } } })

    expect(wrapper.get('h1').text()).toBe(expectedTitle)
  })
})
