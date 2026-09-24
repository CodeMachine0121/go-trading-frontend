// @vitest-environment nuxt
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TradingStrategyConditionCard from '~/components/organisms/TradingStrategyConditionCard.vue'
import {
  ConditionBoardDto,
  ConditionBoardItemDto,
  ConditionBoardPieceDto,
} from '~/domain/models/dto/condition-board-dto'

function piece(sourceLabel: string) {
  return new ConditionBoardPieceDto(sourceLabel, ['buy'])
}

/** 一組（MACD、ATR）加上獨立的 RSI——最常見的形狀。 */
function aBoardWithABundle(representable = true) {
  return new ConditionBoardDto('and', [
    new ConditionBoardItemDto('or', [piece('MACD'), piece('ATR')]),
    new ConditionBoardItemDto(null, [piece('RSI')]),
  ], representable)
}

const SIGNAL_OPTIONS = [
  { value: 'buy', label: '買入' },
  { value: 'sell', label: '賣出' },
  { value: 'hold', label: '持有' },
]

function mountCard(board = aBoardWithABundle(), sourceLabels = ['MACD', 'ATR', 'RSI', 'KD']) {
  return mount(TradingStrategyConditionCard, {
    props: {
      side: 'buy' as const,
      heading: '什麼算買入',
      board,
      sourceLabels,
      signalOptions: SIGNAL_OPTIONS,
      selected: true,
      settingsPlacement: 'beside' as const,
    },
  })
}

describe('TradingStrategyConditionCard：卡上讀成一句話', () => {
  it.each([
    { itemKey: 'MACD+ATR', expected: 'MACD 等於 買入 或 ATR 等於 買入' },
    { itemKey: 'RSI', expected: 'RSI 等於 買入' },
  ])('「$itemKey」那一格讀成「$expected」', ({ itemKey, expected }) => {
    const wrapper = mountCard()

    expect(wrapper.get(`[data-testid="item-buy-${itemKey}"] [data-testid="condition-clause-sentence"]`).text())
      .toBe(expected)
  })

  it('排不出來的舊條件照實說，不默默壓平', () => {
    const wrapper = mountCard(aBoardWithABundle(false))

    expect(wrapper.get('[data-testid="board-unrepresentable-buy"]').text()).toContain('排不出')
  })
})

