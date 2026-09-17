// @vitest-environment nuxt
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import TradingStrategyWorkbench from '~/components/organisms/TradingStrategyWorkbench.vue'
import { TradingStrategyConditionDto } from '~/domain/models/dto/trading-strategy-condition-dto'
import { TradingStrategyDto } from '~/domain/models/dto/trading-strategy-dto'
import { TradingStrategySignalSourceDto } from '~/domain/models/dto/trading-strategy-signal-source-dto'

function comparison(nodeId: string, sourceLabel: string, signal: string) {
  return new TradingStrategyConditionDto(nodeId, null, [], sourceLabel, signal)
}

function group(operator: 'and' | 'or', ...children: TradingStrategyConditionDto[]) {
  return new TradingStrategyConditionDto(`g-${operator}`, operator, children, '', '')
}

function aBot(
  buyCondition: TradingStrategyConditionDto | null = comparison('b', 'MACD', 'buy'),
  sellCondition: TradingStrategyConditionDto | null = comparison('s', 'MACD', 'sell'),
  sources = [new TradingStrategySignalSourceDto('MACD', 9, '5m', [])],
) {
  return new TradingStrategyDto(7, '黃金交叉', sources, buyCondition, sellCondition)
}

function mountWorkbench(editing: TradingStrategyDto | null = aBot()) {
  return mount(TradingStrategyWorkbench, {
    props: {
      editing,
      strategyScriptOptions: [{ value: 9, label: 'MACD' }, { value: 10, label: 'ATR' }],
      parameterNamesByStrategyScriptId: { 9: ['快線期數'] },
      saving: false,
      failureMessage: '',
    },
    global: { stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
  })
}

/** 拖曳事件要帶得動一個 dataTransfer——瀏覽器會給，happy-dom 不會。 */
function dragEvent() {
  return { dataTransfer: { setData: vi.fn() } as unknown as DataTransfer }
}

describe('TradingStrategyWorkbench：工作檯上的零件', () => {
  it('每一塊零件都在架子上，不管它有沒有被用到', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    expect(wrapper.find('[data-testid="shelf-piece-MACD"]').exists()).toBe(true)
  })

  it('存進去時擺在墊子上的，打開來還在那張墊子上', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    expect(wrapper.find('[data-testid="placed-buy-MACD"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="placed-sell-MACD"]').exists()).toBe(true)
  })

  it('沒擺上墊子的零件，墊子上就沒有它——那與「擺著但什麼都沒勾」是兩件事', async () => {
    const wrapper = mountWorkbench(aBot(comparison('b', 'MACD', 'buy'), null))
    await flushPromises()

    expect(wrapper.find('[data-testid="placed-buy-MACD"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="placed-sell-MACD"]').exists()).toBe(false)
  })

  it('空的墊子說得出它是空的', async () => {
    const wrapper = mountWorkbench(aBot(comparison('b', 'MACD', 'buy'), null))
    await flushPromises()

    expect(wrapper.get('[data-testid="drop-sell-end"]').text()).toContain('空的')
  })
})

