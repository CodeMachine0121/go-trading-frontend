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
const { navigateToSpy, getStrategyBot, createStrategyBot, leaveGuards } = vi.hoisted(() => ({
  navigateToSpy: vi.fn(),
  getStrategyBot: vi.fn(),
  createStrategyBot: vi.fn(),
  // 這一頁向路由登記的離開守衛。記下來，才問得到「要離開時它說了什麼」。
  leaveGuards: [] as (() => boolean)[],
}))

mockNuxtImport('navigateTo', () => navigateToSpy)
mockNuxtImport('onBeforeRouteLeave', () => (guard: () => boolean) => {
  leaveGuards.push(guard)
})
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
  emits: ['cancel', 'save', 'dirty-change'],
  template: '<div><button data-testid="form" @click="$emit(\'cancel\')">{{ page.marketDataKind }}</button>'
    + '<button data-testid="form-save" @click="$emit(\'save\', writeDto)" />'
    + '<button data-testid="form-edit" @click="$emit(\'dirty-change\', true)" /></div>',
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
  vi.unstubAllGlobals()
  leaveGuards.length = 0
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

// 巢狀的設定花時間填，靜靜丟掉太貴；但什麼都沒改時每次都攔人，第三次之後就沒人讀那句話了。
describe('StrategyBotWorkbenchPage 有沒存的改動時離開先問過', () => {
  it.each([
    { name: '沒改過就直接放行，一句都不問', edited: false, answer: true, asks: false, letsThrough: true },
    { name: '改過、使用者說要離開就放行', edited: true, answer: true, asks: true, letsThrough: true },
    { name: '改過、使用者說不要就留在這一頁', edited: true, answer: false, asks: true, letsThrough: false },
  ])('$name', async ({ edited, answer, asks, letsThrough }) => {
    // 「先問過」問的是瀏覽器自己的確認框：它是這裡的最外層邊界。
    const confirm = vi.fn().mockReturnValue(answer)
    vi.stubGlobal('confirm', confirm)
    const wrapper = mountPage(null, 'kCandle')
    await flushPromises()
    if (edited) {
      await wrapper.get('[data-testid="form-edit"]').trigger('click')
    }

    const leaveGuard = leaveGuards.at(-1)

    expect(leaveGuard?.()).toBe(letsThrough)
    expect(confirm).toHaveBeenCalledTimes(asks ? 1 : 0)
    if (asks) {
      expect(confirm).toHaveBeenCalledWith('這一頁改過的東西還沒存，確定要離開嗎？')
    }
  })
})
