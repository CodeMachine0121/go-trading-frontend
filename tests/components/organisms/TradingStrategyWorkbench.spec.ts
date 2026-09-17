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
      unusableStrategyScripts: {},
      shortage: null,
      saving: false,
      failureMessage: '',
      savedGeneration: 0,
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
      new TradingStrategySignalSourceDto('ATR', 10, '5m', []),
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
    new TradingStrategySignalSourceDto('ATR', 10, '5m', []),
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
        new TradingStrategySignalSourceDto('ATR', 10, '5m', []),
        new TradingStrategySignalSourceDto('EMA', 10, '5m', []),
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

describe('TradingStrategyWorkbench：一份交易策略只看一種粗細', () => {
  /** 送出去的那一份裡，每個信號來源各自帶的刻度。 */
  async function savedIntervalsOf(wrapper: ReturnType<typeof mountWorkbench>) {
    await wrapper.get('[data-testid="trading-strategy-form-save"]').trigger('click')

    const saved = wrapper.emitted('save')?.[0]?.[0] as {
      signalSources: { aggregationInterval: string }[]
    }

    return saved.signalSources.map(signalSource => signalSource.aggregationInterval)
  }

  function twoPiecesReading(firstInterval: string, secondInterval: string) {
    return aBot(
      comparison('b', 'MACD', 'buy'),
      comparison('s', 'MACD', 'sell'),
      [
        new TradingStrategySignalSourceDto('MACD', 9, firstInterval, []),
        new TradingStrategySignalSourceDto('ATR', 10, secondInterval, []),
      ])
  }

  it('每一塊零件的設定裡都調得動它自己的粗細', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="strategy-script-settings-0"]').trigger('click')

    expect(wrapper.find('[data-testid="strategy-script-interval-select"]').exists()).toBe(true)
  })

  it('調完就存得下去，而且存的是他挑的那一個', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="strategy-script-settings-0"]').trigger('click')
    await wrapper.get('[data-testid="strategy-script-interval-select"]').setValue('4h')
    await flushPromises()

    expect(await savedIntervalsOf(wrapper)).toEqual(['4h'])
  })

  it('每一塊都一樣時什麼都不必提', async () => {
    const wrapper = mountWorkbench(twoPiecesReading('1h', '1h'))
    await flushPromises()

    expect(wrapper.find('[data-testid="trading-strategy-form-rejection"]').exists()).toBe(false)
  })

  it('粗細不一樣時擋下來，並說出現在有哪幾種', async () => {
    // 只說「不一樣」的話，他得把每一塊零件的設定都打開一次才知道差在哪——
    // 而要做的事就是把它們調成同一個。
    const wrapper = mountWorkbench(twoPiecesReading('1h', '5m'))
    await flushPromises()

    const rejection = wrapper.get('[data-testid="trading-strategy-form-rejection"]').text()
    expect(rejection).toContain('1h')
    expect(rejection).toContain('5m')
  })

  it('擋著的時候儲存鍵按不下去', async () => {
    const wrapper = mountWorkbench(twoPiecesReading('1h', '5m'))
    await flushPromises()

    expect(wrapper.get('[data-testid="trading-strategy-form-save"]').attributes('disabled'))
      .toBeDefined()
  })

  it('把那一塊調回來就送得出去了', async () => {
    const wrapper = mountWorkbench(twoPiecesReading('1h', '5m'))
    await flushPromises()

    await wrapper.get('[data-testid="strategy-script-settings-1"]').trigger('click')
    await wrapper.get('[data-testid="strategy-script-interval-select"]').setValue('1h')
    await flushPromises()

    expect(wrapper.find('[data-testid="trading-strategy-form-rejection"]').exists()).toBe(false)
    expect(await savedIntervalsOf(wrapper)).toEqual(['1h', '1h'])
  })

  it('後來才加的零件跟著架上已經有的那幾塊', async () => {
    // 一加零件就撞到那句提醒，等於每次都要他去修一件他沒做過的事。
    const wrapper = mountWorkbench(twoPiecesReading('1d', '1d'))
    await flushPromises()

    await wrapper.get('[data-testid="strategy-script-add"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="trading-strategy-form-rejection"]').exists()).toBe(false)
    expect(await savedIntervalsOf(wrapper)).toEqual(['1d', '1d', '1d'])
  })

  it('架上每一塊零件旁邊看得到它自己的粗細', async () => {
    // 它們現在真的可能不一樣，所以那一行又是資訊了——
    // 而且是他不必打開任何設定就找得出哪一塊落單的方式。
    const wrapper = mountWorkbench(twoPiecesReading('1h', '5m'))
    await flushPromises()

    expect(wrapper.get('[data-testid="shelf-piece-MACD"]').text()).toContain('一小時')
    expect(wrapper.get('[data-testid="shelf-piece-ATR"]').text()).toContain('五分鐘')
  })
})