describe('TradingStrategyWorkbench：把零件搬來搬去', () => {
  it('從架子拖到墊子上，它就擺上去了', async () => {
    const wrapper = mountWorkbench(aBot(comparison('b', 'MACD', 'buy'), null))
    await flushPromises()

    await wrapper.get('[data-testid="shelf-piece-MACD"]').trigger('dragstart', dragEvent())
    await wrapper.get('[data-testid="drop-sell-end"]').trigger('drop')
    await flushPromises()

    expect(wrapper.find('[data-testid="placed-sell-MACD"]').exists()).toBe(true)
  })

  it('剛擺上去的零件預設收下買入——一塊什麼都不收的零件是一句永遠不成立的話', async () => {
    const wrapper = mountWorkbench(aBot(comparison('b', 'MACD', 'buy'), null))
    await flushPromises()

    await wrapper.get('[data-testid="shelf-piece-MACD"]').trigger('dragstart', dragEvent())
    await wrapper.get('[data-testid="drop-sell-end"]').trigger('drop')
    await flushPromises()

    expect(wrapper.get('[data-testid="chip-sell-MACD-buy"]').attributes('aria-pressed'))
      .toBe('true')
  })

  it('從一張墊子拖到另一張，是搬過去，不是複製', async () => {
    const wrapper = mountWorkbench(aBot(comparison('b', 'MACD', 'buy'), null))
    await flushPromises()

    await wrapper.get('[data-testid="placed-buy-MACD"]').trigger('dragstart', dragEvent())
    await wrapper.get('[data-testid="drop-sell-end"]').trigger('drop')
    await flushPromises()

    expect(wrapper.find('[data-testid="placed-sell-MACD"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="placed-buy-MACD"]').exists()).toBe(false)
  })

  it('拖回架子就從墊子上收走，零件本身還在', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="placed-buy-MACD"]').trigger('dragstart', dragEvent())
    await wrapper.get('[data-testid="shelf"]').trigger('drop')
    await flushPromises()

    expect(wrapper.find('[data-testid="placed-buy-MACD"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="shelf-piece-MACD"]').exists()).toBe(true)
  })

  it('那顆返回鍵做的是同一件事——沒有指標裝置的人也拿得回來', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="take-off-buy-MACD"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="placed-buy-MACD"]').exists()).toBe(false)
  })

  it('墊子上排的順序會被存下來——那不是一個假的自由度', async () => {
    const twoPieces = [
      new TradingStrategySignalSourceDto('MACD', 9, '5m', []),
      new TradingStrategySignalSourceDto('ATR', 10, '1h', []),
    ]
    const wrapper = mountWorkbench(aBot(
      group('and', comparison('a', 'MACD', 'buy'), comparison('b', 'ATR', 'buy')),
      comparison('s', 'MACD', 'sell'),
      twoPieces))
    await flushPromises()

    // 把 ATR 拖到 MACD 前面。
    await wrapper.get('[data-testid="placed-buy-ATR"]').trigger('dragstart', dragEvent())
    await wrapper.get('[data-testid="drop-buy-0"]').trigger('drop')
    await flushPromises()

    await wrapper.get('[data-testid="trading-strategy-form-save"]').trigger('click')

    const saved = wrapper.emitted('save')?.[0]?.[0] as {
      buyCondition: { conditions: { sourceLabel: string }[] }
    }
    expect(saved.buyCondition.conditions.map(child => child.sourceLabel)).toEqual(['ATR', 'MACD'])
  })
})

describe('TradingStrategyWorkbench：一塊零件收好幾個信號時，把話講明白', () => {
  it('只收一個信號時不必解釋什麼', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    expect(wrapper.find('[data-testid="plain-words-buy-MACD"]').exists()).toBe(false)
  })

  it('收兩個時說出它其實在說什麼——三塊並排的開關看起來像「而且」', async () => {
    // 一支策略腳本同一時間只吐一個信號，所以「賣出、持有」是「不是買入」，
    // 而不是一件不可能的事。使用者盯著那塊零件是想不通這件事的。
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="chip-buy-MACD-hold"]').trigger('click')

    expect(wrapper.get('[data-testid="plain-words-buy-MACD"]').text()).toContain('不是賣出')
  })

  it('三個都收時說的是另一句', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="chip-buy-MACD-hold"]').trigger('click')
    await wrapper.get('[data-testid="chip-buy-MACD-sell"]').trigger('click')

    expect(wrapper.get('[data-testid="plain-words-buy-MACD"]').text()).toContain('不管')
  })
})

