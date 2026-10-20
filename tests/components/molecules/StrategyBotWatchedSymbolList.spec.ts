// @vitest-environment nuxt
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StrategyBotWatchedSymbolList from '~/components/molecules/StrategyBotWatchedSymbolList.vue'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { aWatchedSymbolDto } from '../../fixtures/strategy-bot-watched-symbol'

describe('StrategyBotWatchedSymbolList 的資金分配', () => {
  it.each([
    {
      name: '有部位規劃時說出分配與分到多少',
      allocatedCapitalLabel: new LocalizedTextVo('分到 600', 'Gets 600'),
      expected: '分配 60% · 分到 600',
    },
    { name: '沒有部位規劃時只說分配', allocatedCapitalLabel: null, expected: '分配 60%' },
  ])('$name', ({ allocatedCapitalLabel, expected }) => {
    const wrapper = mount(StrategyBotWatchedSymbolList, {
      props: { watchedSymbols: [aWatchedSymbolDto({ symbol: 'BTCUSDT', allocationPercentage: '60', allocatedCapitalLabel })] },
    })

    expect(wrapper.get('[data-testid="watched-symbol-allocation"]').text()).toBe(expected)
  })
})