describe('TradingStrategyWorkbench：存好之後', () => {
  it('存好之後再離開不會被攔——基準跟著存成功往前走', async () => {
    // 儲存不再離開這一頁，所以基準留在原地的話，他會在一個**已經存好**的頁面上
    // 被問「還沒存，確定要離開嗎」。
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="trading-strategy-name-input"]').setValue('改過的名字')
    await flushPromises()
    expect(wrapper.emitted('dirtyChange')?.at(-1)?.[0]).toBe(true)

    await wrapper.setProps({ savedGeneration: 1 })
    await flushPromises()

    expect(wrapper.emitted('dirtyChange')?.at(-1)?.[0]).toBe(false)
  })

  it('存好之後又改了一點東西，就又算改過了', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.setProps({ savedGeneration: 1 })
    await wrapper.get('[data-testid="trading-strategy-name-input"]').setValue('再改一次')
    await flushPromises()

    expect(wrapper.emitted('dirtyChange')?.at(-1)?.[0]).toBe(true)
  })

  it('表單底下只剩一顆鍵——「取消」旁邊放著一顆不會離開的「儲存」讀不通', async () => {
    // 回清單那顆按鈕在這一頁頂端，而且說得出自己要去哪。
    const wrapper = mountWorkbench()
    await flushPromises()

    expect(wrapper.text()).not.toContain('取消')
  })
  it('要存的是哪一份,每次都重新問一次外面交回來的那一份', async () => {
    // 這是留在原地最危險的那一個後果擋在哪裡：拼好一份新的存下來之後，
    // 外面把剛建好的那一份交回來,而下一次儲存必須變成「改它」——
    // 識別碼沒跟上的話,他再按一次就多出第二份一模一樣的。
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="trading-strategy-form-save"]').trigger('click')
    expect((wrapper.emitted('save')?.at(-1)?.[0] as { id?: number }).id).toBe(7)

    const anotherOne = new TradingStrategyDto(
      99, '黃金交叉',
      [new TradingStrategySignalSourceDto('MACD', 9, '5m', [])],
      comparison('b', 'MACD', 'buy'),
      comparison('s', 'MACD', 'sell'))
    await wrapper.setProps({ editing: anotherOne, savedGeneration: 1 })
    await flushPromises()

    await wrapper.get('[data-testid="trading-strategy-form-save"]').trigger('click')
    expect((wrapper.emitted('save')?.at(-1)?.[0] as { id?: number }).id).toBe(99)
  })
})

describe('TradingStrategyWorkbench：零件指著一支挑不得的策略腳本', () => {
  /** 一塊指著 11 號的零件，而 11 號不在選單裡。 */
  function withAStrayPiece(unusableStrategyScripts: Record<number, string>) {
    return mount(TradingStrategyWorkbench, {
      props: {
        editing: aBot(
          comparison('b', '壞掉的', 'buy'),
          comparison('s', '壞掉的', 'sell'),
          [new TradingStrategySignalSourceDto('壞掉的', 11, '5m', [])]),
        strategyScriptOptions: [{ value: 9, label: 'MACD' }],
        parameterNamesByStrategyScriptId: { 9: ['快線期數'] },
        unusableStrategyScripts,
        shortage: null,
        saving: false,
        failureMessage: '',
        savedGeneration: 0,
      },
    })
  }

  it('選單不是一片空白——它說得出這塊零件用的是哪一支、為什麼用不了', async () => {
    // 空白看起來像「還沒選」。使用者因此不知道自己正看著一塊壞掉的零件，
    // 會按下儲存、得到一句後端的拒絕，然後回來對著一個空白的選單。
    const wrapper = withAStrayPiece({ 11: '吐一個數字的（這支不吐訊號，當不了信號來源）' })
    await flushPromises()

    await wrapper.get('[data-testid="strategy-script-settings-0"]').trigger('click')
    await flushPromises()

    const strayOption = wrapper.get('[data-testid="strategy-script-stray-option"]')
    expect(strayOption.text()).toContain('吐一個數字的')
    // 說得出，但按不下去——挑得到就等於讓人拼出一份後端會拒絕的交易策略。
    expect(strayOption.attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-testid="strategy-script-stray-note"]').exists()).toBe(true)
  })

  it('那一支根本不在了也照樣說一句——「不見了」與「不能用」要做的事一樣', async () => {
    const wrapper = withAStrayPiece({})
    await flushPromises()

    await wrapper.get('[data-testid="strategy-script-settings-0"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="strategy-script-stray-option"]').text()).toContain('11')
  })

  it('指著一支挑得到的策略腳本時，選單裡沒有那一行多出來的東西', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="strategy-script-settings-0"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="strategy-script-stray-option"]').exists()).toBe(false)
  })
})