describe('TradingStrategyWorkbench：把零件扣成一組', () => {
  const twoPieces = () => [
    new TradingStrategySignalSourceDto('MACD', 9, '5m', []),
    new TradingStrategySignalSourceDto('ATR', 10, '1h', []),
  ]

  function mountTwoOnBuy() {
    return mountWorkbench(aBot(
      group('and', comparison('a', 'MACD', 'buy'), comparison('b', 'ATR', 'buy')),
      comparison('s', 'MACD', 'sell'),
      twoPieces()))
  }

  it('把一塊疊到另一塊上，它們就扣成一組', async () => {
    // 這是墊子上唯一造得出巢狀的動作，也是「A 而且（B 或 C）」唯一的寫法。
    const wrapper = mountTwoOnBuy()
    await flushPromises()

    await wrapper.get('[data-testid="placed-buy-ATR"]').trigger('dragstart', dragEvent())
    await wrapper.get('[data-testid="placed-buy-MACD"]').trigger('drop')
    await flushPromises()

    expect(wrapper.find('[data-testid="item-buy-MACD+ATR"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="bundle-operator-buy-MACD+ATR"]').exists()).toBe(true)
  })

  it('一組預設用「或」合併——不然它跟直接擺兩塊沒有差別', async () => {
    const wrapper = mountTwoOnBuy()
    await flushPromises()

    await wrapper.get('[data-testid="placed-buy-ATR"]').trigger('dragstart', dragEvent())
    await wrapper.get('[data-testid="placed-buy-MACD"]').trigger('drop')
    await flushPromises()

    expect((wrapper.get('[data-testid="bundle-operator-buy-MACD+ATR"]')
      .element as HTMLSelectElement).value).toBe('or')
  })

  it('扣成一組之後存出去的就是「A 而且（B 或 C）」', async () => {
    const wrapper = mountWorkbench(aBot(
      group('and',
        comparison('a', 'MACD', 'buy'),
        comparison('b', 'ATR', 'buy'),
        comparison('c', 'EMA', 'buy')),
      comparison('s', 'MACD', 'sell'),
      [
        new TradingStrategySignalSourceDto('MACD', 9, '5m', []),
        new TradingStrategySignalSourceDto('ATR', 10, '1h', []),
        new TradingStrategySignalSourceDto('EMA', 10, '1h', []),
      ]))
    await flushPromises()

    await wrapper.get('[data-testid="placed-buy-EMA"]').trigger('dragstart', dragEvent())
    await wrapper.get('[data-testid="placed-buy-ATR"]').trigger('drop')
    await flushPromises()

    await wrapper.get('[data-testid="trading-strategy-form-save"]').trigger('click')

    const saved = wrapper.emitted('save')?.[0]?.[0] as {
      buyCondition: {
        operator: string
        conditions: { operator: string | null, sourceLabel: string, conditions: unknown[] }[]
      }
    }
    expect(saved.buyCondition.operator).toBe('and')
    expect(saved.buyCondition.conditions[0]!.sourceLabel).toBe('MACD')
    expect(saved.buyCondition.conditions[1]!.operator).toBe('or')
    expect(saved.buyCondition.conditions[1]!.conditions).toHaveLength(2)
  })

  it('把一塊從一組裡拆出來，它回到自己一格', async () => {
    const wrapper = mountWorkbench(aBot(
      group('and',
        group('or', comparison('a', 'MACD', 'buy'), comparison('b', 'ATR', 'buy'))),
      comparison('s', 'MACD', 'sell'),
      twoPieces()))
    await flushPromises()

    await wrapper.get('[data-testid="unbundle-buy-ATR"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="item-buy-MACD+ATR"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="placed-buy-ATR"]').exists()).toBe(true)
  })

  it('一組只剩一塊時自己散開——一個裝著一塊的組多一層框卻什麼都沒說', async () => {
    const wrapper = mountWorkbench(aBot(
      group('and',
        group('or', comparison('a', 'MACD', 'buy'), comparison('b', 'ATR', 'buy'))),
      comparison('s', 'MACD', 'sell'),
      twoPieces()))
    await flushPromises()

    await wrapper.get('[data-testid="take-off-buy-ATR"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="bundle-operator-buy-MACD"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="placed-buy-MACD"]').exists()).toBe(true)
  })

  it('疊到自己身上什麼都不會發生', async () => {
    const wrapper = mountTwoOnBuy()
    await flushPromises()

    await wrapper.get('[data-testid="placed-buy-MACD"]').trigger('dragstart', dragEvent())
    await wrapper.get('[data-testid="placed-buy-MACD"]').trigger('drop')
    await flushPromises()

    expect(wrapper.findAll('[data-testid^="item-buy-"]')).toHaveLength(2)
  })
})

describe('TradingStrategyWorkbench：一塊零件在這一邊要是什麼', () => {
  it('開關只長在擺上墊子的零件上——架子上的那一塊沒有這個問題', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    expect(wrapper.find('[data-testid="chip-buy-MACD-buy"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="shelf-piece-MACD"]').find('button[aria-pressed]').exists())
      .toBe(false)
  })

  it('按一下開，再按一下關', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="chip-buy-MACD-hold"]').trigger('click')
    expect(wrapper.get('[data-testid="chip-buy-MACD-hold"]').attributes('aria-pressed'))
      .toBe('true')

    await wrapper.get('[data-testid="chip-buy-MACD-hold"]').trigger('click')
    expect(wrapper.get('[data-testid="chip-buy-MACD-hold"]').attributes('aria-pressed'))
      .toBe('false')
  })

  it('同一塊零件可以同時收好幾個信號', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="chip-buy-MACD-hold"]').trigger('click')

    expect(wrapper.get('[data-testid="chip-buy-MACD-buy"]').attributes('aria-pressed'))
      .toBe('true')
    expect(wrapper.get('[data-testid="chip-buy-MACD-hold"]').attributes('aria-pressed'))
      .toBe('true')
  })

  it('改一張墊子不會動到另一張', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="chip-buy-MACD-hold"]').trigger('click')

    expect(wrapper.get('[data-testid="chip-sell-MACD-hold"]').attributes('aria-pressed'))
      .toBe('false')
  })
})

