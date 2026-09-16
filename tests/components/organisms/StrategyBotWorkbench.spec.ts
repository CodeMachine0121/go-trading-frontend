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

function comparison(nodeId: string, sourceLabel: string, signal = 'buy') {
  return new StrategyBotConditionDto(nodeId, null, [], sourceLabel, signal)
}

function group(nodeId: string, ...children: StrategyBotConditionDto[]) {
  return new StrategyBotConditionDto(nodeId, 'and', children, '', '')
}

function aStoredBot(
  buyCondition: StrategyBotConditionDto | null = comparison('buy-1', 'A'),
  sellCondition: StrategyBotConditionDto | null = comparison('sell-1', 'A', 'sell'),
) {
  return new StrategyBotDto(
    7, '早盤突破', 'BTCUSDT', 5,
    [new StrategyBotSignalSourceDto('A', 9, '1h', [])],
    buyCondition, sellCondition, stoppedState(),
  )
}

/** 材料準備好了、但一塊都還沒拼的一台——兩棵樹各是一個洞。 */
const anUnbuiltBot = () => aStoredBot(null, null)

function mountWorkbench(editing: StrategyBotDto | null = aStoredBot()) {
  const wrapper = mount(StrategyBotWorkbench, {
    props: {
      editing,
      tradingSymbolApplication: new TradingSymbolApplication(new TradingSymbolService({
        findTradingSymbols: vi.fn().mockResolvedValue([buildTradingSymbol('BTCUSDT')]),
      })),
      strategyOptions: [{ value: 9, label: '均線' }],
      parameterNamesByStrategyId: { 9: ['回看根數'] },
      saving: false,
      failureMessage: '',
    },
    global: { stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
  })

  return wrapper
}

describe('StrategyBotWorkbench 的兩棵樹', () => {
  it('買入與賣出同時看得見——不必切換才看得到另一棵', async () => {
    // 一台機器人的兩個條件同時成立時它什麼都不會說，
    // 而那件事只有在兩棵並排時才看得出來。
    const wrapper = mountWorkbench()
    await flushPromises()

    expect(wrapper.text()).toContain('什麼情況算買入')
    expect(wrapper.text()).toContain('什麼情況算賣出')
  })

  it('空的那一棵畫成一個洞，不是一片空白', async () => {
    // 空白跟「這裡本來就不需要東西」長得一樣。
    const wrapper = mountWorkbench(anUnbuiltBot())
    await flushPromises()

    expect(wrapper.findAll('[data-testid="condition-hole"]')).toHaveLength(2)
  })

  it('改一棵不會動到另一棵', async () => {
    const wrapper = mountWorkbench(anUnbuiltBot())
    await flushPromises()

    const holesBefore = wrapper.findAll('[data-testid="condition-hole"]')
    await holesBefore[0]!.trigger('click')
    await wrapper.get('[data-testid="block-comparison:A:"]').trigger('click')
    await flushPromises()

    // 賣出那一邊仍然是一個洞。
    expect(wrapper.findAll('[data-testid="condition-hole"]')).toHaveLength(1)
    expect(wrapper.findAll('[data-testid="condition-comparison"]')).toHaveLength(1)
  })
})

describe('StrategyBotWorkbench 的積木抽屜', () => {
  it('點一個空位，放得進去的那幾塊才按得下去', async () => {
    const wrapper = mountWorkbench(anUnbuiltBot())
    await flushPromises()

    // 按不下去用 aria-disabled 標而不是 disabled：後者連拖曳事件都收不到，
    // 而這幾塊必須隨時拖得動。
    expect(wrapper.get('[data-testid="block-comparison:A:"]').attributes('aria-disabled'))
      .toBe('true')

    await wrapper.findAll('[data-testid="condition-hole"]')[0]!.trigger('click')

    expect(wrapper.get('[data-testid="block-comparison:A:"]').attributes('aria-disabled'))
      .toBe('false')
  })

  it('點一塊群組進去，裡面就是兩個新的空位', async () => {
    const wrapper = mountWorkbench(anUnbuiltBot())
    await flushPromises()

    await wrapper.findAll('[data-testid="condition-hole"]')[0]!.trigger('click')
    await wrapper.get('[data-testid="block-group::and"]').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-testid="condition-group"]')).toHaveLength(1)
    // 買入那個群組裡兩個，加上賣出那一棵自己的一個。
    expect(wrapper.findAll('[data-testid="condition-hole"]')).toHaveLength(3)
  })

  it('一個來源都沒宣告時，抽屜說得出要先去加一個', async () => {
    const wrapper = mountWorkbench(new StrategyBotDto(
      7, '早盤突破', 'BTCUSDT', 5, [], null, null, stoppedState()))
    await flushPromises()

    expect(wrapper.get('[data-testid="block-drawer-hint"]').text()).toContain('信號來源')
  })
})

