// @vitest-environment nuxt
// 版型取用的是跨畫面共用的狀態與路由，需要 Nuxt runtime。
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ConsoleLayoutPage from '~/layouts/console.vue'
import MarketSwitch from '~/components/molecules/MarketSwitch.vue'

const { rawRoute, navigations } = vi.hoisted(() => ({
  rawRoute: { path: '/k-candles/chart', fullPath: '/k-candles/chart', meta: {} },
  navigations: [] as string[],
}))
mockNuxtImport('useRoute', () => () => reactive(rawRoute))
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