describe('TradingStrategyWorkbench：加一支策略腳本', () => {
  it('加一支就多一列，兩欄都跟著出現', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="strategy-script-add"]').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-testid="strategy-script-row"]')).toHaveLength(2)
  })

  it('刪一支就少一列，而那一列還被用著也刪得掉', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="strategy-script-remove"]').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-testid="strategy-script-row"]')).toHaveLength(0)
  })

  it('一支策略腳本都還沒有時說得出下一步', async () => {
    const wrapper = mountWorkbench(aBot(null, null, []))
    await flushPromises()

    expect(wrapper.get('[data-testid="no-sources"]').text()).toContain('加一塊零件')
  })
})

describe('TradingStrategyWorkbench：一支策略腳本自己的設定', () => {
  it('一開始收著——收起來時一支策略腳本就是一列', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    expect(wrapper.find('[data-testid="strategy-script-settings-panel"]').exists()).toBe(false)
  })

  it('按齒輪才打開，而且它開在一個彈窗裡', async () => {
    // 原地展開會把架子撐長，而架子旁邊就是兩張墊子——調一次參數
    // 不該讓工作區被推走。
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="strategy-script-settings-0"]').trigger('click')

    const panel = wrapper.get('[data-testid="strategy-script-settings-panel"]')
    expect(panel.find('[data-testid="strategy-script-label-input"]').exists()).toBe(true)
    expect(panel.find('[data-testid="strategy-script-interval-select"]').exists()).toBe(true)
    expect(panel.find('[data-testid="strategy-script-parameter-input"]').exists()).toBe(true)

    // 它不在架子那一格裡面——在裡面就是原地展開，那正是這次要換掉的東西。
    expect(wrapper.get('[data-testid="strategy-script-row"]').element
      .contains(panel.element)).toBe(false)
  })

  it('彈窗裡改名字，彈窗不會因為認不得自己開的是誰而關掉', async () => {
    // 代號正是這個彈窗裡改得動的東西之一。用代號記的話，一改名它就自己消失。
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="strategy-script-settings-0"]').trigger('click')
    await wrapper.get('[data-testid="strategy-script-label-input"]').setValue('改過名字了')
    await flushPromises()

    expect(wrapper.find('[data-testid="strategy-script-settings-panel"]').exists()).toBe(true)
  })

  it('按「好了」就關起來', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="strategy-script-settings-0"]').trigger('click')
    await wrapper.get('[data-testid="strategy-script-settings-done"]').trigger('click')

    expect(wrapper.find('[data-testid="strategy-script-settings-panel"]').exists()).toBe(false)
  })
})

describe('TradingStrategyWorkbench：存得下去嗎', () => {
  it('每一邊都有格子亮著就存得下去', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    expect(wrapper.find('[data-testid="trading-strategy-form-rejection"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="trading-strategy-form-save"]').attributes('disabled')).toBeUndefined()
  })

  it('一邊一格都沒亮就存不下去，並說得出為什麼', async () => {
    const wrapper = mountWorkbench(aBot(comparison('b', 'MACD', 'buy'), null))
    await flushPromises()

    expect(wrapper.get('[data-testid="trading-strategy-form-rejection"]').text()).toContain('兩邊都要')
    expect(wrapper.get('[data-testid="trading-strategy-form-save"]').attributes('disabled')).toBeDefined()
  })

  it('按儲存交出的是這一刻表上的那一台', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="trading-strategy-form-save"]').trigger('click')

    const saved = wrapper.emitted('save')?.[0]?.[0] as { id: number, name: string }
    expect(saved.id).toBe(7)
    expect(saved.name).toBe('黃金交叉')
  })
})

describe('TradingStrategyWorkbench：畫不出來的舊條件', () => {
  it('一組裡面還有一組的舊條件，照實說這張工作檯排不出它——不默默壓平', async () => {
    // 壓平會得到一個意思不同的條件，而使用者會在完全沒察覺的情況下把它存回去。
    const wrapper = mountWorkbench(aBot(
      group('and',
        group('or',
          comparison('a', 'MACD', 'buy'),
          group('and', comparison('b', 'ATR', 'buy'), comparison('c', 'MACD', 'sell'))),
        comparison('d', 'ATR', 'sell')),
      comparison('s', 'MACD', 'sell'),
      [
        new TradingStrategySignalSourceDto('MACD', 9, '5m', []),
        new TradingStrategySignalSourceDto('ATR', 10, '1h', []),
      ]))
    await flushPromises()

    expect(wrapper.get('[data-testid="board-unrepresentable-buy"]').text()).toContain('排不出')
    expect(wrapper.find('[data-testid="board-unrepresentable-sell"]').exists()).toBe(false)
  })
})
