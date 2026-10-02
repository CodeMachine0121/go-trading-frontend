// @vitest-environment nuxt
// 版型取用的是跨畫面共用的狀態與路由，需要 Nuxt runtime。
import { mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ConsoleLayoutPage from '~/layouts/console.vue'
import MarketSwitch from '~/components/molecules/MarketSwitch.vue'

const { rawRoute, navigations } = vi.hoisted(() => ({
  rawRoute: { path: '/k-candles/chart', fullPath: '/k-candles/chart', meta: {} as Record<string, string> },
  navigations: [] as string[],
}))
mockNuxtImport('useRoute', () => () => reactive(rawRoute))
// 側欄那顆燈會真的去敲後端；這裡只看版型的接線，換成一個還沒檢查過的燈。
mockNuxtImport('useBackendHealth', () => () => ({
  health: ref(null), checking: ref(false), errorMessage: ref(null), checkBackendHealth: vi.fn(),
}))
mockNuxtImport('navigateTo', () => (path: string) => {
  navigations.push(path)
})

describe('console 版型的現貨／合約開關', () => {
  beforeEach(() => {
    clearNuxtState()
    navigations.length = 0
  })

  it('按下開關是在同一個操作台裡換頁（client-side），不是整頁重新載入', async () => {
    const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => {})
    const wrapper = mount(ConsoleLayoutPage, {
      global: { stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
    })

    wrapper.getComponent(MarketSwitch).vm.$emit('navigate', '/contract-k-candles/chart')
    await nextTick()

    expect(navigations).toEqual(['/contract-k-candles/chart'])
    expect(reload).not.toHaveBeenCalled()
  })
})

describe('console 版型的頁面標題', () => {
  beforeEach(() => {
    clearNuxtState()
    rawRoute.meta = { consoleTitleKey: 'marketData.pages.spotKCandles.title' }
  })

  afterEach(() => {
    rawRoute.meta = {}
  })

  it.each([
    { language: 'zh-TW' as const, expected: '現貨 K 線瀏覽' },
    { language: 'en' as const, expected: 'Spot K-candle browsing' },
  ])('頂列與瀏覽器分頁的標題在 $language 都是「$expected」', async ({ language, expected }) => {
    const wrapper = mount(ConsoleLayoutPage, {
      global: { stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
    })

    wrapper.vm.$i18n.locale = language
    await nextTick()
    await vi.waitFor(() => expect(document.title).toBe(expected))

    expect(wrapper.get('h1').text()).toBe(expected)
  })
})