describe('TradingStrategyConditionCard：扣在一起的那幾條', () => {
  it('一組的設定裡有它們之間怎麼合併', async () => {
    const wrapper = mountCard()

    await wrapper.get('[data-testid="item-buy-MACD+ATR"]').trigger('click')

    expect(wrapper.find('[data-testid="bundle-operator-buy-MACD+ATR"]').exists()).toBe(true)
  })

  it.each([
    { itemKey: 'MACD+ATR', label: 'ATR', expected: true },
    { itemKey: 'RSI', label: 'RSI', expected: false },
  ])('只有扣在一起的那幾條才有「拆出來」（$label）', async ({ itemKey, label, expected }) => {
    const wrapper = mountCard()

    await wrapper.get(`[data-testid="item-buy-${itemKey}"]`).trigger('click')

    expect(wrapper.find(`[data-testid="unbundle-buy-${label}"]`).exists()).toBe(expected)
  })

  it('按「拆出來」就把那一條拆出來', async () => {
    const wrapper = mountCard()

    await wrapper.get('[data-testid="item-buy-MACD+ATR"]').trigger('click')
    await wrapper.get('[data-testid="unbundle-buy-ATR"]').trigger('click')

    expect(wrapper.emitted('unbundle')?.at(-1)).toEqual(['ATR'])
  })

  it('整組拆開時從最後一條往前拆，第一條不必拆', async () => {
    const wrapper = mountCard()

    await wrapper.get('[data-testid="item-buy-MACD+ATR"]').trigger('click')
    await wrapper.get('[data-testid="split-buy-MACD+ATR"]').trigger('click')

    expect(wrapper.emitted('unbundle')).toEqual([['ATR']])
  })

  it('換掉一組的且／或，報的是那一組', async () => {
    const wrapper = mountCard()

    await wrapper.get('[data-testid="item-buy-MACD+ATR"]').trigger('click')
    await wrapper.get('[data-testid="bundle-operator-buy-MACD+ATR"]').findAll('button')[0]!.trigger('click')

    expect(wrapper.emitted('changeBundleOperator')?.at(-1)).toEqual(['MACD+ATR', 'and'])
  })

  it('和一條單獨的扣成一組時，把它拉過來——這一條留在原地、排在前面', async () => {
    const board = new ConditionBoardDto('and', [
      new ConditionBoardItemDto(null, [piece('RSI')]),
      new ConditionBoardItemDto(null, [piece('MACD')]),
    ], true)
    const wrapper = mountCard(board)

    await wrapper.get('[data-testid="item-buy-RSI"]').trigger('click')
    await wrapper.get('[data-testid="bundle-with-buy-RSI"]').setValue('MACD')

    expect(wrapper.emitted('bundleOnto')?.at(-1)).toEqual(['MACD', 'RSI'])
  })

  it('和一組扣在一起時，是把這一條加進那一組', async () => {
    const wrapper = mountCard()

    await wrapper.get('[data-testid="item-buy-RSI"]').trigger('click')
    await wrapper.get('[data-testid="bundle-with-buy-RSI"]').setValue('MACD')

    expect(wrapper.emitted('bundleOnto')?.at(-1)).toEqual(['RSI', 'MACD'])
  })

  it('從一組那邊把另一條加進來', async () => {
    const wrapper = mountCard()

    await wrapper.get('[data-testid="item-buy-MACD+ATR"]').trigger('click')
    await wrapper.get('[data-testid="bundle-into-buy-MACD+ATR"]').setValue('RSI')

    expect(wrapper.emitted('bundleOnto')?.at(-1)).toEqual(['RSI', 'MACD'])
  })
})

describe('TradingStrategyConditionCard：用點的加一條、改一條', () => {
  it('挑一個還沒擺上來的來源與一個信號，報上去的就是那一條', async () => {
    const wrapper = mountCard()

    await wrapper.get('[data-testid="clause-add-buy"]').trigger('click')
    await wrapper.get('[data-testid="clause-signal-buy"]').setValue('hold')
    await wrapper.get('[data-testid="clause-confirm-buy"]').trigger('click')

    expect(wrapper.emitted('addClause')?.at(-1)).toEqual(['KD', 'hold'])
  })

  it('頂層的且／或是一枚分段選擇，按下去就報上去', async () => {
    const wrapper = mountCard()

    await wrapper.get('[data-testid="operator-buy"]').findAll('button')[1]!.trigger('click')

    expect(wrapper.emitted('changeOperator')?.at(-1)).toEqual(['or'])
  })

  it('按一下信號開關，報的是那一條的那一個信號', async () => {
    const wrapper = mountCard()

    await wrapper.get('[data-testid="item-buy-RSI"]').trigger('click')
    await wrapper.get('[data-testid="chip-buy-RSI-sell"]').trigger('click')

    expect(wrapper.emitted('toggleSignal')?.at(-1)).toEqual(['RSI', 'sell'])
  })

  it('拿掉一條', async () => {
    const wrapper = mountCard()

    await wrapper.get('[data-testid="item-buy-RSI"]').trigger('click')
    await wrapper.get('[data-testid="take-off-buy-RSI"]').trigger('click')

    expect(wrapper.emitted('takeOff')?.at(-1)).toEqual(['RSI'])
  })

  it('第一格往前挪不動，最後一格往後挪不動', async () => {
    const wrapper = mountCard()

    await wrapper.get('[data-testid="item-buy-RSI"]').trigger('click')

    expect(wrapper.get('[data-testid="move-later-buy-RSI"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-testid="move-earlier-buy-RSI"]').trigger('click')
    expect(wrapper.emitted('placeAt')?.at(-1)).toEqual(['RSI', 0])
  })
})
