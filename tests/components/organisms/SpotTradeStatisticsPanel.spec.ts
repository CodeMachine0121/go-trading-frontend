import Decimal from 'decimal.js'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SpotTradeStatisticsPanel from '~/components/organisms/SpotTradeStatisticsPanel.vue'
import { SpotTradeStatisticsDomain } from '~/domain/models/domains/spot-trade-statistics-domain'
import { TradeStatisticsPeriodDomain } from '~/domain/models/domains/trade-statistics-period-domain'
import { SpotTradeDistributionBucket } from '~/domain/models/entities/spot-trade-distribution-bucket'
import { SpotTradeCumulativePoint } from '~/domain/models/entities/spot-trade-cumulative-point'
import { SpotTradeMistakeCost } from '~/domain/models/entities/spot-trade-mistake-cost'
import { TRADE_STATISTICS_PERIODS } from '~/domain/models/vo/trade-statistics-period-vo'
import { spotMarketStatistics, spotStatistics } from '../../fixtures/spot-trade-journal'
import { buildTimeZone } from '../../fixtures/time-zone'

const PERIOD_OPTIONS = TRADE_STATISTICS_PERIODS.map(period => new TradeStatisticsPeriodDomain(period).toOptionDto())
const STUBS = { TradeCumulativeChart: true }

function mountPanel(props: Record<string, unknown> = {}) {
  return mount(SpotTradeStatisticsPanel, {
    props: { period: '30d', periodOptions: PERIOD_OPTIONS, timeZone: buildTimeZone('UTC'), ...props },
    global: { stubs: STUBS },
  })
}

describe('SpotTradeStatisticsPanel', () => {
  it('台股與加密貨幣各一段；沒有平倉的那一段說明', () => {
    const statistics = new SpotTradeStatisticsDomain(spotStatistics([
      spotMarketStatistics({
        cumulativeProfit: [new SpotTradeCumulativePoint(new Date('2026-09-10T00:00:00Z'), new Decimal('120000'))],
        returnDistribution: [new SpotTradeDistributionBucket('0%~5%', 4, true)],
        mistakeCosts: [new SpotTradeMistakeCost('追價進場', 2, new Decimal('-30000'), -0.028)],
      }),
      spotMarketStatistics({ market: 'crypto', currency: 'USDT', closedTradeCount: 0 }),
    ])).toDto()

    const wrapper = mountPanel({ statistics })

    const taiwanStock = wrapper.get('[data-testid="statistics-market-台股"]')
    expect(taiwanStock.text()).toContain('已平倉 10 筆')
    expect(taiwanStock.get('[data-testid="statistics-r-note"]').text()).toBe('平均 R 以 3 筆計（有計畫止損的交易）')
    expect(taiwanStock.get('[data-testid="statistics-total-profit"]').text()).toBe('+120,000.00')
    expect(taiwanStock.get('[data-testid="return-distribution"]').text()).toContain('0%~5%')
    expect(taiwanStock.get('[data-testid="mistake-costs"]').text()).toContain('追價進場')
    expect(taiwanStock.get('[data-testid="source-comparison"]').text()).toContain('+5.00%')
    expect(wrapper.get('[data-testid="statistics-market-加密貨幣"] [data-testid="statistics-empty"]').text()).toBe('這段期間沒有已平倉交易')
  })

  it('沒有失誤標籤時說明；換期間交給上層', async () => {
    const wrapper = mountPanel({ statistics: new SpotTradeStatisticsDomain(spotStatistics([spotMarketStatistics()])).toDto() })

    await wrapper.get('[data-testid="statistics-period"] button:nth-child(1)').trigger('click')

    expect(wrapper.text()).toContain('這段期間沒有貼失誤標籤的交易')
    expect(wrapper.emitted('update:period')?.[0]).toEqual(['7d'])
  })

  it('讀取中與讀不到時各說一句', () => {
    expect(mountPanel({ loading: true }).find('[data-testid="statistics-loading"]').exists()).toBe(true)
    expect(mountPanel({ failureMessage: '連不上' }).get('[data-testid="statistics-failure"]').text()).toBe('連不上')
  })
})
