import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BacktestSummaryCard from '~/components/molecules/BacktestSummaryCard.vue'
import { BacktestSummaryDto } from '~/domain/models/dto/backtest-summary-dto'

function mountCard(summary: BacktestSummaryDto) {
  return mount(BacktestSummaryCard, { props: { summary } })
}

const SUMMARY = new BacktestSummaryDto(
  '10000', '12500', '+25.00%', 'positive', '10.00%', '75.0%', 4, 4, 0, 0, 0, 0, null, false)

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
      '10000', '12500', '+25.00%', tone, '10.00%', '75.0%', 4, 4, 0, 0, 0, 0, null, false))

    expect(wrapper.get('[data-testid="summary-total-return-rate"]').classes()
      .some(name => name.endsWith(expectedSuffix))).toBe(true)
  })

  it('勝率不適用時原樣寫出來，不擅自換成 0%', () => {
    const wrapper = mountCard(new BacktestSummaryDto(
      '10000', '10000', '0.00%', 'neutral', '0.00%', '不適用', 0, 0, 0, 0, 0, 0, null, false))

    expect(wrapper.get('[data-testid="summary-win-rate"]').text()).toBe('不適用')
  })
  it('被掃出場過才多那兩格', () => {
    // 同一個報酬率，兩個完全不同的故事：十次出場八次靡停損的策略，
    // 與十次都靡訊號的，報酬率可以一模一樣。
    const wrapper = mountCard(new BacktestSummaryDto(
      '10000', '9800', '-2.00%', 'negative', '2.00%', '0.0%', 3, 3, 0, 2, 1, 0, null, false))

    expect(wrapper.get('[data-testid="summary-stop-loss-exit-count"]').text()).toBe('2')
    expect(wrapper.get('[data-testid="summary-take-profit-exit-count"]').text()).toBe('1')
  })

  it('一筆都沒被掃出場時那兩格不出現', () => {
    // 與打架棒數同一條規則：一格永遠是零的數字只會讓人以為它有什麼意思，
    // 而沒模擬出場的那一次兩個零沒有任何資訊。
    const wrapper = mountCard(SUMMARY)

    expect(wrapper.find('[data-testid="summary-stop-loss-exit-count"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="summary-take-profit-exit-count"]').exists()).toBe(false)
  })

  it('開倉次數一律寫出來，就擺在交易次數旁邊', () => {
    // 它與下面那幾格「有才出現」的數字不同：等於零本身就是資訊，
    // 而它與交易次數不相等時，那個差就是「現在還抱著一注」。
    const wrapper = mountCard(new BacktestSummaryDto(
      '10000', '11010.28', '+10.10%', 'positive', '8.55%', '不適用',
      1, 0, 0, 0, 0, 0, '99.01', true))

    expect(wrapper.get('[data-testid="summary-position-open-count"]').text()).toBe('1')
    expect(wrapper.get('[data-testid="summary-trade-count"]').text()).toBe('0')
  })

  it('一次都沒開倉時那一格寫零，而不是消失', () => {
    const wrapper = mountCard(new BacktestSummaryDto(
      '10000', '10000', '0.00%', 'neutral', '0.00%', '不適用', 0, 0, 0, 0, 0, 0, null, false))

    expect(wrapper.get('[data-testid="summary-position-open-count"]').text()).toBe('0')
  })

  it('收過錢才多那一格', () => {
    // 判斷讀的是 null 而不是零：到了這裡它已經是一個字串，而「有沒有收過錢」
    // 是領域知識，所以那個判斷留在領域模型裡。
    const wrapper = mountCard(new BacktestSummaryDto(
      '10100', '10890', '+7.82%', 'positive', '0.99%', '100.0%', 1, 1, 0, 0, 0, 0, '210.00', false))

    expect(wrapper.get('[data-testid="summary-total-transaction-cost"]').text())
      .toBe('210.00')
    expect(wrapper.text()).toContain('交易成本')
  })

  it('沒收過錢就不多那一格', () => {
    const wrapper = mountCard(SUMMARY)

    expect(wrapper.find('[data-testid="summary-total-transaction-cost"]').exists())
      .toBe(false)
  })

  it('打架過才多一格，說出幾棒', () => {
    // 一份一直在打架的交易策略幾乎不進場，那張漂亮的成績單會被讀成「很穩」。
    const wrapper = mountCard(new BacktestSummaryDto(
      '10000', '10000', '0.00%', 'neutral', '0.00%', '不適用', 0, 0, 180, 0, 0, 0, null, false))

    expect(wrapper.get('[data-testid="summary-conflicted-candle-count"]').text()).toBe('180')
    expect(wrapper.text()).toContain('規則打架的棒數')
  })

  it('一棒都沒打架過時那一格不出現', () => {
    // 永遠是零的一格只會讓人以為它有什麼意思——重演一支策略腳本時它永遠是零。
    const wrapper = mountCard(SUMMARY)

    expect(wrapper.find('[data-testid="summary-conflicted-candle-count"]').exists()).toBe(false)
  })

  it('被強制平倉打掉的筆數與那兩格並排', () => {
    // 同一個報酬率有兩個故事——被停損救下來，與押到歸零過三次。
    const wrapper = mountCard(new BacktestSummaryDto(
      '10000', '0', '-100.00%', 'negative', '100.00%', '0.0%', 3, 3, 0, 0, 0, 2, null, false))

    expect(wrapper.get('[data-testid="summary-liquidation-exit-count"]').text()).toBe('2')
  })

  it('一次都沒被強制平倉就不佔位置', () => {
    // 絕大多數的重演沒有借錢，那一格永遠是零——而一格永遠是零的數字
    // 只會讓人以為它有什麼意思。與那兩格同一條規則。
    const wrapper = mountCard(SUMMARY)

    expect(wrapper.find('[data-testid="summary-liquidation-exit-count"]').exists())
      .toBe(false)
  })
})
