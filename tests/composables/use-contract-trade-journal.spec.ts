// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { ContractTradeJournalApplication } from '~/application/contract-trade-journal-application'
import { ContractTradeJournalService } from '~/domain/service/contract-trade-journal-service'
import type { IContractTradeRecordProxy } from '~/domain/interface/i-contract-trade-record-proxy'
import type { ITradingStrategyProxy } from '~/domain/interface/i-trading-strategy-proxy'
import type { IKCandleContractProxy } from '~/domain/interface/i-k-candle-contract-proxy'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import {
  buildPage, buildStatistics, buildSummary, contractTradeRecordProxyMock, kCandleContractProxyMock, tradingStrategyProxyMock,
} from '../fixtures/contract-trade-journal'

const recordProxy = contractTradeRecordProxyMock()

function journalUnderTest() {
  return useContractTradeJournal(new ContractTradeJournalApplication(new ContractTradeJournalService(
    recordProxy as unknown as IContractTradeRecordProxy,
    tradingStrategyProxyMock() as unknown as ITradingStrategyProxy,
    kCandleContractProxyMock() as unknown as IKCandleContractProxy)))
}

beforeEach(() => {
  vi.clearAllMocks()
  recordProxy.listTrades.mockResolvedValue(buildPage([
    buildSummary({ id: 1, status: 'closed' }),
    buildSummary({ id: 2, status: 'open', symbol: 'ETHUSDT' }),
  ]))
  recordProxy.findStatistics.mockResolvedValue(buildStatistics())
})

describe('useContractTradeJournal', () => {
  it('讀進列表與摘要', async () => {
    const { list, loadTrades, loading } = journalUnderTest()

    await loadTrades()

    expect(list.value?.rows.map(row => row.id)).toEqual([1, 2])
    expect(list.value?.pendingReviewCount).toBe(1)
    expect(loading.value).toBe(false)
  })

  it('改篩選就重讀，待檢討只列出已平倉的', async () => {
    const { list, loadTrades, showPendingReview, statusFilter } = journalUnderTest()
    await loadTrades()

    showPendingReview()
    await nextTick()
    await vi.waitFor(() => expect(list.value?.rows.map(row => row.id)).toEqual([1]))

    expect(statusFilter.value).toBe('closed')
  })

  it('連不上時整塊說明連不上，不呈現空的列表', async () => {
    recordProxy.listTrades.mockRejectedValue(new BackendUnreachableError('http://x'))
    const { list, loadTrades, failureMessage } = journalUnderTest()

    await loadTrades()

    expect(list.value).toBeNull()
    expect(failureMessage.value).toContain('連不上交易服務')
  })
})
