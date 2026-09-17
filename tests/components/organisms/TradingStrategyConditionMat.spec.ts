// @vitest-environment nuxt
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TradingStrategyConditionMat from '~/components/organisms/TradingStrategyConditionMat.vue'
import {
  ConditionBoardDto,
  ConditionBoardItemDto,
  ConditionBoardPieceDto,
} from '~/domain/models/dto/condition-board-dto'

function piece(sourceLabel: string) {
  return new ConditionBoardPieceDto(sourceLabel, ['buy'])
}

/** 一組（MACD、ATR）加上獨立的 RSI——工作檯上最常見的形狀。 */
function aBoardWithABundle() {
  return new ConditionBoardDto('and', [
    new ConditionBoardItemDto('or', [piece('MACD'), piece('ATR')]),
    new ConditionBoardItemDto(null, [piece('RSI')]),
  ], true)
}

function mountMat(carrying: string | null, hoveringAt: number | null = null) {
  return mount(TradingStrategyConditionMat, {
    props: {
      board: aBoardWithABundle(),
      heading: '買入',
      side: 'buy' as const,
      hoveringAt,
      carrying,
    },
  })
}

describe('TradingStrategyConditionMat：格與格之間那條縫', () => {
  it('沒拿東西的時候只是一條髮絲——永遠攤開的帶子多數時間只是噪音', () => {
    const wrapper = mountMat(null)

    expect(wrapper.get('[data-testid="drop-buy-0"]').classes())
      .not.toContain('mat__drop-line--open')
  })

  it('拿著一塊零件的時候張開成一條真的放得下去的帶子', () => {
    // 沒有它，「把零件從一組裡拖出來」唯一的落點是一條看不見的髮絲線——
    // 也就是做不到。
    const wrapper = mountMat('ATR')

    expect(wrapper.get('[data-testid="drop-buy-0"]').classes())
      .toContain('mat__drop-line--open')
    expect(wrapper.get('[data-testid="drop-buy-1"]').classes())
      .toContain('mat__drop-line--open')
  })

  it('只有正被懸著的那一條亮起來', () => {
    const wrapper = mountMat('ATR', 1)

    expect(wrapper.get('[data-testid="drop-buy-1"]').classes())
      .toContain('mat__drop-line--armed')
    expect(wrapper.get('[data-testid="drop-buy-0"]').classes())
      .not.toContain('mat__drop-line--armed')
  })
})

describe('TradingStrategyConditionMat：帶子說得出放下去會發生什麼', () => {
  it('拿的是組裡那一塊時，說它會被拆出來', () => {
    // 不說的話，「拖出去就是拆開」這件事只有試過一次的人才知道。
    expect(mountMat('ATR', 1).get('[data-testid="drop-buy-1"]').text())
      .toContain('拆出來')
  })

  it('拿的是獨立的那一塊時，同一條帶子只說搬到這裡', () => {
    const hint = mountMat('RSI', 0).get('[data-testid="drop-buy-0"]').text()

    expect(hint).toContain('放這裡')
    expect(hint).not.toContain('拆出來')
  })

  it('只有正被懸著的那一條說話——四條同時寫同一句，那句就變成背景', () => {
    expect(mountMat('ATR', 1).get('[data-testid="drop-buy-0"]').text()).toBe('')
  })
})

describe('TradingStrategyConditionMat：扣在一起的那幾塊', () => {
  it('一組共用一個框，框上寫著它們之間怎麼合併', () => {
    const wrapper = mountMat(null)

    expect(wrapper.find('[data-testid="item-buy-MACD+ATR"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="bundle-operator-buy-MACD+ATR"]').exists()).toBe(true)
  })

  it('只有扣在一起的那幾塊才有「拆出來」那顆按鈕', () => {
    const wrapper = mountMat(null)

    expect(wrapper.find('[data-testid="unbundle-buy-ATR"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="unbundle-buy-RSI"]').exists()).toBe(false)
  })

  it('按下那顆按鈕就把那一塊拆出來——拖出去之外的另一條路', async () => {
    const wrapper = mountMat(null)

    await wrapper.get('[data-testid="unbundle-buy-ATR"]').trigger('click')

    expect(wrapper.emitted('unbundle')?.at(-1)).toEqual(['ATR'])
  })
})
