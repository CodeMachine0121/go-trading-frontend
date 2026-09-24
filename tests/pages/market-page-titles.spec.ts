import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import SpotKCandleBrowsePage from '~/pages/k-candles/index.vue'
import SpotKCandleChartPage from '~/pages/k-candles/chart.vue'
import ContractKCandleBrowsePage from '~/pages/contract-k-candles/index.vue'
import ContractKCandleChartPage from '~/pages/contract-k-candles/chart.vue'
import { buildTimeZone } from '../fixtures/time-zone'
import { onADesktop } from '../fixtures/layout-density'

// 頁面只做接線，這裡只看一件事：每一個看行情的畫面，名字都說出它看的是哪一條線。
// 標題由 console 版型讀 definePageMeta 畫出來，所以這裡攔下頁面宣告的那一份來看；
// 往下接的有機體換成替身——它們各自有自己的測試。
const declaredMeta = vi.hoisted(() => [] as { layout?: string, consoleTitle?: string }[])

mockNuxtImport('definePageMeta', () => (meta: { layout?: string, consoleTitle?: string }) => {
  declaredMeta.push(meta)
})
mockNuxtImport('useNuxtApp', () => () => ({}))
mockNuxtImport('useSelectedTimeZone', () => () => ({
  selectableTimeZones: [], selectedTimeZone: buildTimeZone('UTC'), selectTimeZone: () => {},
}))
mockNuxtImport('useLayoutDensity', () => () => ({ layoutDensity: onADesktop() }))

const PANEL_STUBS = {
  KCandleSearchPanel: true,
  KCandleContractSearchPanel: true,
  KCandleChartPanel: true,
  KCandleContractChartPanel: true,
}

describe('看行情的四個畫面', () => {
  it.each([
    ['現貨 K 線瀏覽', SpotKCandleBrowsePage],
    ['現貨 K 線圖表', SpotKCandleChartPage],
    ['合約 K 線瀏覽', ContractKCandleBrowsePage],
    ['合約 K 線圖表', ContractKCandleChartPage],
  ])('標題是「%s」', (expectedTitle, page) => {
    declaredMeta.length = 0
    mount(page, { global: { stubs: PANEL_STUBS } })

    expect(declaredMeta).toEqual([expect.objectContaining({ layout: 'console', consoleTitle: expectedTitle })])
  })
})
