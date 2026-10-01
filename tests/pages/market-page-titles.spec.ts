import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import SpotKCandleBrowsePage from '~/pages/k-candles/index.vue'
import SpotKCandleChartPage from '~/pages/k-candles/chart.vue'
import ContractKCandleBrowsePage from '~/pages/contract-k-candles/index.vue'
import ContractKCandleChartPage from '~/pages/contract-k-candles/chart.vue'
import { buildTimeZone } from '../fixtures/time-zone'
import { onADesktop } from '../fixtures/layout-density'
import { createDisplayLanguageI18n } from '~/locales/create-display-language-i18n'

// 頁面只做接線，這裡只看一件事：每一個看行情的畫面，名字都說出它看的是哪一條線。
// 標題由 console 版型讀 definePageMeta 畫出來，所以這裡攔下頁面宣告的那一份來看；
// 往下接的有機體換成替身——它們各自有自己的測試。
const declaredMeta = vi.hoisted(() => [] as { layout?: string, consoleTitleKey?: string }[])

mockNuxtImport('definePageMeta', () => (meta: { layout?: string, consoleTitleKey?: string }) => {
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
  // 頁面宣告的是語言目錄的鍵，版型才照目前的語言把它說成字。
  const { global: translation } = createDisplayLanguageI18n()

  it.each([
    ['現貨 K 線瀏覽', 'Spot K-candle browsing', SpotKCandleBrowsePage],
    ['現貨 K 線圖表', 'Spot K-candle chart', SpotKCandleChartPage],
    ['合約 K 線瀏覽', 'Contract K-candle browsing', ContractKCandleBrowsePage],
    ['合約 K 線圖表', 'Contract K-candle chart', ContractKCandleChartPage],
  ])('標題是「%s」，英文是「%s」', (traditionalChineseTitle, englishTitle, page) => {
    declaredMeta.length = 0
    mount(page, { global: { stubs: PANEL_STUBS } })

    const [meta] = declaredMeta
    expect(meta?.layout).toBe('console')
    expect(translation.t(meta?.consoleTitleKey ?? '', {}, { locale: 'zh-TW' })).toBe(traditionalChineseTitle)
    expect(translation.t(meta?.consoleTitleKey ?? '', {}, { locale: 'en' })).toBe(englishTitle)
  })
})
