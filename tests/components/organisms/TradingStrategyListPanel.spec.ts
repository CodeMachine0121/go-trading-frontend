// @vitest-environment nuxt
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import TradingStrategyListPanel from '~/components/organisms/TradingStrategyListPanel.vue'
import type { TradingStrategyApplication } from '~/application/trading-strategy-application'
import { TradingStrategyDto } from '~/domain/models/dto/trading-strategy-dto'
import { TradingStrategySignalSourceDto } from '~/domain/models/dto/trading-strategy-signal-source-dto'
import { TradingStrategyInUseError } from '~/domain/errors/trading-strategy-in-use-error'
import { onADesktop, onAPhone } from '../../fixtures/layout-density'

function tradingStrategyDto(id: number, name: string, sourceCount = 1) {
  return new TradingStrategyDto(
    id,
    name,
    Array.from({ length: sourceCount },
      (_unused, index) => new TradingStrategySignalSourceDto(
        String.fromCharCode(65 + index), 9, '1h', [])),
    null,
    null,
  )
}

function mountPanel(overrides: Partial<TradingStrategyApplication> = {},
  layoutDensity = onADesktop()) {
  const tradingStrategyApplication = {
    listTradingStrategies: vi.fn().mockResolvedValue([]),
    getTradingStrategy: vi.fn(),
    saveTradingStrategy: vi.fn(),
    deleteTradingStrategy: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }

  const wrapper = mount(TradingStrategyListPanel, {
    props: {
      tradingStrategyApplication:
        tradingStrategyApplication as unknown as TradingStrategyApplication,
      layoutDensity,
    },
    // 連結要照樣渲染出 href：那正是這幾條測試在問的事。
    global: { stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
  })

  return { wrapper, tradingStrategyApplication }
}

describe('TradingStrategyListPanel 的清單', () => {
  it('一份都沒有時說得出下一步，而不是給一張空表', async () => {
    const { wrapper } = mountPanel()
    await flushPromises()

    expect(wrapper.find('[data-testid="trading-strategy-list-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="trading-strategy-create"]').attributes('href'))
      .toBe('/trading-strategies/new')
  })

  it('每一份看得出它用了幾支策略腳本', async () => {
    const { wrapper } = mountPanel({
      listTradingStrategies: vi.fn().mockResolvedValue([
        tradingStrategyDto(1, '黃金交叉', 2),
      ]),
    })
    await flushPromises()

    const row = wrapper.find('[data-testid="trading-strategy-row"]')
    expect(row.text()).toContain('黃金交叉')
    expect(row.text()).toContain('2 支策略腳本')
  })

  it('改一改連得到那一份自己的頁面', async () => {
    const { wrapper } = mountPanel({
      listTradingStrategies: vi.fn().mockResolvedValue([tradingStrategyDto(7, '黃金交叉')]),
    })
    await flushPromises()

    expect(wrapper.find('[data-testid="trading-strategy-edit"]').attributes('href'))
      .toBe('/trading-strategies/7')
  })

  it('兩種機器人各有一條路，不把合約機器人藏在現貨那一頁後面', async () => {
    const { wrapper } = mountPanel()
    await flushPromises()

    const spotLink = wrapper.find('[data-testid="trading-strategy-bots-link"]')
    const contractLink = wrapper.find('[data-testid="trading-strategy-contract-bots-link"]')
    expect(spotLink.attributes('href')).toBe('/strategy-bots')
    expect(spotLink.text()).toBe('現貨機器人')
    expect(contractLink.attributes('href')).toBe('/contract-strategy-bots')
    expect(contractLink.text()).toBe('合約機器人')
  })

  it('讀不到時說得出原因並給得出重試的路，而不是一張空表', async () => {
    // 一張空表會讓人以為自己什麼都沒有。
    const { wrapper } = mountPanel({
      listTradingStrategies: vi.fn().mockRejectedValue(new Error('連不上')),
    })
    await flushPromises()

    expect(wrapper.find('[data-testid="trading-strategy-list-failure"]').text())
      .toContain('連不上')
    expect(wrapper.find('[data-testid="trading-strategy-list-empty"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="trading-strategy-list-retry"]').exists()).toBe(true)
  })
})

describe('TradingStrategyListPanel 刪一份', () => {
  it('按下刪除先問過，按了才真的刪', async () => {
    const { wrapper, tradingStrategyApplication } = mountPanel({
      listTradingStrategies: vi.fn().mockResolvedValue([tradingStrategyDto(7, '黃金交叉')]),
    })
    await flushPromises()

    await wrapper.find('[data-testid="trading-strategy-delete"]').trigger('click')
    expect(tradingStrategyApplication.deleteTradingStrategy).not.toHaveBeenCalled()

    await wrapper.findComponent({ name: 'ConfirmDialog' }).vm.$emit('confirm')
    await flushPromises()

    expect(tradingStrategyApplication.deleteTradingStrategy).toHaveBeenCalledWith(7)
  })

  it('後端擋下來時照它說的講，而那一份還在清單上', async () => {
    const { wrapper } = mountPanel({
      listTradingStrategies: vi.fn().mockResolvedValue([tradingStrategyDto(7, '黃金交叉')]),
      deleteTradingStrategy: vi.fn().mockRejectedValue(
        new TradingStrategyInUseError('還有 2 台機器人正在用它，請先改掉或刪掉那幾台')),
    })
    await flushPromises()

    await wrapper.find('[data-testid="trading-strategy-delete"]').trigger('click')
    await wrapper.findComponent({ name: 'ConfirmDialog' }).vm.$emit('confirm')
    await flushPromises()

    expect(wrapper.find('[data-testid="trading-strategy-list-failure"]').text()).toContain('2 台')
    expect(wrapper.findAll('[data-testid="trading-strategy-row"]')).toHaveLength(1)
  })
})

describe('TradingStrategyListPanel：螢幕窄到排不開一張工作檯', () => {
  it('那條「拼一份」不出現，並在原地說出原因', async () => {
    // 讓人開了一張什麼都放不上去的空白工作檯，比不讓他開更糟。
    const { wrapper } = mountPanel({}, onAPhone())
    await flushPromises()

    expect(wrapper.find('[data-testid="trading-strategy-create"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="trading-strategy-create-too-narrow"]').text())
      .toContain('排不開工作檯')
  })

  it('寬得下的時候那條路照樣在，也不多說那一句', async () => {
    const { wrapper } = mountPanel()
    await flushPromises()

    expect(wrapper.get('[data-testid="trading-strategy-create"]').attributes('href'))
      .toBe('/trading-strategies/new')
    expect(wrapper.find('[data-testid="trading-strategy-create-too-narrow"]').exists())
      .toBe(false)
  })
})

describe('TradingStrategyListPanel 標出每一份吃的行情', () => {
  it.each([
    { marketDataKind: 'kCandle' as const, label: 'K 線', tradingModeLabel: null, expected: 'K 線' },
    { marketDataKind: 'contractKCandle' as const, label: '合約行情', tradingModeLabel: '只做多', expected: '合約行情' },
  ])('$label 的那一份寫著「$expected」', async ({ marketDataKind, label, tradingModeLabel, expected }) => {
    const { wrapper } = mountPanel({
      listTradingStrategies: vi.fn().mockResolvedValue([
        new TradingStrategyDto(
          1, '黃金交叉', [], null, null, marketDataKind, label,
          tradingModeLabel === null ? null : 'longOnly', tradingModeLabel,
          marketDataKind === 'contractKCandle'),
      ]),
    })
    await flushPromises()

    expect(wrapper.get('[data-testid="trading-strategy-market-data-kind"]').text()).toBe(expected)
    if (tradingModeLabel !== null) {
      expect(wrapper.get('[data-testid="trading-strategy-row"]').text()).toContain(tradingModeLabel)
    }
  })
})
