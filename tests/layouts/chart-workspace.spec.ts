// @vitest-environment nuxt
// 版型取用的是跨畫面共用的狀態與路由，需要 Nuxt runtime。
import { mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ChartWorkspaceLayoutPage from '~/layouts/chart-workspace.vue'
import { SignedInUserDto } from '~/domain/models/dto/signed-in-user-dto'
import { AppearanceDto } from '~/domain/models/dto/appearance-dto'

const { rawRoute, openedAssistant } = vi.hoisted(() => ({
  rawRoute: { path: '/contract-k-candles/chart', fullPath: '/contract-k-candles/chart', meta: {} as Record<string, string> },
  openedAssistant: { count: 0 },
}))
mockNuxtImport('useRoute', () => () => reactive(rawRoute))
mockNuxtImport('useBackendHealth', () => () => ({
  health: ref(null), checking: ref(false), errorMessage: ref(null), checkBackendHealth: vi.fn(),
}))
mockNuxtImport('useUserSession', () => () => ({
  currentUser: ref(new SignedInUserDto(1, 'trader@example.com', true, null)), signOut: vi.fn(),
}))
mockNuxtImport('useAppearance', () => () => ({
  appearance: ref(new AppearanceDto('system', 'dark', [])), selectAppearance: vi.fn(),
}))
mockNuxtImport('useAssistantDrawer', () => () => ({
  openDrawer: () => {
    openedAssistant.count += 1
  },
}))

const NUXT_LINK_STUB = { NuxtLink: { props: ['to'], template: '<a :href="to" @click="$emit(\'click\')"><slot /></a>' } }

function mountLayout() {
  return mount(ChartWorkspaceLayoutPage, {
    slots: { default: '<div data-testid="page">圖</div>' },
    global: { stubs: NUXT_LINK_STUB },
  })
}

describe('看盤工作區版型', () => {
  beforeEach(() => {
    clearNuxtState()
    openedAssistant.count = 0
    rawRoute.fullPath = '/contract-k-candles/chart'
  })

  it('沒有頂欄與側欄：只有頁面本身，主選單收著', () => {
    const wrapper = mountLayout()

    expect(wrapper.get('[data-testid="page"]').text()).toBe('圖')
    expect(wrapper.find('[data-testid="chart-workspace-menu"]').exists()).toBe(false)
  })

  it('打開主選單：列出每一個去處，人在合約圖表上時「行情圖表」亮著', async () => {
    const wrapper = mountLayout()

    useChartWorkspaceMenu().openMenu()
    await nextTick()

    const chartLink = wrapper.get('[data-testid="menu-destination-/k-candles/chart"]')
    expect(chartLink.attributes('aria-current')).toBe('page')
    expect(wrapper.find('[data-testid="menu-destination-/settings"]').exists()).toBe(true)
  })

  it('主選單裡有共用設定與連線燈', async () => {
    const wrapper = mountLayout()

    useChartWorkspaceMenu().openMenu()
    await nextTick()

    expect(wrapper.find('[data-testid="display-language-select"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="time-zone-select"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="appearance-toggle"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="open-assistant"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="backend-status"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="signed-in-email"]').text()).toBe('trader@example.com')
  })

  it.each([
    ['點選單外面', '[data-testid="chart-workspace-menu-backdrop"]'],
    ['按關閉', '[data-testid="close-workspace-menu"]'],
    ['選一個去處', '[data-testid="menu-destination-/strategy-scripts"]'],
  ])('%s：主選單收起', async (_, selector) => {
    const wrapper = mountLayout()
    useChartWorkspaceMenu().openMenu()
    await nextTick()

    await wrapper.get(selector).trigger('click')

    expect(wrapper.find('[data-testid="chart-workspace-menu"]').exists()).toBe(false)
  })

  it('按 Esc：主選單收起', async () => {
    const wrapper = mountLayout()
    useChartWorkspaceMenu().openMenu()
    await nextTick()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    expect(wrapper.find('[data-testid="chart-workspace-menu"]').exists()).toBe(false)
  })

  it('換了頁：主選單收起', async () => {
    const wrapper = mountLayout()
    useChartWorkspaceMenu().openMenu()
    await nextTick()

    reactive(rawRoute).fullPath = '/strategy-scripts'
    await nextTick()

    expect(wrapper.find('[data-testid="chart-workspace-menu"]').exists()).toBe(false)
  })

  it('按助手：主選單收起、助手打開', async () => {
    const wrapper = mountLayout()
    useChartWorkspaceMenu().openMenu()
    await nextTick()

    await wrapper.get('[data-testid="open-assistant"]').trigger('click')

    expect(openedAssistant.count).toBe(1)
    expect(wrapper.find('[data-testid="chart-workspace-menu"]').exists()).toBe(false)
  })
})
