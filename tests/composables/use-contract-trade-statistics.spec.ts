// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { ContractTradeJournalApplication } from '~/application/contract-trade-journal-application'
import { TradingStrategyApplication } from '~/application/trading-strategy-application'
import { ContractTradeJournalService } from '~/domain/service/contract-trade-journal-service'
import { TradingStrategyService } from '~/domain/service/trading-strategy-service'
import type { IContractTradeRecordProxy } from '~/domain/interface/i-contract-trade-record-proxy'
import type { ITradingStrategyProxy } from '~/domain/interface/i-trading-strategy-proxy'
import type { IKCandleContractProxy } from '~/domain/interface/i-k-candle-contract-proxy'
import { ContractTradeLiveComparison } from '~/domain/models/entities/contract-trade-live-comparison'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { TradingStrategyNotFoundError } from '~/domain/errors/trading-strategy-not-found-error'
import { buildStatistics, contractTradeRecordProxyMock, kCandleContractProxyMock, tradingStrategyProxyMock } from '../fixtures/contract-trade-journal'

const recordProxy = contractTradeRecordProxyMock()
const tradingStrategyProxy = tradingStrategyProxyMock()

function statisticsUnderTest() {
  return useContractTradeStatistics(
    new ContractTradeJournalApplication(new ContractTradeJournalService(
      recordProxy as unknown as IContractTradeRecordProxy,
      tradingStrategyProxy as unknown as ITradingStrategyProxy,
      kCandleContractProxyMock() as unknown as IKCandleContractProxy)),
    new TradingStrategyApplication(new TradingStrategyService(tradingStrategyProxy as unknown as ITradingStrategyProxy)),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  recordProxy.findStatistics.mockResolvedValue(buildStatistics())
  tradingStrategyProxy.listTradingStrategies.mockResolvedValue([])
})

describe('useContractTradeStatistics', () => {
  it('預設最近 30 天', async () => {
    const { period, periodOptions, loadStatistics, statistics } = statisticsUnderTest()

    await loadStatistics()

    expect(period.value).toBe('30d')
    expect(periodOptions.map(option => option.label.in('zh-TW'))).toEqual(['最近 7 天', '最近 30 天', '最近 90 天', '全部期間'])
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
    let finishReplay: (value: ContractTradeLiveComparison) => void = () => {}
    tradingStrategyProxy.findContractTradeComparison.mockReturnValue(new Promise((resolve) => {
      finishReplay = resolve
    }))
    const { selectedTradingStrategyId, replaying, comparison } = statisticsUnderTest()

    selectedTradingStrategyId.value = 5
    await nextTick()
    expect(replaying.value).toBe(true)

    finishReplay(new ContractTradeLiveComparison('BTC 趨勢跟隨', false, []))
    await vi.waitFor(() => expect(replaying.value).toBe(false))
    expect(comparison.value?.notice?.in('zh-TW')).toBe('還沒有已平倉的實單可以對照')
  })

  it('取消挑選就清掉對照；重演失敗時說原因', async () => {
    tradingStrategyProxy.findContractTradeComparison.mockRejectedValue(new TradingStrategyNotFoundError('找不到識別碼為 9 的交易策略'))
    const { selectedTradingStrategyId, comparison, comparisonFailureMessage } = statisticsUnderTest()

    selectedTradingStrategyId.value = 9
    await vi.waitFor(() => expect(comparisonFailureMessage.value?.in('zh-TW')).toBe('找不到識別碼為 9 的交易策略'))
    selectedTradingStrategyId.value = null
    await nextTick()

    expect(comparison.value).toBeNull()
  })

  it('讀進合約交易策略清單；讀不到時說原因', async () => {
    const { loadTradingStrategies, tradingStrategies, comparisonFailureMessage } = statisticsUnderTest()
    await loadTradingStrategies()
    expect(tradingStrategies.value).toEqual([])

    tradingStrategyProxy.listTradingStrategies.mockRejectedValue(new BackendUnreachableError('http://x'))
    await loadTradingStrategies()

    expect(comparisonFailureMessage.value?.in('zh-TW')).toContain('連不上')
  })
})
