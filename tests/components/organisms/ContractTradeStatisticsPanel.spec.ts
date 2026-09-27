import Decimal from 'decimal.js'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ContractTradeStatisticsPanel from '~/components/organisms/ContractTradeStatisticsPanel.vue'
import { ContractTradeStatisticsDomain } from '~/domain/models/domains/contract-trade-statistics-domain'
import { TradeStatisticsPeriodDomain } from '~/domain/models/domains/trade-statistics-period-domain'
import { ContractTradeDistributionBucket } from '~/domain/models/entities/contract-trade-distribution-bucket'
import { ContractTradeCumulativePoint } from '~/domain/models/entities/contract-trade-cumulative-point'
import { ContractTradeMistakeCost } from '~/domain/models/entities/contract-trade-mistake-cost'
import { TRADE_STATISTICS_PERIODS } from '~/domain/models/vo/trade-statistics-period-vo'
import { buildStatistics } from '../../fixtures/contract-trade-journal'
import { buildTimeZone } from '../../fixtures/time-zone'

const PERIOD_OPTIONS = TRADE_STATISTICS_PERIODS.map(period => new TradeStatisticsPeriodDomain(period).toOptionDto())
const TIME_ZONE = buildTimeZone('UTC')
const STUBS = { TradeCumulativeChart: true }

function mountPanel(props: Record<string, unknown> = {}) {
  return mount(ContractTradeStatisticsPanel, {
    props: { period: '30d', periodOptions: PERIOD_OPTIONS, timeZone: TIME_ZONE, ...props },
    global: { stubs: STUBS },
  })
}

describe('ContractTradeStatisticsPanel', () => {
  it('呈現各數字、排除說明、R 分布、失誤成本與兩組比較', () => {
    const statistics = new ContractTradeStatisticsDomain(buildStatistics({
      excludedFromRMultipleCount: 3,
      rMultipleDistribution: [new ContractTradeDistributionBucket('≤−1R', 12, false), new ContractTradeDistributionBucket('1~2R', 6, true)],
      mistakeCosts: [new ContractTradeMistakeCost('移動止損', 4, new Decimal('-3.2'))],
      cumulativeRMultiples: [new ContractTradeCumulativePoint(new Date('2026-09-26T00:00:00Z'), new Decimal('11.4'))],
    })).toDto()
    const wrapper = mountPanel({ statistics })

    expect(wrapper.get('[data-testid="statistics-headline"]').text()).toContain('最近 30 天・已平倉 30 筆')
    expect(wrapper.get('[data-testid="statistics-total-r"]').text()).toBe('+11.40R')
    expect(wrapper.text()).toContain('47%')
    expect(wrapper.get('[data-testid="statistics-exclusion"]').text()).toBe('3 筆沒設止損，未計入 R')
    expect(wrapper.get('[data-testid="r-distribution"]').text()).toContain('≤−1R')
    expect(wrapper.get('[data-testid="mistake-costs"]').text()).toContain('−3.20R')
    expect(wrapper.get('[data-testid="source-comparison"]').text()).toContain('自行判斷')
  })

  it('沒有失誤標籤的交易時說明', () => {
    const wrapper = mountPanel({ statistics: new ContractTradeStatisticsDomain(buildStatistics()).toDto() })

    expect(wrapper.text()).toContain('這段期間沒有貼失誤標籤的交易')
  })

  it('換期間', async () => {
    const wrapper = mountPanel({ statistics: new ContractTradeStatisticsDomain(buildStatistics()).toDto() })

    await wrapper.get('[data-testid="statistics-period"]').findAll('button').find(button => button.text() === '最近 7 天')!.trigger('click')

    expect(wrapper.emitted('update:period')).toEqual([['7d']])
  })

  it('期間內沒有已平倉交易時不畫空圖', () => {
    const wrapper = mountPanel({ statistics: new ContractTradeStatisticsDomain(buildStatistics({ closedTradeCount: 0 })).toDto() })

    expect(wrapper.get('[data-testid="statistics-empty"]').text()).toBe('這段期間沒有已平倉交易')
    expect(wrapper.find('[data-testid="r-distribution"]').exists()).toBe(false)
  })

  it('讀取中與讀取失敗', () => {
    expect(mountPanel({ loading: true }).find('[data-testid="statistics-loading"]').exists()).toBe(true)
    expect(mountPanel({ failureMessage: '連不上' }).get('[data-testid="statistics-failure"]').text()).toBe('連不上')
  })
})
