// @vitest-environment nuxt
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import Decimal from 'decimal.js'
import StrategyBotForm from '~/components/organisms/StrategyBotForm.vue'
import { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import { StrategyBotRunStateDto } from '~/domain/models/dto/strategy-bot-run-state-dto'
import { StrategyBotNotificationsDto } from '~/domain/models/dto/strategy-bot-notifications-dto'
import type { StrategyBotWriteDto } from '~/domain/models/dto/strategy-bot-write-dto'
import { MarketDataKindDomain } from '~/domain/models/domains/market-data-kind-domain'
import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'
import type { TradingDirection } from '~/domain/models/vo/trading-direction-vo'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { TradingSymbolApplication } from '~/application/trading-symbol-application'
import { TradingSymbolService } from '~/domain/service/trading-symbol-service'
import { buildContractTradingSymbol, buildContractTradingSymbolProxy } from '../../fixtures/contract-proxies'
import { buildTradingSymbolApplication } from '../../fixtures/trading-symbol-application'
import { aWatchedSymbolDto } from '../../fixtures/strategy-bot-watched-symbol'

function contractSymbolApplication() {
  return new TradingSymbolApplication(new TradingSymbolService(
    { findTradingSymbols: vi.fn().mockResolvedValue([]) },
    buildContractTradingSymbolProxy([buildContractTradingSymbol('BTCUSDT')])))
}

function aStoredBot(
  marketDataKind: MarketDataKind,
  tradingDirections: TradingDirection[],
  notifications: StrategyBotNotificationsDto,
) {
  return new StrategyBotDto(
    7, '費率反轉', [aWatchedSymbolDto({ symbol: 'BTCUSDT' })], 5, 11, '費率反轉',
    new StrategyBotRunStateDto(
      false, false, false, new LocalizedTextVo('已停止', 'Stopped'), 'neutral', null, null, true, false, true, null),
    null, marketDataKind, null, '/contract-strategy-bots/7', false, new Decimal('0.1'),
    tradingDirections, null, null, notifications)
}

function mountForm(marketDataKind: MarketDataKind, editing: StrategyBotDto | null) {
  return mount(StrategyBotForm, {
    props: {
      editing,
      page: new MarketDataKindDomain(marketDataKind).toStrategyBotPageDto(),
      tradingSymbolApplication: marketDataKind === 'contractKCandle'
        ? contractSymbolApplication()
        : buildTradingSymbolApplication(),
      tradingStrategyOptions: [{ value: 11, label: '費率反轉' }],
      saving: false,
      failureMessage: null,
    },
    global: { stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
  })
}

function checked(wrapper: ReturnType<typeof mountForm>, testId: string) {
  return wrapper.get<HTMLInputElement>(`[data-testid="${testId}"] input`).element.checked
}

async function save(wrapper: ReturnType<typeof mountForm>) {
  await wrapper.get('[data-testid="bot-form-save"]').trigger('click')

  return wrapper.emitted('save')?.at(-1)?.[0] as StrategyBotWriteDto | undefined
}

describe('StrategyBotForm 合約機器人的交易方向', () => {
  it('新拼一台合約機器人：做多與做空都勾著，說明是多空反手', async () => {
    const wrapper = mountForm('contractKCandle', null)
    await flushPromises()

    expect(checked(wrapper, 'bot-trades-long')).toBe(true)
    expect(checked(wrapper, 'bot-trades-short')).toBe(true)
    expect(wrapper.get('[data-testid="bot-trading-directions-description"]').text()).toContain('兩個都勾＝多空反手')
  })

  it.each([
    { untick: 'bot-trades-short', expected: '買入＝做多、賣出＝平多' },
    { untick: 'bot-trades-long', expected: '賣出＝做空、買入＝平空' },
  ])('取消 $untick 後說明含「$expected」', async ({ untick, expected }) => {
    const wrapper = mountForm('contractKCandle', null)
    await flushPromises()

    await wrapper.get(`[data-testid="${untick}"] input`).setValue(false)

    expect(wrapper.get('[data-testid="bot-trading-directions-description"]').text()).toContain(expected)
  })

  it('兩個都不勾：不讓送出，並說「至少要選一個交易方向」', async () => {
    const wrapper = mountForm('contractKCandle', aStoredBot('contractKCandle', ['long'], new StrategyBotNotificationsDto()))
    await flushPromises()

    await wrapper.get('[data-testid="bot-trades-long"] input').setValue(false)

    expect(wrapper.get('[data-testid="bot-form-rejection"]').text()).toBe('至少要選一個交易方向')
    expect(wrapper.get('[data-testid="bot-form-save"]').attributes('disabled')).toBeDefined()
    expect(await save(wrapper)).toBeUndefined()
  })

  it('打開一台只做空的合約機器人：只有做空勾著', async () => {
    const wrapper = mountForm('contractKCandle', aStoredBot('contractKCandle', ['short'], new StrategyBotNotificationsDto()))
    await flushPromises()

    expect(checked(wrapper, 'bot-trades-long')).toBe(false)
    expect(checked(wrapper, 'bot-trades-short')).toBe(true)
  })

  it('只勾做多送出：送出的交易方向是做多', async () => {
    const wrapper = mountForm('contractKCandle', aStoredBot('contractKCandle', ['long', 'short'], new StrategyBotNotificationsDto()))
    await flushPromises()

    await wrapper.get('[data-testid="bot-trades-short"] input').setValue(false)

    expect((await save(wrapper))?.tradingDirections).toEqual(['long'])
  })

  it('現貨機器人沒有交易方向那一組，送出的內容也沒有', async () => {
    const wrapper = mountForm('kCandle', aStoredBot('kCandle', [], new StrategyBotNotificationsDto()))
    await flushPromises()

    expect(wrapper.find('[data-testid="bot-trading-directions"]').exists()).toBe(false)
    expect((await save(wrapper))?.tradingDirections).toBeNull()
  })
})

describe('StrategyBotForm 改方向被交易服務擋下', () => {
  it('擋下的那一句出現時頁面留著、勾選不變', async () => {
    const wrapper = mountForm('contractKCandle', aStoredBot('contractKCandle', ['long'], new StrategyBotNotificationsDto()))
    await flushPromises()
    await wrapper.get('[data-testid="bot-trades-long"] input').setValue(false)
    await wrapper.get('[data-testid="bot-trades-short"] input').setValue(true)
    await save(wrapper)

    await wrapper.setProps({ failureMessage: new LocalizedTextVo(
      '自動下單開著時不能改交易方向：請先在這台機器人的詳細頁關掉自動下單，再改交易方向',
      'Auto order is on') })

    expect(wrapper.get('[data-testid="bot-form-failure"]').text())
      .toBe('自動下單開著時不能改交易方向：請先在這台機器人的詳細頁關掉自動下單，再改交易方向')
    expect(checked(wrapper, 'bot-trades-long')).toBe(false)
    expect(checked(wrapper, 'bot-trades-short')).toBe(true)
  })
})

describe('StrategyBotForm 每種結論的通知', () => {
  it('新拼一台：買入與賣出通知勾著、持有沒勾，並說明持有只在回到持有時通知一次', async () => {
    const wrapper = mountForm('kCandle', null)
    await flushPromises()

    expect(checked(wrapper, 'bot-notifies-buy')).toBe(true)
    expect(checked(wrapper, 'bot-notifies-sell')).toBe(true)
    expect(checked(wrapper, 'bot-notifies-hold')).toBe(false)
    expect(wrapper.get('[data-testid="bot-notifications"]').text()).toContain('只在回到持有時通知一次')
  })

  it('勾持有通知送出：買入開、賣出開、持有開', async () => {
    const wrapper = mountForm('kCandle', aStoredBot('kCandle', [], new StrategyBotNotificationsDto()))
    await flushPromises()

    await wrapper.get('[data-testid="bot-notifies-hold"] input').setValue(true)

    expect((await save(wrapper))?.notifications).toEqual(new StrategyBotNotificationsDto(true, true, true))
  })

  it('三個都不勾照樣送得出去，送出的通知三個都關', async () => {
    const wrapper = mountForm('contractKCandle', aStoredBot('contractKCandle', ['long'], new StrategyBotNotificationsDto()))
    await flushPromises()

    await wrapper.get('[data-testid="bot-notifies-buy"] input').setValue(false)
    await wrapper.get('[data-testid="bot-notifies-sell"] input').setValue(false)

    expect((await save(wrapper))?.notifications).toEqual(new StrategyBotNotificationsDto(false, false, false))
  })

  it('打開一台開著持有通知的機器人：持有通知勾著', async () => {
    const wrapper = mountForm('kCandle', aStoredBot('kCandle', [], new StrategyBotNotificationsDto(true, true, true)))
    await flushPromises()

    expect(checked(wrapper, 'bot-notifies-hold')).toBe(true)
  })

  it('打開一台只開賣出通知的機器人：只有賣出通知勾著', async () => {
    const wrapper = mountForm('kCandle', aStoredBot('kCandle', [], new StrategyBotNotificationsDto(false, true, false)))
    await flushPromises()

    expect(checked(wrapper, 'bot-notifies-buy')).toBe(false)
    expect(checked(wrapper, 'bot-notifies-sell')).toBe(true)
    expect(checked(wrapper, 'bot-notifies-hold')).toBe(false)
  })
})
