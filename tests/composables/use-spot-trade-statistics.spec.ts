// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { SpotTradeJournalApplication } from '~/application/spot-trade-journal-application'
import { TradingStrategyApplication } from '~/application/trading-strategy-application'
import { SpotTradeJournalService } from '~/domain/service/spot-trade-journal-service'
import { TradingStrategyService } from '~/domain/service/trading-strategy-service'
import type { ISpotTradeRecordProxy } from '~/domain/interface/i-spot-trade-record-proxy'
import type { ITradingStrategyProxy } from '~/domain/interface/i-trading-strategy-proxy'
import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import { SpotTradeLiveComparison } from '~/domain/models/entities/spot-trade-live-comparison'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { TradingStrategyNotFoundError } from '~/domain/errors/trading-strategy-not-found-error'
import { tradingStrategyProxyMock } from '../fixtures/contract-trade-journal'
import { spotStatistics, spotTradeRecordProxyMock, kCandleProxyMock } from '../fixtures/spot-trade-journal'

const recordProxy = spotTradeRecordProxyMock()
const tradingStrategyProxy = tradingStrategyProxyMock()

function statisticsUnderTest() {
  return useSpotTradeStatistics(
    new SpotTradeJournalApplication(new SpotTradeJournalService(
      recordProxy as unknown as ISpotTradeRecordProxy,
      tradingStrategyProxy as unknown as ITradingStrategyProxy,
      kCandleProxyMock() as unknown as IKCandleProxy)),
    new TradingStrategyApplication(new TradingStrategyService(tradingStrategyProxy as unknown as ITradingStrategyProxy)),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  recordProxy.findStatistics.mockResolvedValue(spotStatistics())
  tradingStrategyProxy.listTradingStrategies.mockResolvedValue([])
})

describe('useSpotTradeStatistics', () => {
  it('預設最近 30 天', async () => {
    const { period, periodOptions, loadStatistics, statistics } = statisticsUnderTest()

    await loadStatistics()

    expect(period.value).toBe('30d')
    expect(periodOptions.map(option => option.label.in('zh-TW'))).toEqual(['最近 7 天', '最近 30 天', '最近 90 天', '全部期間'])
    expect(periodOptions.map(option => option.label.in('en'))).toEqual(['Last 7 days', 'Last 30 days', 'Last 90 days', 'All time'])
    expect(statistics.value?.periodLabel.in('zh-TW')).toBe('最近 30 天')
  })

  it('換期間就重讀', async () => {
    const { period } = statisticsUnderTest()

    period.value = '7d'
    await nextTick()

    await vi.waitFor(() => expect(recordProxy.findStatistics).toHaveBeenCalledWith('7d'))
  })

  it('讀不到統計時說原因', async () => {
    recordProxy.findStatistics.mockRejectedValue(new BackendUnreachableError('http://x'))
    const { loadStatistics, failureMessage, statistics } = statisticsUnderTest()

    await loadStatistics()

    expect(statistics.value).toBeNull()
    expect(failureMessage.value?.in('zh-TW')).toContain('連不上')
  })

  it('挑了策略才重演，重演中看得出來', async () => {
    let finishReplay: (value: SpotTradeLiveComparison) => void = () => {}
    tradingStrategyProxy.findSpotTradeComparison.mockReturnValue(new Promise((resolve) => {
      finishReplay = resolve
    }))
    const { selectedTradingStrategyId, replaying, comparison } = statisticsUnderTest()

    selectedTradingStrategyId.value = 5
    await nextTick()
    expect(replaying.value).toBe(true)

    finishReplay(new SpotTradeLiveComparison('台股均線', false, [], null, 0))
    await vi.waitFor(() => expect(replaying.value).toBe(false))
    expect(comparison.value?.notice?.in('zh-TW')).toBe('還沒有已平倉的實單可以對照')
  })

  it('重演回來時已經改挑別份策略，就不拿舊結果蓋掉', async () => {
    let finishReplay: (value: SpotTradeLiveComparison) => void = () => {}
    tradingStrategyProxy.findSpotTradeComparison.mockReturnValue(new Promise((resolve) => {
      finishReplay = resolve
    }))
    const { selectedTradingStrategyId, replaying, comparison } = statisticsUnderTest()

    selectedTradingStrategyId.value = 5
    await nextTick()
    selectedTradingStrategyId.value = null
    await nextTick()
    finishReplay(new SpotTradeLiveComparison('台股均線', false, [], null, 0))
    await vi.waitFor(() => expect(replaying.value).toBe(false))

    expect(comparison.value).toBeNull()
  })

  it('取消挑選就清掉對照；重演失敗時說原因', async () => {
    tradingStrategyProxy.findSpotTradeComparison.mockRejectedValue(new TradingStrategyNotFoundError('找不到識別碼為 9 的交易策略'))
    const { selectedTradingStrategyId, comparison, comparisonFailureMessage } = statisticsUnderTest()

    selectedTradingStrategyId.value = 9
    await vi.waitFor(() => expect(comparisonFailureMessage.value?.in('zh-TW')).toBe('找不到識別碼為 9 的交易策略'))
    selectedTradingStrategyId.value = null
    await nextTick()

    expect(comparison.value).toBeNull()
  })

  it('讀進現貨交易策略清單；讀不到時說原因', async () => {
    const { loadTradingStrategies, tradingStrategies, comparisonFailureMessage } = statisticsUnderTest()
    await loadTradingStrategies()
    expect(tradingStrategies.value).toEqual([])

    tradingStrategyProxy.listTradingStrategies.mockRejectedValue(new BackendUnreachableError('http://x'))
    await loadTradingStrategies()

    expect(comparisonFailureMessage.value?.in('zh-TW')).toContain('連不上')
  })
})
