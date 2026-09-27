// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { SpotTradeJournalApplication } from '~/application/spot-trade-journal-application'
import { SpotTradeJournalService } from '~/domain/service/spot-trade-journal-service'
import type { ISpotTradeRecordProxy } from '~/domain/interface/i-spot-trade-record-proxy'
import type { ITradingStrategyProxy } from '~/domain/interface/i-trading-strategy-proxy'
import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import { SpotTradeRecordPage } from '~/domain/models/entities/spot-trade-record-page'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { tradingStrategyProxyMock } from '../fixtures/contract-trade-journal'
import { buildSpotRecord, kCandleProxyMock, spotStatistics, spotTradeRecordProxyMock } from '../fixtures/spot-trade-journal'

const recordProxy = spotTradeRecordProxyMock()

function journalUnderTest() {
  return useSpotTradeJournal(new SpotTradeJournalApplication(new SpotTradeJournalService(
    recordProxy as unknown as ISpotTradeRecordProxy,
    tradingStrategyProxyMock() as unknown as ITradingStrategyProxy,
    kCandleProxyMock() as unknown as IKCandleProxy)))
}

beforeEach(() => {
  vi.clearAllMocks()
  recordProxy.listTrades.mockResolvedValue(new SpotTradeRecordPage([
    buildSpotRecord({ id: 1 }),
    buildSpotRecord({ id: 2, symbol: 'BTCUSDT', market: 'crypto', status: 'open', closedAt: null }),
  ], 2))
  recordProxy.findStatistics.mockResolvedValue(spotStatistics())
})

describe('useSpotTradeJournal', () => {
  it('讀進列表與依市場的摘要', async () => {
    const { list, loadTrades, loading } = journalUnderTest()

    await loadTrades()

    expect(list.value?.rows.map(row => row.id)).toEqual([1, 2])
    expect(list.value?.marketSummaries.map(summary => summary.marketLabel)).toEqual(['台股'])
    expect(loading.value).toBe(false)
  })

  it('改市場篩選就重讀；待檢討只列出已平倉的', async () => {
    const { list, loadTrades, marketFilter, showPendingReview, statusFilter } = journalUnderTest()
    await loadTrades()

    marketFilter.value = 'crypto'
    await nextTick()
    await vi.waitFor(() => expect(list.value?.rows.map(row => row.id)).toEqual([2]))

    marketFilter.value = 'all'
    showPendingReview()
    await nextTick()
    await vi.waitFor(() => expect(list.value?.rows.map(row => row.id)).toEqual([1]))
    expect(statusFilter.value).toBe('closed')
  })

  it('連不上時說原因，不呈現列表', async () => {
    recordProxy.listTrades.mockRejectedValue(new BackendUnreachableError('http://x'))
    const { list, loadTrades, failureMessage } = journalUnderTest()

    await loadTrades()

    expect(list.value).toBeNull()
    expect(failureMessage.value).toContain('連不上')
  })
})
