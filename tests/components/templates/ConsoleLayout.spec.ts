// @vitest-environment nuxt
// 樣板記著「側欄收起來了沒有」，而那份記憶要跨畫面活著（`useState`）——需要 Nuxt runtime 才問得到它。
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ConsoleLayout from '~/components/templates/ConsoleLayout.vue'

const { rawRoute } = vi.hoisted(() => ({ rawRoute: { path: '/login', fullPath: '/login' } }))
mockNuxtImport('useRoute', () => () => reactive(rawRoute))

function stopAt(path: string) {
  const route = reactive(rawRoute)
  route.path = path
  route.fullPath = path
}

const DESKTOP = 1280
const PHONE = 390

const LINK_STUB = { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } }

async function mountLayoutAt(
  width: number,
  slots: Record<string, string> = {},
  destinationPaths: Record<string, string> = {},
) {
  window.innerWidth = width
  const wrapper = mount(ConsoleLayout, {
    props: { title: '現貨 K 線圖表', destinationPaths },
    slots,
    global: { stubs: LINK_STUB },
  })
  await nextTick()

  return wrapper
}

describe('ConsoleLayout', () => {
  beforeEach(() => {
    clearNuxtState()
    stopAt('/k-candles/chart')
  })

  afterEach(() => {
    window.innerWidth = DESKTOP
    window.dispatchEvent(new Event('resize'))
  })

  it('呈現標題與內容', async () => {
    const wrapper = await mountLayoutAt(DESKTOP, { default: '<p data-testid="content">內容</p>' })

    expect(wrapper.get('h1').text()).toBe('現貨 K 線圖表')
    expect(wrapper.get('[data-testid="content"]').text()).toBe('內容')
  })

  it('側欄是七個去處，照這個順序，設定釘在底部', async () => {
    const wrapper = await mountLayoutAt(DESKTOP)

    const labels = wrapper.findAll('[data-testid^="destination-"]').map(link => link.text())

    expect(labels).toEqual(['行情圖表', 'K 線資料', '策略腳本', '交易策略', '策略機器人', 'Marketplace', '設定'])
  })

  it.each([
    { name: '在現貨 K 線圖表時行情圖表亮著', path: '/k-candles/chart', current: '/k-candles/chart' },
    { name: '在合約 K 線圖表時行情圖表也亮著', path: '/contract-k-candles/chart', current: '/k-candles/chart' },
    { name: '在合約 K 線瀏覽時 K 線資料亮著，行情圖表不亮', path: '/contract-k-candles', current: '/k-candles' },
    { name: '在編輯一台合約機器人時策略機器人亮著', path: '/contract-strategy-bots/7', current: '/strategy-bots' },
    { name: '在一份交易策略裡時交易策略亮著', path: '/trading-strategies/3', current: '/trading-strategies' },
  ])('$name', async ({ path, current }) => {
    stopAt(path)
    const wrapper = await mountLayoutAt(DESKTOP)

    const currentLinks = wrapper.findAll('[aria-current="page"]').map(link => link.attributes('data-testid'))

    expect(currentLinks).toEqual([`destination-${current}`])
  })

  it('側欄收得起來，走到下一個畫面時不會自己彈回來', async () => {
    const wrapper = await mountLayoutAt(DESKTOP)

    await wrapper.get('[data-testid="toggle-rail"]').trigger('click')
    stopAt('/strategy-scripts')
    await nextTick()

    expect(wrapper.classes()).toContain('console-layout--stowed')
    expect(wrapper.get('[data-testid="toggle-rail"]').attributes('aria-label')).toBe('展開側欄')
  })

  it('寬螢幕的頂列放時區、外觀與助手鍵', async () => {
    const wrapper = await mountLayoutAt(DESKTOP, {
      timezone: '<span data-testid="tz" />',
      appearance: '<span data-testid="appearance" />',
      assistant: '<span data-testid="assistant" />',
      market: '<span data-testid="market" />',
    })

    for (const testId of ['tz', 'appearance', 'assistant', 'market']) {
      expect(wrapper.find(`[data-testid="${testId}"]`).exists()).toBe(true)
    }
  })

  it('有兩邊的去處照給的對照指路，其餘去自己的那一頁', async () => {
    const wrapper = await mountLayoutAt(DESKTOP, {}, { '/k-candles/chart': '/contract-k-candles/chart' })

    expect(wrapper.get('[data-testid="destination-/k-candles/chart"]').attributes('href')).toBe('/contract-k-candles/chart')
    expect(wrapper.get('[data-testid="destination-/trading-strategies"]').attributes('href')).toBe('/trading-strategies')
  })

  describe('窄螢幕', () => {
    it('底部分頁與更多也照給的對照指路', async () => {
      const wrapper = await mountLayoutAt(PHONE, {}, {
        '/strategy-bots': '/contract-strategy-bots',
        '/k-candles': '/contract-k-candles',
      })

      await wrapper.get('[data-testid="tab-more"]').trigger('click')

      expect(wrapper.get('[data-testid="tab-/strategy-bots"]').attributes('href')).toBe('/contract-strategy-bots')
      expect(wrapper.get('[data-testid="more-/k-candles"]').attributes('href')).toBe('/contract-k-candles')
    })

    it('底部是行情、策略、機器人、助手，加一顆更多', async () => {
      const wrapper = await mountLayoutAt(PHONE)

      const tabs = wrapper.findAll('[data-testid^="tab-"]').map(tab => tab.text())

      expect(tabs).toEqual(['行情', '策略', '機器人', '助手', '更多'])
      expect(wrapper.find('[data-testid^="destination-"]').exists()).toBe(false)
    })

    it('按底部的「助手」去整頁的助手', async () => {
      const wrapper = await mountLayoutAt(PHONE)

      const assistantTab = wrapper.get('[data-testid="tab-/chat"]')

      expect(assistantTab.text()).toBe('助手')
      expect(assistantTab.attributes('href')).toBe('/chat')
    })

    it('更多裡是 K 線資料、交易策略、Marketplace、設定', async () => {
      const wrapper = await mountLayoutAt(PHONE)

      await wrapper.get('[data-testid="tab-more"]').trigger('click')

      const labels = wrapper.findAll('[data-testid^="more-"]').map(link => link.text())
      expect(labels).toEqual(['K 線資料', '交易策略', 'Marketplace', '設定'])
    })

    it('現貨／合約開關留在頂部標題列上', async () => {
      const wrapper = await mountLayoutAt(PHONE, { market: '<span data-testid="market" />' })

      expect(wrapper.find('[data-testid="market"]').exists()).toBe(true)
    })

    it.each([
      { name: '在設定畫面時「更多」亮著', path: '/settings', moreCurrent: true },
      { name: '在合約 K 線瀏覽時「更多」亮著', path: '/contract-k-candles', moreCurrent: true },
      { name: '在合約策略機器人時「機器人」亮著、「更多」不亮', path: '/contract-strategy-bots', moreCurrent: false },
    ])('$name', async ({ path, moreCurrent }) => {
      stopAt(path)
      const wrapper = await mountLayoutAt(PHONE)

      expect(wrapper.get('[data-testid="tab-more"]').classes().includes('console-layout__tab--current')).toBe(moreCurrent)
    })

    it('走到別的畫面，更多那張紙自己收起來', async () => {
      const wrapper = await mountLayoutAt(PHONE)
      await wrapper.get('[data-testid="tab-more"]').trigger('click')

      stopAt('/settings')
      await nextTick()

      expect(wrapper.get('[data-testid="tab-more"]').attributes('aria-expanded')).toBe('false')
    })
  })
})
