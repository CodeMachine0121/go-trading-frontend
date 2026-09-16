// @vitest-environment nuxt
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import StrategyBotWorkbench from '~/components/organisms/StrategyBotWorkbench.vue'
import { TradingSymbolApplication } from '~/application/trading-symbol-application'
import { TradingSymbolService } from '~/domain/service/trading-symbol-service'
import { StrategyBotConditionDto } from '~/domain/models/dto/strategy-bot-condition-dto'
import { StrategyBotDto } from '~/domain/models/dto/strategy-bot-dto'
import { StrategyBotRunStateDto } from '~/domain/models/dto/strategy-bot-run-state-dto'
import { StrategyBotSignalSourceDto } from '~/domain/models/dto/strategy-bot-signal-source-dto'
import { buildTradingSymbol } from '~~/tests/fixtures/trading-symbol-application'

function stoppedState() {
  return new StrategyBotRunStateDto(
    false, false, false, '已停止', 'neutral', '', '還沒送出過', true, false, true, '')
}

function comparison(nodeId: string, sourceLabel: string, signal: string) {
  return new StrategyBotConditionDto(nodeId, null, [], sourceLabel, signal)
}

function group(operator: 'and' | 'or', ...children: StrategyBotConditionDto[]) {
  return new StrategyBotConditionDto(`g-${operator}`, operator, children, '', '')
}

function aBot(
  buyCondition: StrategyBotConditionDto | null = comparison('b', 'MACD', 'buy'),
  sellCondition: StrategyBotConditionDto | null = comparison('s', 'MACD', 'sell'),
  sources = [new StrategyBotSignalSourceDto('MACD', 9, '5m', [])],
) {
  return new StrategyBotDto(
    7, '早盤突破', 'BTCUSDT', 5, sources, buyCondition, sellCondition, stoppedState())
}

function mountWorkbench(editing: StrategyBotDto | null = aBot()) {
  return mount(StrategyBotWorkbench, {
    props: {
      editing,
      tradingSymbolApplication: new TradingSymbolApplication(new TradingSymbolService({
        findTradingSymbols: vi.fn().mockResolvedValue([buildTradingSymbol('BTCUSDT')]),
      })),
      strategyOptions: [{ value: 9, label: 'MACD' }, { value: 10, label: 'ATR' }],
      parameterNamesByStrategyId: { 9: ['快線期數'] },
      saving: false,
      failureMessage: '',
    },
    global: { stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
  })
}

describe('StrategyBotWorkbench：整頁就是一張表', () => {
  it('一支策略一列，列首就是它的名字——不必去別的地方查它是誰', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    const rows = wrapper.findAll('[data-testid="strategy-row"]')
    expect(rows).toHaveLength(1)
    expect(rows[0]!.text()).toContain('MACD')
  })

  it('買入與賣出是同一列上的兩欄——它們會不會撞在一起，橫著看就知道', async () => {
    // 兩邊同時成立時這台機器人什麼都不會說，而那件事只有並排時才看得出來。
    const wrapper = mountWorkbench()
    await flushPromises()

    expect(wrapper.text()).toContain('什麼算買入')
    expect(wrapper.text()).toContain('什麼算賣出')
    expect(wrapper.find('[data-testid="cell-buy-MACD-buy"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="cell-sell-MACD-buy"]').exists()).toBe(true)
  })

  it('存進去時亮著的那幾格，打開來仍然亮著', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    expect(wrapper.get('[data-testid="cell-buy-MACD-buy"]').attributes('aria-pressed'))
      .toBe('true')
    expect(wrapper.get('[data-testid="cell-buy-MACD-sell"]').attributes('aria-pressed'))
      .toBe('false')
    expect(wrapper.get('[data-testid="cell-sell-MACD-sell"]').attributes('aria-pressed'))
      .toBe('true')
  })

  it('按一格就亮，再按一次就滅', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="cell-buy-MACD-hold"]').trigger('click')
    expect(wrapper.get('[data-testid="cell-buy-MACD-hold"]').attributes('aria-pressed'))
      .toBe('true')

    await wrapper.get('[data-testid="cell-buy-MACD-hold"]').trigger('click')
    expect(wrapper.get('[data-testid="cell-buy-MACD-hold"]').attributes('aria-pressed'))
      .toBe('false')
  })

  it('一格可以同時亮好幾個——「買入或持有都算」是真的有人要說的話', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="cell-buy-MACD-hold"]').trigger('click')

    expect(wrapper.get('[data-testid="cell-buy-MACD-buy"]').attributes('aria-pressed'))
      .toBe('true')
    expect(wrapper.get('[data-testid="cell-buy-MACD-hold"]').attributes('aria-pressed'))
      .toBe('true')
  })

  it('按買入那一欄不會動到賣出那一欄', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="cell-buy-MACD-hold"]').trigger('click')

    expect(wrapper.get('[data-testid="cell-sell-MACD-hold"]').attributes('aria-pressed'))
      .toBe('false')
  })
})