describe('StrategyBotWorkbench 上每一塊自己的狀態', () => {
  it('還不夠兩塊的群組自己標出來，不必等到按儲存', async () => {
    const wrapper = mountWorkbench(aStoredBot(group('g', comparison('a', 'A'))))
    await flushPromises()

    expect(wrapper.get('[data-testid="status-g"]').text()).toContain('2')
  })

  it('還沒選信號的比對自己標出來', async () => {
    const wrapper = mountWorkbench(aStoredBot(comparison('c', 'A', '')))
    await flushPromises()

    expect(wrapper.get('[data-testid="status-c"]').text()).toContain('等於什麼')
  })

  it('指向一個不存在的來源是另一種說法，不是還沒填完', async () => {
    // 兩種壞法使用者的下一步不一樣：一個是再填一點，一個是有東西被刪掉了。
    const wrapper = mountWorkbench(aStoredBot(comparison('c', '早就不在了')))
    await flushPromises()

    expect(wrapper.get('[data-testid="status-c"]').text()).toContain('找不到')
    expect(wrapper.get('[data-testid="condition-comparison"]').classes())
      .toContain('condition-node--unknownSource')
  })

  it('每一塊都好了就沒有任何標示，而且存得下去', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    expect(wrapper.find('[data-testid="bot-form-rejection"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="bot-form-save"]').attributes('disabled')).toBeUndefined()
  })

  it('有一塊沒填完就存不下去，並說得出是哪一件事', async () => {
    const wrapper = mountWorkbench(aStoredBot(group('g', comparison('a', 'A'))))
    await flushPromises()

    expect(wrapper.get('[data-testid="bot-form-rejection"]').text()).toContain('買入條件')
    expect(wrapper.get('[data-testid="bot-form-save"]').attributes('disabled')).toBeDefined()
  })
})

describe('StrategyBotWorkbench 交出去的那一份', () => {
  it('按儲存交出的是這一刻拼出來的那一台', async () => {
    const wrapper = mountWorkbench()
    await flushPromises()

    await wrapper.get('[data-testid="bot-form-save"]').trigger('click')

    const saved = wrapper.emitted('save')?.[0]?.[0] as { id: number, name: string }
    expect(saved.id).toBe(7)
    expect(saved.name).toBe('早盤突破')
  })

  it('一開始沒有被改過，改一下就說它被改過了', async () => {
    // 巢狀條件是花時間拼出來的，靜靜丟掉太貴；但什麼都沒改時攔人，
    // 第三次之後就沒有人會讀那句話了。
    const wrapper = mountWorkbench()
    await flushPromises()

    expect(wrapper.emitted('dirtyChange')?.at(-1)?.[0]).toBe(false)

    await wrapper.get('[data-testid="bot-name-input"]').setValue('改過名字了')
    await flushPromises()

    expect(wrapper.emitted('dirtyChange')?.at(-1)?.[0]).toBe(true)
  })
})

