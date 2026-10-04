import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import StrategyBotWorkbenchPage from '~/components/templates/StrategyBotWorkbenchPage.vue'
import { StrategyBotApplication } from '~/application/strategy-bot-application'
import { StrategyBotService } from '~/domain/service/strategy-bot-service'
import type { IStrategyBotProxy } from '~/domain/interface/i-strategy-bot-proxy'
import { StrategyBot } from '~/domain/models/entities/strategy-bot'
import { AutoOrderPositionVo } from '~/domain/models/vo/auto-order-position-vo'
import Decimal from 'decimal.js'
import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'
import { StrategyBotWriteDto } from '~/domain/models/dto/strategy-bot-write-dto'
import { AutoOrderRefusedError } from '~/domain/errors/auto-order-refused-error'

// 模板只做接線；這裡只看它把「這一種」接對了：標題、讀到另一種時送去哪、存好回到哪。
const { navigateToSpy, getStrategyBot, createStrategyBot, enableAutoOrder, disableAutoOrder, leaveGuards } = vi.hoisted(() => ({
  navigateToSpy: vi.fn(),
  getStrategyBot: vi.fn(),
  createStrategyBot: vi.fn(),
  enableAutoOrder: vi.fn(),
  disableAutoOrder: vi.fn(),
  // 這一頁向路由登記的離開守衛。記下來，才問得到「要離開時它說了什麼」。
  leaveGuards: [] as (() => boolean)[],
}))

mockNuxtImport('navigateTo', () => navigateToSpy)
mockNuxtImport('onBeforeRouteLeave', () => (guard: () => boolean) => {
  leaveGuards.push(guard)
})
mockNuxtImport('useConsoleAnnouncement', () => () => ({ announce: () => {}, announcement: { value: null } }))
mockNuxtImport('useNuxtApp', () => () => ({
  $strategyBotApplication: new StrategyBotApplication(new StrategyBotService(
    { getStrategyBot, createStrategyBot, enableAutoOrder, disableAutoOrder } as unknown as IStrategyBotProxy)),
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

describe('StrategyBotWorkbenchPage 切成英文', () => {
  it('標題、回清單與找不到那一台的那一句都換成英文', async () => {
    getStrategyBot.mockRejectedValue(new Error('找不到這台策略機器人'))
    const wrapper = mountPage(7, 'contractKCandle')
    await flushPromises()

    wrapper.vm.$i18n.locale = 'en'
    await flushPromises()

    expect(wrapper.get('[data-testid="workbench-title"]').text()).toBe('Edit this contract bot')
    expect(wrapper.get('[data-testid="workbench-back"]').text()).toBe('‹ Back to list')
    expect(wrapper.get('[data-testid="workbench-missing"]').text())
      .toBe('This bot cannot be found. It may have been deleted.')
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

describe('StrategyBotWorkbenchPage 的自動下單開關', () => {
  function botWith(marketDataKind: MarketDataKind, autoOrderEnabled: boolean) {
    return new StrategyBot(
      7, '費率反轉', 'BTCUSDT', 5, 9, '費率反轉', 'running', '', null, false, null, marketDataKind, autoOrderEnabled)
  }

  it('新建機器人的畫面沒有開關', async () => {
    const wrapper = mountPage(null, 'kCandle')
    await flushPromises()

    expect(wrapper.find('[data-testid="auto-order-switch"]').exists()).toBe(false)
  })

  it.each([
    { marketDataKind: 'kCandle' as const, notice: '現貨機器人目前還不會自動下單' },
    { marketDataKind: 'contractKCandle' as const, notice: '打開後，機器人說出新結論時會用你的幣安帳戶真的開倉' },
  ])('$marketDataKind 機器人的頁面照交易服務的狀態畫開關，並說「$notice」', async ({ marketDataKind, notice }) => {
    getStrategyBot.mockResolvedValue(botWith(marketDataKind, true))
    const wrapper = mountPage(7, marketDataKind)
    await flushPromises()

    expect(wrapper.get('[data-testid="auto-order-switch"]').attributes('aria-checked')).toBe('true')
    expect(wrapper.get('[data-testid="auto-order-notice"]').text()).toContain(notice)
  })

  it('合約機器人的頁面畫出它自己開的持倉', async () => {
    const contractBot = new StrategyBot(
      7, '費率反轉', 'BTCUSDT', 5, 9, '費率反轉', 'running', '', null, false, null, 'contractKCandle', true,
      new AutoOrderPositionVo('long', new Decimal('0.002')))
    getStrategyBot.mockResolvedValue(contractBot)
    const wrapper = mountPage(7, 'contractKCandle')
    await flushPromises()

    expect(wrapper.get('[data-testid="auto-order-position"]').text()).toBe('機器人持倉：多 0.002')
  })

  it('執行中的機器人打得開，開關變成開著', async () => {
    getStrategyBot.mockResolvedValue(botWith('kCandle', false))
    enableAutoOrder.mockResolvedValue(botWith('kCandle', true))
    const wrapper = mountPage(7, 'kCandle')
    await flushPromises()

    await wrapper.get('[data-testid="auto-order-switch"]').trigger('click')
    await flushPromises()

    expect(enableAutoOrder).toHaveBeenCalledWith(7)
    expect(wrapper.get('[data-testid="auto-order-switch"]').attributes('aria-checked')).toBe('true')
  })

  it('合約機器人因金鑰沒有合約權限被拒時照原話說，開關停在關閉', async () => {
    getStrategyBot.mockResolvedValue(botWith('contractKCandle', false))
    enableAutoOrder.mockRejectedValue(new AutoOrderRefusedError(
      '這組幣安交易金鑰沒有合約交易權限', 'tradableMarketNotCovered'))
    const wrapper = mountPage(7, 'contractKCandle')
    await flushPromises()

    await wrapper.get('[data-testid="auto-order-switch"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="auto-order-refusal"]').text()).toContain('這組幣安交易金鑰沒有合約交易權限')
    expect(wrapper.find('[data-testid="auto-order-settings-link"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="auto-order-switch"]').attributes('aria-checked')).toBe('false')
  })

  it('關掉直接關，沒有任何確認', async () => {
    getStrategyBot.mockResolvedValue(botWith('kCandle', true))
    disableAutoOrder.mockResolvedValue(botWith('kCandle', false))
    const wrapper = mountPage(7, 'kCandle')
    await flushPromises()

    await wrapper.get('[data-testid="auto-order-switch"]').trigger('click')
    await flushPromises()

    expect(disableAutoOrder).toHaveBeenCalledWith(7)
    expect(wrapper.get('[data-testid="auto-order-switch"]').attributes('aria-checked')).toBe('false')
  })

  it('切換失敗時開關停在原本的狀態', async () => {
    getStrategyBot.mockResolvedValue(botWith('kCandle', true))
    disableAutoOrder.mockRejectedValue(new Error('找不到這台策略機器人'))
    const wrapper = mountPage(7, 'kCandle')
    await flushPromises()

    await wrapper.get('[data-testid="auto-order-switch"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="auto-order-failure"]').text()).toBe('找不到這台策略機器人')
    expect(wrapper.get('[data-testid="auto-order-switch"]').attributes('aria-checked')).toBe('true')
  })
})