describe('StrategyBotWorkbench：加一支策略', () => {
  it('加一支就多一列，兩欄都跟著出現', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="strategy-add"]').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-testid="strategy-row"]')).toHaveLength(2)
  })

  it('刪一支就少一列，而那一列還被用著也刪得掉', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="strategy-remove"]').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-testid="strategy-row"]')).toHaveLength(0)
  })

  it('一支策略都還沒有時說得出下一步', async () => {
    const wrapper = mountWorkbench(aBot(null, null, []))
    await flushPromises()

    expect(wrapper.get('[data-testid="no-sources"]').text()).toContain('加一支')
  })
})

describe('StrategyBotWorkbench：一支策略自己的設定', () => {
  it('一開始收著——收起來時一支策略就是一列', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    expect(wrapper.find('[data-testid="strategy-settings-panel-0"]').exists()).toBe(false)
  })

  it('按齒輪才打開，裡面是這一支自己的事', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="strategy-settings-0"]').trigger('click')

    const panel = wrapper.get('[data-testid="strategy-settings-panel-0"]')
    expect(panel.find('[data-testid="strategy-label-input"]').exists()).toBe(true)
    expect(panel.find('[data-testid="strategy-interval-select"]').exists()).toBe(true)
    expect(panel.find('[data-testid="strategy-parameter-input"]').exists()).toBe(true)
  })
})

describe('StrategyBotWorkbench：存得下去嗎', () => {
  it('每一邊都有格子亮著就存得下去', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    expect(wrapper.find('[data-testid="bot-form-rejection"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="bot-form-save"]').attributes('disabled')).toBeUndefined()
  })

  it('一邊一格都沒亮就存不下去，並說得出為什麼', async () => {
    const wrapper = mountWorkbench(aBot(comparison('b', 'MACD', 'buy'), null))
    await flushPromises()

    expect(wrapper.get('[data-testid="bot-form-rejection"]').text()).toContain('兩邊都要')
    expect(wrapper.get('[data-testid="bot-form-save"]').attributes('disabled')).toBeDefined()
  })

  it('按儲存交出的是這一刻表上的那一台', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="bot-form-save"]').trigger('click')

    const saved = wrapper.emitted('save')?.[0]?.[0] as { id: number, name: string }
    expect(saved.id).toBe(7)
    expect(saved.name).toBe('早盤突破')
  })
})

describe('StrategyBotWorkbench：畫不出來的舊條件', () => {
  it('且與或交錯的條件，照實說這張表畫不出它——不默默壓平', async () => {
    // 壓平會得到一個意思不同的條件，而使用者會在完全沒察覺的情況下把它存回去。
    const wrapper = mountWorkbench(aBot(
      group('and',
        group('or', comparison('a', 'MACD', 'buy'), comparison('b', 'ATR', 'buy')),
        comparison('c', 'MACD', 'sell')),
      comparison('s', 'MACD', 'sell'),
      [
        new StrategyBotSignalSourceDto('MACD', 9, '5m', []),
        new StrategyBotSignalSourceDto('ATR', 10, '1h', []),
      ]))
    await flushPromises()

    expect(wrapper.get('[data-testid="matrix-unrepresentable-buy"]').text()).toContain('畫不出')
    expect(wrapper.find('[data-testid="matrix-unrepresentable-sell"]').exists()).toBe(false)
  })
})