describe('StrategyBotWorkbench 的拖拉', () => {
  /** 讓拖曳事件帶得動一個 dataTransfer——瀏覽器會給，happy-dom 不會。 */
  function dragEvent(): Partial<DragEvent> {
    return { dataTransfer: { setData: vi.fn() } as unknown as DataTransfer }
  }

  it('從抽屜拖一塊到空位上，它就放進去了', async () => {
    const wrapper = mountWorkbench(anUnbuiltBot())
    await flushPromises()

    await wrapper.get('[data-testid="block-comparison:A:"]').trigger('dragstart', dragEvent())
    await wrapper.findAll('[data-testid="condition-hole"]')[0]!.trigger('drop')
    await flushPromises()

    expect(wrapper.findAll('[data-testid="condition-comparison"]')).toHaveLength(1)
  })

  it('拖到一半，收得下的空位與收不下的長得不一樣', async () => {
    // 落點問的與抽屜問的是同一個方法，所以一塊按得下去的積木一定也放得進去。
    const wrapper = mountWorkbench(anUnbuiltBot())
    await flushPromises()

    const idle = wrapper.findAll('[data-testid="condition-hole"]')[0]!
    expect(idle.classes()).toContain('condition-hole--idle')

    await wrapper.get('[data-testid="block-comparison:A:"]').trigger('dragstart', dragEvent())

    expect(wrapper.findAll('[data-testid="condition-hole"]')[0]!.classes())
      .toContain('condition-hole--accepting')
  })

  it('放開之後就不再有人在拖——沒放成也一樣', async () => {
    const wrapper = mountWorkbench(anUnbuiltBot())
    await flushPromises()

    await wrapper.get('[data-testid="block-comparison:A:"]').trigger('dragstart', dragEvent())
    await wrapper.get('[data-testid="block-comparison:A:"]').trigger('dragend')

    expect(wrapper.findAll('[data-testid="condition-hole"]')[0]!.classes())
      .toContain('condition-hole--idle')
  })

  it('搬一個群組就是搬走它底下的一整串', async () => {
    const wrapper = mountWorkbench(
      aStoredBot(group('outer', group('inner', comparison('a', 'A'), comparison('b', 'A')),
        comparison('c', 'A')), null))
    await flushPromises()

    // 內層那個群組拖到賣出那一棵的空位上。
    await wrapper.get('[data-testid="condition-group"]').trigger('dragstart', dragEvent())

    // 賣出那一棵是空的，所以畫面上最後一個洞就是它。
    const holes = wrapper.findAll('[data-testid="condition-hole"]')
    await holes[holes.length - 1]!.trigger('drop')
    await flushPromises()

    // 三句比對一句都沒少：搬的是一整串，不是把它拆開。
    expect(wrapper.findAll('[data-testid="condition-comparison"]')).toHaveLength(3)
    expect(wrapper.findAll('[data-testid="condition-group"]')).toHaveLength(2)
  })
})

describe('StrategyBotWorkbench 把一塊丟掉的兩條路', () => {
  function dragEvent(): Partial<DragEvent> {
    return { dataTransfer: { setData: vi.fn() } as unknown as DataTransfer }
  }

  it('那顆移除鍵按下去就沒了', async () => {
    const wrapper = mountWorkbench(aStoredBot(group('g', comparison('a', 'A'),
      comparison('b', 'A'), comparison('c', 'A')), null))
    await flushPromises()

    await wrapper.get('[data-testid="remove-a"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="remove-a"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="condition-comparison"]')).toHaveLength(2)
  })

  it('沒有人在拖的時候，那一格丟掉用的位子不在', async () => {
    // 一個永遠掛在那裡的垃圾桶，多數時間只是一塊佔著位子的紅色。
    const wrapper = mountWorkbench()
    await flushPromises()

    expect(wrapper.find('[data-testid="buy-bin"]').exists()).toBe(false)
  })

  it('拖起樹上的一塊，那一格就出現', async () => {
    const wrapper = mountWorkbench(aStoredBot(group('g', comparison('a', 'A'),
      comparison('b', 'A'), comparison('c', 'A')), null))
    await flushPromises()

    await wrapper.findAll('[data-testid="condition-comparison"]')[0]!
      .trigger('dragstart', dragEvent())

    expect(wrapper.find('[data-testid="buy-bin"]').exists()).toBe(true)
    // 丟掉那一格只屬於正被拖著的那一棵。
    expect(wrapper.find('[data-testid="sell-bin"]').exists()).toBe(false)
  })

  it('拖到那一格上放開，那一塊就沒了', async () => {
    const wrapper = mountWorkbench(aStoredBot(group('g', comparison('a', 'A'),
      comparison('b', 'A'), comparison('c', 'A')), null))
    await flushPromises()

    await wrapper.findAll('[data-testid="condition-comparison"]')[0]!
      .trigger('dragstart', dragEvent())
    await wrapper.get('[data-testid="buy-bin"]').trigger('drop')
    await flushPromises()

    expect(wrapper.findAll('[data-testid="condition-comparison"]')).toHaveLength(2)
  })

  it('從抽屜拖出來的那一塊丟不掉——它本來就不在樹上', async () => {
    const wrapper = mountWorkbench(aStoredBot(group('g', comparison('a', 'A'),
      comparison('b', 'A'), comparison('c', 'A')), null))
    await flushPromises()

    await wrapper.get('[data-testid="block-comparison:A:"]').trigger('dragstart', dragEvent())

    expect(wrapper.find('[data-testid="buy-bin"]').exists()).toBe(false)
  })
})