describe('TradingStrategyWorkbench：一支策略腳本都挑不到時，架子說得出是哪一種', () => {
  function withShortage(shortage: 'noStrategyScripts' | 'noSignalStrategyScripts') {
    return mount(TradingStrategyWorkbench, {
      props: {
        editing: null,
        strategyScriptOptions: [],
        parameterNamesByStrategyScriptId: {},
        unusableStrategyScripts: {},
        shortage,
        saving: false,
        failureMessage: '',
        savedGeneration: 0,
      },
    })
  }

  it('一支都沒建過——下一步是去建一支', async () => {
    const wrapper = withShortage('noStrategyScripts')
    await flushPromises()

    expect(wrapper.find('[data-testid="no-strategy-scripts"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="no-signal-strategy-scripts"]').exists()).toBe(false)
  })

  it('建了幾支、但沒有一支吐訊號——下一步是去改它們的指標值種類', async () => {
    // 兩種說同一句話的話，他只會去建第五支同樣用不了的腳本。
    const wrapper = withShortage('noSignalStrategyScripts')
    await flushPromises()

    const note = wrapper.get('[data-testid="no-signal-strategy-scripts"]')
    expect(note.text()).toContain('一個信號')
    expect(wrapper.find('[data-testid="no-strategy-scripts"]').exists()).toBe(false)
  })

  it('挑不到的時候加不了零件——按了只會得到一個空的下拉選單', async () => {
    const wrapper = withShortage('noSignalStrategyScripts')
    await flushPromises()

    expect(wrapper.find('[data-testid="strategy-script-add"]').exists()).toBe(false)
  })
})

describe('TradingStrategyWorkbench：把零件從一組裡拖出來', () => {
  /** 買入墊子上一組（B、A）加上獨立的 C。 */
  function withABundle() {
    return mountWorkbench(aBot(
      group('and',
        group('or', comparison('b1', 'MACD', 'buy'), comparison('a1', 'ATR', 'buy')),
        comparison('c1', 'RSI', 'buy')),
      comparison('s', 'MACD', 'sell'),
      [
        new TradingStrategySignalSourceDto('MACD', 9, '5m', []),
        new TradingStrategySignalSourceDto('ATR', 10, '5m', []),
        new TradingStrategySignalSourceDto('RSI', 9, '5m', []),
      ]))
  }

  it('沒拿東西的時候格與格之間只是一條髮絲——永遠攤開的帶子多數時間只是噪音', async () => {
    const wrapper = withABundle()
    await flushPromises()

    expect(wrapper.get('[data-testid="drop-buy-0"]').classes())
      .not.toContain('mat__drop-line--open')
  })

  it('拿起一塊零件，縫就張開成一條真的放得下去的帶子', async () => {
    // 沒有它，「把零件從一組裡拖出來」唯一的落點是一條看不見的髮絲線——
    // 也就是做不到。
    const wrapper = withABundle()
    await flushPromises()

    await wrapper.get('[data-testid="placed-buy-ATR"]').trigger('dragstart', dragEvent())
    await flushPromises()

    expect(wrapper.get('[data-testid="drop-buy-0"]').classes())
      .toContain('mat__drop-line--open')
    expect(wrapper.get('[data-testid="drop-buy-1"]').classes())
      .toContain('mat__drop-line--open')
  })

  it('拖出去放到那條帶子上，它就從那一組裡出來了', async () => {
    const wrapper = withABundle()
    await flushPromises()

    await wrapper.get('[data-testid="placed-buy-ATR"]').trigger('dragstart', dragEvent())
    await wrapper.get('[data-testid="drop-buy-1"]').trigger('drop')
    await flushPromises()

    expect(wrapper.find('[data-testid="item-buy-MACD+ATR"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="item-buy-ATR"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="item-buy-MACD"]').exists()).toBe(true)
  })

  it('放掉之後帶子收回去', async () => {
    const wrapper = withABundle()
    await flushPromises()

    await wrapper.get('[data-testid="placed-buy-ATR"]').trigger('dragstart', dragEvent())
    await wrapper.get('[data-testid="placed-buy-ATR"]').trigger('dragend')
    await flushPromises()

    expect(wrapper.get('[data-testid="drop-buy-0"]').classes())
      .not.toContain('mat__drop-line--open')
  })
})

