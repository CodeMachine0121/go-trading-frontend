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

describe('StrategyBotWorkbench：一句一句拼出來', () => {
  it('存進去的每一句，打開來就是拼好的一塊', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    expect(wrapper.find('[data-testid="sentence-buy-MACD-buy"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="sentence-sell-MACD-sell"]').exists()).toBe(true)
  })

  it('空著的那一句永遠在最下面，說得出下一步在哪', async () => {
    // 一個要先按「新增」才出現的槽，等於把最常做的那件事藏起來。
    const wrapper = mountWorkbench()
    await flushPromises()

    expect(wrapper.get('[data-testid="slot-source-buy"]').text()).toContain('挑一支策略')
    expect(wrapper.get('[data-testid="slot-signal-buy"]').text()).toContain('挑一個信號')
  })

  it('點一塊策略零件，它就落進那個槽', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="piece-source-MACD"]').trigger('click')

    expect(wrapper.get('[data-testid="slot-source-buy"]').text()).toContain('MACD')
  })

  it('兩個槽都滿了就自動接上去，槽跟著空回來', async () => {
    // 還要再按一次「確定」的話，那一下就是在填表，而不是在拼。
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="piece-source-MACD"]').trigger('click')
    await wrapper.get('[data-testid="piece-signal-hold"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="sentence-buy-MACD-hold"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="slot-source-buy"]').text()).toContain('挑一支策略')
  })

  it('拿在手上的那一塊在零件盤上只留一個影子', async () => {
    // 兩個地方同時出現同一塊，使用者會以為自己拿到的是第二塊。
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="piece-source-MACD"]').trigger('click')

    expect(wrapper.get('[data-testid="piece-source-MACD"]').attributes('aria-pressed'))
      .toBe('true')
  })

  it('再點一次拿在手上的那一塊，就把它放回去', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="piece-source-MACD"]').trigger('click')
    await wrapper.get('[data-testid="piece-source-MACD"]').trigger('click')

    expect(wrapper.get('[data-testid="slot-source-buy"]').text()).toContain('挑一支策略')
  })

  it('零件落到哪一座，由現在選著的那一座決定', async () => {
    // 零件盤只有一個，所以「現在要放進哪裡」全畫面只能有一個答案。
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="board-sell"]').trigger('click')
    await wrapper.get('[data-testid="piece-source-MACD"]').trigger('click')

    expect(wrapper.get('[data-testid="slot-source-sell"]').text()).toContain('MACD')
    expect(wrapper.get('[data-testid="slot-source-buy"]').text()).toContain('挑一支策略')
  })

  it('拆掉一句就少一句', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="take-apart-buy-MACD-buy"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="sentence-buy-MACD-buy"]').exists()).toBe(false)
  })

  it('同一支策略可以拼好幾句——「買入或持有都算」是真的有人要說的話', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="piece-source-MACD"]').trigger('click')
    await wrapper.get('[data-testid="piece-signal-hold"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="sentence-buy-MACD-buy"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="sentence-buy-MACD-hold"]').exists()).toBe(true)
  })

  it('拼一邊不會動到另一邊', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="piece-source-MACD"]').trigger('click')
    await wrapper.get('[data-testid="piece-signal-hold"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="sentence-sell-MACD-hold"]').exists()).toBe(false)
  })

  it('條件這一區裡一個下拉選單都沒有——那正是填表與組裝的差別', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    const board = wrapper.get('[data-testid="board-buy"]')

    // 唯一的例外是「這幾句要全部成立還是任一成立」，那是整座拼板的性質，
    // 不是拼出來的東西。
    expect(board.findAll('select')).toHaveLength(1)
    expect(board.find('[data-testid="operator-buy"]').exists()).toBe(true)
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
  it('且與或交錯的條件，照實說這裡拼不出它——不默默壓平', async () => {
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

    expect(wrapper.get('[data-testid="matrix-unrepresentable-buy"]').text()).toContain('拼不出')
    expect(wrapper.find('[data-testid="matrix-unrepresentable-sell"]').exists()).toBe(false)
  })
})
