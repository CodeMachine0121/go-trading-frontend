import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BacktestSummaryCard from '~/components/molecules/BacktestSummaryCard.vue'
import { BacktestSummaryDto } from '~/domain/models/dto/backtest-summary-dto'

function mountCard(summary: BacktestSummaryDto) {
  return mount(BacktestSummaryCard, { props: { summary } })
}

const SUMMARY = new BacktestSummaryDto(
  '10000', '12500', '+25.00%', 'positive', '10.00%', '75.0%', 4)

describe('BacktestSummaryCard', () => {
  it('交代六件事，每一件都照 DTO 已經決定好的樣子寫', () => {
    // 它一個都不算、一個都不進位、也不判斷正負——那些全在 domain 決定了。
    const wrapper = mountCard(SUMMARY)

    expect(wrapper.get('[data-testid="summary-initial-capital"]').text()).toBe('10000')
    expect(wrapper.get('[data-testid="summary-final-equity"]').text()).toBe('12500')
    expect(wrapper.get('[data-testid="summary-total-return-rate"]').text()).toBe('+25.00%')
    expect(wrapper.get('[data-testid="summary-maximum-drawdown"]').text()).toBe('10.00%')
    expect(wrapper.get('[data-testid="summary-win-rate"]').text()).toBe('75.0%')
    expect(wrapper.get('[data-testid="summary-trade-count"]').text()).toBe('4')
  })

  it('每一件事旁邊都寫著它是什麼', () => {
    const wrapper = mountCard(SUMMARY)

    expect(wrapper.text()).toContain('一開始有多少錢')
    expect(wrapper.text()).toContain('最後剩多少')
    expect(wrapper.text()).toContain('總報酬率')
    expect(wrapper.text()).toContain('最大回撤')
    expect(wrapper.text()).toContain('勝率')
    expect(wrapper.text()).toContain('交易次數')
  })

  it.each([
    ['positive', '--positive'],
    ['negative', '--negative'],
    ['neutral', '--neutral'],
  ] as const)('總報酬率的色調 %s 照 DTO 說的來', (tone, expectedSuffix) => {
    const wrapper = mountCard(new BacktestSummaryDto(
      '10000', '12500', '+25.00%', tone, '10.00%', '75.0%', 4))

    expect(wrapper.get('[data-testid="summary-total-return-rate"]').classes()
      .some(name => name.endsWith(expectedSuffix))).toBe(true)
  })

  it('勝率不適用時原樣寫出來，不擅自換成 0%', () => {
    const wrapper = mountCard(new BacktestSummaryDto(
      '10000', '10000', '0.00%', 'neutral', '0.00%', '不適用', 0))

    expect(wrapper.get('[data-testid="summary-win-rate"]').text()).toBe('不適用')
  })
})
