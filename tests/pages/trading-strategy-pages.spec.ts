import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import TradingStrategyListPage from '~/pages/trading-strategies/index.vue'
import TradingStrategyPage from '~/pages/trading-strategies/[id].vue'
import { AvailableStrategyScriptsDto } from '~/domain/models/dto/available-strategy-scripts-dto'
import { onADesktop } from '../fixtures/layout-density'
import { buildTimeZone } from '../fixtures/time-zone'

// 頁面只做接線。這裡看三件事：標題說的是「交易策略」、網址上那一段讀成改哪一份
// （`new` 是新拼一份），以及回測那一側拿到的識別碼——還沒存過的那一份是沒有的。
const pageState = vi.hoisted(() => ({
  declaredMeta: [] as { layout?: string, consoleTitle?: string }[],
  routeId: 'new',
  getTradingStrategy: vi.fn(),
}))

mockNuxtImport('definePageMeta', () => (meta: { layout?: string, consoleTitle?: string }) => {
  pageState.declaredMeta.push(meta)
})
mockNuxtImport('useRoute', () => () => ({ params: { id: pageState.routeId } }))
mockNuxtImport('useNuxtApp', () => () => ({
  $tradingStrategyApplication: {
    getTradingStrategy: pageState.getTradingStrategy,
    listMarketDataKindOptions: () => [],
    listContractTradingModeOptions: () => [],
  },
  $strategyScriptApplication: {
    listAvailableStrategyScripts: vi.fn().mockResolvedValue(new AvailableStrategyScriptsDto([], [])),
  },
  $backtestApplication: {},
  $tradingSymbolApplication: {},
}))
mockNuxtImport('useSelectedTimeZone', () => () => ({ selectedTimeZone: buildTimeZone('UTC') }))
mockNuxtImport('useLayoutDensity', () => () => ({ layoutDensity: ref(onADesktop()) }))
mockNuxtImport('onBeforeRouteLeave', () => () => {})
mockNuxtImport('useConsoleAnnouncement', () => () => ({ announcement: ref(''), announce: () => {} }))

const STUBS = {
  TradingStrategyListPanel: { template: '<p data-testid="list" />' },
  TradingStrategyWorkbench: { template: '<p data-testid="workbench" />' },
  TradingStrategyBacktestPane: {
    props: ['tradingStrategyId'],
    template: '<p data-testid="backtest-id">{{ tradingStrategyId === null ? "none" : tradingStrategyId }}</p>',
  },
}

describe('交易策略的兩個畫面', () => {
  it('清單那一頁的標題是「交易策略」', () => {
    pageState.declaredMeta.length = 0
    mount(TradingStrategyListPage, { global: { stubs: STUBS } })

    expect(pageState.declaredMeta)
      .toEqual([expect.objectContaining({ layout: 'console', consoleTitle: '交易策略' })])
  })

  it.each([
    { name: '「new」是新拼一份：不去讀任何一份，回測那一側還沒有東西可以指名', routeId: 'new', expectedId: 'none', reads: false },
    { name: '一個號碼就是改那一份', routeId: '7', expectedId: '7', reads: true },
  ])('$name', async ({ routeId, expectedId, reads }) => {
    pageState.declaredMeta.length = 0
    pageState.routeId = routeId
    pageState.getTradingStrategy.mockReset().mockResolvedValue(null)

    const wrapper = mount(TradingStrategyPage, { global: { stubs: STUBS } })
    await flushPromises()

    expect(pageState.declaredMeta)
      .toEqual([expect.objectContaining({ layout: 'console', consoleTitle: '交易策略' })])
    expect(wrapper.get('[data-testid="backtest-id"]').text()).toBe(expectedId)
    expect(pageState.getTradingStrategy).toHaveBeenCalledTimes(reads ? 1 : 0)
  })

  it('打開時停在拼規則，回測那一側掛著但看不見', async () => {
    pageState.routeId = 'new'
    const wrapper = mount(TradingStrategyPage, { global: { stubs: STUBS } })
    await flushPromises()

    expect(wrapper.get('[data-testid="workbench"]').attributes('style') ?? '').not.toContain('display: none')
    expect(wrapper.get('[data-testid="backtest-id"]').attributes('style')).toContain('display: none')
  })
})
