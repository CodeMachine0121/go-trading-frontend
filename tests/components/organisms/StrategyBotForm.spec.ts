// @vitest-environment nuxt
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StrategyBotForm from '~/components/organisms/StrategyBotForm.vue'
import { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import { StrategyBotRunStateDto } from '~/domain/models/dto/strategy-bot-run-state-dto'
import { buildTradingSymbolApplication } from '../../fixtures/trading-symbol-application'

function aStoredBot() {
  return new StrategyBotDto(
    7, '早盤突破', 'BTCUSDT', 5, 9, '黃金交叉',
    new StrategyBotRunStateDto(
      false, false, false, '已停止', 'neutral', '', '還沒送出過', true, false, true, ''),
  )
}

function mountForm(overrides: {
  editing?: StrategyBotDto | null
  tradingStrategyOptions?: { value: number, label: string }[]
} = {}) {
  return mount(StrategyBotForm, {
    props: {
      editing: 'editing' in overrides ? overrides.editing! : aStoredBot(),
      tradingSymbolApplication: buildTradingSymbolApplication(),
      tradingStrategyOptions: overrides.tradingStrategyOptions
        ?? [{ value: 9, label: '黃金交叉' }, { value: 10, label: '死亡交叉' }],
      saving: false,
      failureMessage: '',
    },
    global: { stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
  })
}

describe('StrategyBotForm 這一張表單上有什麼', () => {
  it('只有四格——規則那一整塊不在這裡', async () => {
    // 拼規則是坐下來調半小時的事，開一台機器是填四格就走的事。
    const wrapper = mountForm()
    await flushPromises()

    expect(wrapper.find('[data-testid="bot-name-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="bot-trading-strategy-select"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="bot-interval-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="piece-shelf"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="condition-mat-buy"]').exists()).toBe(false)
  })

  it('選單列出自己的每一份交易策略', async () => {
    const wrapper = mountForm()
    await flushPromises()

    const options = wrapper.find('[data-testid="bot-trading-strategy-select"]').findAll('option')
    expect(options.map(option => option.text()))
      .toEqual(['挑一份', '黃金交叉', '死亡交叉'])
  })

  it('讀進來的那一台，選單停在它現在用的那一份上', async () => {
    const wrapper = mountForm()
    await flushPromises()

    expect((wrapper.find('[data-testid="bot-trading-strategy-select"]')
      .element as HTMLSelectElement).value).toBe('9')
  })

  it('一份都沒有時給的是一句話與一個入口，不是一個空選單', async () => {
    // 在一個挑不到東西的選單前面發呆，是最沒有用的那一種畫面。
    const wrapper = mountForm({ editing: null, tradingStrategyOptions: [] })
    await flushPromises()

    expect(wrapper.find('[data-testid="bot-trading-strategy-select"]').exists()).toBe(false)
    const notice = wrapper.find('[data-testid="bot-no-trading-strategies"]')
    expect(notice.exists()).toBe(true)
    expect(notice.find('a').attributes('href')).toBe('/trading-strategies/new')
  })
})

describe('StrategyBotForm 存得下去嗎', () => {
  it('一份都沒挑就送不出去，而且就地說出是哪一件事', async () => {
    const wrapper = mountForm({ editing: null, tradingStrategyOptions: [] })
    await flushPromises()

    await wrapper.find('[data-testid="bot-name-input"]').setValue('早盤突破')

    expect(wrapper.find('[data-testid="bot-form-rejection"]').text()).toContain('挑一份交易策略')
    expect(wrapper.find('[data-testid="bot-form-save"]').attributes('disabled')).toBeDefined()
    expect(wrapper.emitted('save')).toBeUndefined()
  })

  it('四格填齊就交出這一刻表上的那一台', async () => {
    const wrapper = mountForm()
    await flushPromises()

    await wrapper.find('[data-testid="bot-form-save"]').trigger('click')

    const saved = wrapper.emitted('save')?.[0]?.[0] as {
      id: number
      name: string
      symbol: string
      tradingStrategyId: number
    }
    expect(saved.id).toBe(7)
    expect(saved.name).toBe('早盤突破')
    expect(saved.symbol).toBe('BTCUSDT')
    expect(saved.tradingStrategyId).toBe(9)
  })

  it('換一份交易策略之後交出的是新挑的那一份', async () => {
    const wrapper = mountForm()
    await flushPromises()

    await wrapper.find('[data-testid="bot-trading-strategy-select"]').setValue('10')
    await wrapper.find('[data-testid="bot-form-save"]').trigger('click')

    const saved = wrapper.emitted('save')?.[0]?.[0] as { tradingStrategyId: number }
    expect(saved.tradingStrategyId).toBe(10)
  })

  it('什麼都沒改時不說自己被改過——每次離開都攔人的頁面沒有人會讀那句話', async () => {
    const wrapper = mountForm()
    await flushPromises()

    expect(wrapper.emitted('dirtyChange')?.at(-1)?.[0]).toBe(false)
  })

  it('改了一格就說自己被改過', async () => {
    const wrapper = mountForm()
    await flushPromises()

    await wrapper.find('[data-testid="bot-name-input"]').setValue('收盤反轉')

    expect(wrapper.emitted('dirtyChange')?.at(-1)?.[0]).toBe(true)
  })
})
