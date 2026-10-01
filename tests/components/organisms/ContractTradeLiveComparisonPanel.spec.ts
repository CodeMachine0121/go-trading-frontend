import Decimal from 'decimal.js'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import ContractTradeLiveComparisonPanel from '~/components/organisms/ContractTradeLiveComparisonPanel.vue'
import { ContractTradeLiveComparisonDomain } from '~/domain/models/domains/contract-trade-live-comparison-domain'
import { ContractTradeLiveComparison } from '~/domain/models/entities/contract-trade-live-comparison'
import { ContractTradeLiveComparisonRow } from '~/domain/models/entities/contract-trade-live-comparison-row'
import { ContractTradePerformance } from '~/domain/models/entities/contract-trade-performance'
import { TradingStrategyDto } from '~/domain/models/dto/trading-strategy-dto'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

const STRATEGIES = [new TradingStrategyDto(5, 'BTC 趨勢跟隨', [], null, null, 'contractKCandle')]

function comparisonOf(rows: ContractTradeLiveComparisonRow[], deleted = false, slippage: Decimal | null = null, slippageTradeCount = 0) {
  return new ContractTradeLiveComparisonDomain(
    new ContractTradeLiveComparison('BTC 趨勢跟隨', deleted, rows, slippage, slippageTradeCount)).toDto()
}

describe('ContractTradeLiveComparisonPanel', () => {
  it('挑一份策略', async () => {
    const wrapper = mount(ContractTradeLiveComparisonPanel, { props: { tradingStrategies: STRATEGIES, selectedTradingStrategyId: null } })

    await wrapper.get('[data-testid="comparison-strategy"]').setValue('5')
    await wrapper.get('[data-testid="comparison-strategy"]').setValue('')

    expect(wrapper.emitted('update:selectedTradingStrategyId')).toEqual([[5], [null]])
  })

  it('重演中看得出來', () => {
    const wrapper = mount(ContractTradeLiveComparisonPanel, { props: { tradingStrategies: STRATEGIES, selectedTradingStrategyId: 5, replaying: true } })

    expect(wrapper.get('[data-testid="comparison-replaying"]').text()).toBe('重演中…')
  })

  it.each([
    {
      name: '有來自連結的實單時，整份策略與每一列都寫平均滑點與筆數',
      slippage: new Decimal('0.07'), count: 5,
      expectedSummary: '整份策略平均進場滑點 0.07%，以 5 筆計', expectedCell: '0.07%以 5 筆計',
    },
    {
      name: '沒有來自連結的實單時寫不適用',
      slippage: null, count: 0,
      expectedSummary: '整份策略平均進場滑點：不適用（沒有來自機器人連結的實單）', expectedCell: '不適用',
    },
  ])('$name', ({ slippage, count, expectedSummary, expectedCell }) => {
    const wrapper = mount(ContractTradeLiveComparisonPanel, {
      props: {
        tradingStrategies: STRATEGIES,
        selectedTradingStrategyId: 5,
        comparison: comparisonOf([
          new ContractTradeLiveComparisonRow('BTCUSDT', new ContractTradePerformance(12, 0.54, 0.54, null, slippage, count), new ContractTradePerformance(30, 0.52, 0.52, null), null),
        ], false, slippage, count),
      },
    })

    expect(wrapper.get('[data-testid="comparison-strategy-slippage"]').text()).toBe(expectedSummary)
    expect(wrapper.get('[data-testid="comparison-slippage"]').text().replace(/\s/g, '')).toBe(expectedCell.replace(/\s/g, ''))
  })

  it('每個標的一列；偏離的那一列寫出差幾個百分點；失敗的那一列寫原因', () => {
    const wrapper = mount(ContractTradeLiveComparisonPanel, {
      props: {
        tradingStrategies: STRATEGIES,
        selectedTradingStrategyId: 5,
        comparison: comparisonOf([
          new ContractTradeLiveComparisonRow('ETHUSDT', new ContractTradePerformance(8, 0.38, 0.38, null), new ContractTradePerformance(20, 0.61, 0.61, null), null),
          new ContractTradeLiveComparisonRow('SOLUSDT', new ContractTradePerformance(2, 0.5, 0.5, null), null, '合約行情不夠'),
          new ContractTradeLiveComparisonRow('BTCUSDT', new ContractTradePerformance(12, 0.54, 0.54, null), new ContractTradePerformance(30, 0.52, 0.52, null), null),
        ]),
      },
    })

    expect(wrapper.get('[data-testid="comparison-verdict-ETHUSDT"]').text()).toBe('比回測低 23 個百分點')
    expect(wrapper.get('[data-testid="comparison-verdict-BTCUSDT"]').text()).toBe('不低於回測')
    expect(wrapper.get('[data-testid="comparison-verdict-SOLUSDT"]').text()).toBe('無法比較')
    expect(wrapper.get('[data-testid="comparison-row-SOLUSDT"]').text()).toContain('合約行情不夠，無法重演')
    expect(wrapper.get('[data-testid="comparison-row-SOLUSDT"]').text()).toContain('50%')
  })

  it('沒有已平倉實單或策略已刪除時寫說明；失敗時寫原因', () => {
    const empty = mount(ContractTradeLiveComparisonPanel, { props: { tradingStrategies: STRATEGIES, selectedTradingStrategyId: 5, comparison: comparisonOf([]) } })
    const failed = mount(ContractTradeLiveComparisonPanel, { props: { tradingStrategies: STRATEGIES, selectedTradingStrategyId: 5, failureMessage: new UntranslatedTextVo('連不上') } })

    expect(empty.get('[data-testid="comparison-notice"]').text()).toBe('還沒有已平倉的實單可以對照')
    expect(empty.find('[data-testid="comparison-table"]').exists()).toBe(false)
    expect(failed.get('[data-testid="comparison-failure"]').text()).toBe('連不上')
  })

  it('換成英文時欄名、判讀與重演失敗的說明都說英文，後端給的原因原樣保留', async () => {
    const wrapper = mount(ContractTradeLiveComparisonPanel, {
      props: {
        tradingStrategies: STRATEGIES,
        selectedTradingStrategyId: 5,
        comparison: comparisonOf([
          new ContractTradeLiveComparisonRow('ETHUSDT', new ContractTradePerformance(8, 0.38, 0.5, null), new ContractTradePerformance(20, 0.61, 0.6, 0.62), null),
          new ContractTradeLiveComparisonRow('BTCUSDT', new ContractTradePerformance(3, 0.33, 0.33, null), null, '合約行情不夠'),
        ]),
      },
    })

    wrapper.vm.$i18n.locale = 'en'
    await nextTick()

    expect(wrapper.get('[data-testid="comparison-table"] thead').text()).toContain('Backtest win rate')
    expect(wrapper.get('[data-testid="comparison-verdict-ETHUSDT"]').text()).toBe('23 percentage points below backtest')
    expect(wrapper.get('[data-testid="comparison-row-ETHUSDT"]').text()).toContain('8 trades')
    expect(wrapper.get('[data-testid="comparison-row-BTCUSDT"]').text()).toContain('合約行情不夠, so nothing can be compared')
    expect(wrapper.get('[data-testid="comparison-strategy-slippage"]').text())
      .toBe('Strategy-wide avg entry slippage: N/A (no live trades from bot links)')
  })
})
