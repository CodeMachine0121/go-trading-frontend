import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import StrategyBotWorkbenchPage from '~/components/templates/StrategyBotWorkbenchPage.vue'
import { StrategyBotApplication } from '~/application/strategy-bot-application'
import { StrategyBotService } from '~/domain/service/strategy-bot-service'
import type { IStrategyBotProxy } from '~/domain/interface/i-strategy-bot-proxy'
import { StrategyBot } from '~/domain/models/entities/strategy-bot'
import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'
import { StrategyBotWriteDto } from '~/domain/models/dto/strategy-bot-write-dto'

// 模板只做接線；這裡只看它把「這一種」接對了：標題、讀到另一種時送去哪、存好回到哪。
const { navigateToSpy, getStrategyBot, createStrategyBot } = vi.hoisted(() => ({
  navigateToSpy: vi.fn(),
  getStrategyBot: vi.fn(),
  createStrategyBot: vi.fn(),
}))

mockNuxtImport('navigateTo', () => navigateToSpy)
mockNuxtImport('onBeforeRouteLeave', () => () => {})
mockNuxtImport('useConsoleAnnouncement', () => () => ({ announce: () => {}, announcement: { value: '' } }))
mockNuxtImport('useNuxtApp', () => () => ({
  $strategyBotApplication: new StrategyBotApplication(new StrategyBotService(
    { getStrategyBot, createStrategyBot } as unknown as IStrategyBotProxy)),
  $tradingStrategyApplication: { listTradingStrategiesFollowableBy: vi.fn().mockResolvedValue([]) },
  $tradingSymbolApplication: {},
}))
// 回清單那一條是連結：照樣渲染出 href，不必啟動路由。
const LINK_STUB = { props: ['to'], template: '<a :href="to"><slot /></a>' }
const FORM_STUB = {
  props: ['page'],
  emits: ['cancel', 'save'],
  template: '<div><button data-testid="form" @click="$emit(\'cancel\')">{{ page.marketDataKind }}</button>'
    + '<button data-testid="form-save" @click="$emit(\'save\', writeDto)" /></div>',
  data: () => ({
    writeDto: new StrategyBotWriteDto(undefined, '費率反轉', 'BTCUSDT', 9, 5, null, 'contractKCandle'),
  }),
}

function storedBot(marketDataKind: MarketDataKind) {
  return new StrategyBot(7, '費率反轉', 'BTCUSDT', 5, 9, '費率反轉', 'stopped', '', null, false, null, marketDataKind)
}

function mountPage(strategyBotId: number | null, marketDataKind: MarketDataKind) {
  return mount(StrategyBotWorkbenchPage, {
    props: { strategyBotId, marketDataKind },
    global: { stubs: { StrategyBotForm: FORM_STUB, NuxtLink: LINK_STUB } },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('StrategyBotWorkbenchPage 接的是這一頁那一種', () => {
  it.each([
    { marketDataKind: 'kCandle' as const, title: '拼一台現貨機器人', listPath: '/strategy-bots' },
    { marketDataKind: 'contractKCandle' as const, title: '拼一台合約機器人', listPath: '/contract-strategy-bots' },
  ])('$marketDataKind：標題「$title」、取消與回清單都回到 $listPath', async ({ marketDataKind, title, listPath }) => {
    const wrapper = mountPage(null, marketDataKind)
    await flushPromises()

    expect(wrapper.get('[data-testid="workbench-title"]').text()).toBe(title)
    expect(wrapper.get('[data-testid="form"]').text()).toBe(marketDataKind)

    expect(wrapper.get('[data-testid="workbench-back"]').attributes('href')).toBe(listPath)

    await wrapper.get('[data-testid="form"]').trigger('click')
    expect(navigateToSpy).toHaveBeenCalledWith(listPath)
  })

  it('從現貨那一頁打開一台合約機器人，被送到它自己的編輯頁', async () => {
    getStrategyBot.mockResolvedValue(storedBot('contractKCandle'))

    const wrapper = mountPage(7, 'kCandle')
    await flushPromises()

    expect(navigateToSpy).toHaveBeenCalledWith('/contract-strategy-bots/7', { replace: true })
    expect(wrapper.find('[data-testid="form"]').exists()).toBe(false)
  })

  it('打開同一種的一台，標題是改一台、不被送走', async () => {
    getStrategyBot.mockResolvedValue(storedBot('contractKCandle'))

    const wrapper = mountPage(7, 'contractKCandle')
    await flushPromises()

    expect(wrapper.get('[data-testid="workbench-title"]').text()).toBe('改一改這台合約機器人')
    expect(navigateToSpy).not.toHaveBeenCalled()
  })
  it('存好一台合約機器人，回到合約策略機器人清單', async () => {
    createStrategyBot.mockResolvedValue(storedBot('contractKCandle'))

    const wrapper = mountPage(null, 'contractKCandle')
    await flushPromises()
    await wrapper.get('[data-testid="form-save"]').trigger('click')
    await flushPromises()

    expect(navigateToSpy).toHaveBeenCalledWith('/contract-strategy-bots')
  })
})