describe('TradingStrategyWorkbench：帶子說得出放下去會發生什麼', () => {
  function withABundle() {
    return mountWorkbench(aBot(
      group('and',
        group('or', comparison('b1', 'MACD', 'buy'), comparison('a1', 'ATR', 'buy')),
        comparison('c1', 'RSI', 'buy')),
      comparison('s', 'MACD', 'sell'),
      [
        new TradingStrategySignalSourceDto('MACD', 9, '5m', []),
        new TradingStrategySignalSourceDto('ATR', 10, '5m', []),
        new TradingStrategySignalSourceDto('RSI', 9, '5m', []),
      ]))
  }

  it('拿的是組裡那一塊時，帶子說它會被拆出來', async () => {
    // 不說的話，「拖出去就是拆開」這件事只有試過一次的人才知道。
    const wrapper = withABundle()
    await flushPromises()

    await wrapper.get('[data-testid="placed-buy-ATR"]').trigger('dragstart', dragEvent())
    await wrapper.get('[data-testid="drop-buy-1"]').trigger('dragover')
    await flushPromises()

    expect(wrapper.get('[data-testid="drop-buy-1"]').text()).toContain('拆出來')
  })

  it('拿的是獨立的那一塊時，同一條帶子只說搬到這裡', async () => {
    const wrapper = withABundle()
    await flushPromises()

    await wrapper.get('[data-testid="placed-buy-RSI"]').trigger('dragstart', dragEvent())
    await wrapper.get('[data-testid="drop-buy-0"]').trigger('dragover')
    await flushPromises()

    const hint = wrapper.get('[data-testid="drop-buy-0"]').text()
    expect(hint).toContain('放這裡')
    expect(hint).not.toContain('拆出來')
  })

  it('只有正被懸著的那一條說話——四條同時寫同一句，那句就變成背景', async () => {
    const wrapper = withABundle()
    await flushPromises()

    await wrapper.get('[data-testid="placed-buy-ATR"]').trigger('dragstart', dragEvent())
    await wrapper.get('[data-testid="drop-buy-1"]').trigger('dragover')
    await flushPromises()

    expect(wrapper.get('[data-testid="drop-buy-0"]').text()).toBe('')
  })
})

describe('TradingStrategyWorkbench：零件的每一處都拿得起來', () => {
  // 一塊零件的下半張臉是三顆信號開關，右上角還有兩顆小按鈕。原生拖曳不會從一個
  // button 上起頭，所以那幾顆過去等於在零件身上挖了幾個洞：按在上面往下拉什麼都
  // 不會發生，而使用者看到的是一塊有時拖得動、有時拖不動的積木。

  it('按在信號開關上拖，拿起來的是整塊零件', async () => {
    const wrapper = mountWorkbench(aBot(comparison('b', 'MACD', 'buy'), null))
    await flushPromises()

    await wrapper.get('[data-testid="chip-buy-MACD-buy"]').trigger('dragstart', dragEvent())
    await wrapper.get('[data-testid="drop-sell-end"]').trigger('drop')
    await flushPromises()

    expect(wrapper.find('[data-testid="placed-sell-MACD"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="placed-buy-MACD"]').exists()).toBe(false)
  })

  it('按在「拿回架子上」那顆按鈕上拖，也是拿起整塊零件', async () => {
    const wrapper = mountWorkbench(aBot(comparison('b', 'MACD', 'buy'), null))
    await flushPromises()

    await wrapper.get('[data-testid="take-off-buy-MACD"]').trigger('dragstart', dragEvent())
    await wrapper.get('[data-testid="drop-sell-end"]').trigger('drop')
    await flushPromises()

    expect(wrapper.find('[data-testid="placed-sell-MACD"]').exists()).toBe(true)
  })

  it('那幾顆按鈕仍然是按鈕——沒有移動就不是一次拖曳', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="take-off-buy-MACD"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="placed-buy-MACD"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="chip-sell-MACD-sell"]').attributes('aria-pressed'))
      .toBe('true')
  })

  it('零件身上沒有一塊按下去拖不動的地方', async () => {
    const wrapper = mountWorkbench(aBot(comparison('b', 'MACD', 'buy'), null))
    await flushPromises()

    const undraggable = wrapper.get('[data-testid="placed-buy-MACD"]')
      .findAll('button')
      .filter(button => button.attributes('draggable') !== 'true')

    expect(undraggable).toHaveLength(0)
  })

  it('架子上那幾塊也一樣——同一塊積木不該有些地方拖得動、有些拖不動', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="strategy-script-remove"]').trigger('dragstart', dragEvent())
    await wrapper.get('[data-testid="drop-sell-end"]').trigger('drop')
    await flushPromises()

    expect(wrapper.find('[data-testid="placed-sell-MACD"]').exists()).toBe(true)
    // 拖過去不等於刪掉：那顆按鈕按下去才是刪掉。
    expect(wrapper.find('[data-testid="shelf-piece-MACD"]').exists()).toBe(true)
  })
})
