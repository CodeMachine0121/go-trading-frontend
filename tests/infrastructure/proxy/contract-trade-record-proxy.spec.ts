import Decimal from 'decimal.js'
import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ContractTradeRecordProxy } from '~/infrastructure/proxy/contract-trade-record-proxy'
import { ContractTradeRecordWriteDto } from '~/domain/models/dto/contract-trade-record-write-dto'
import { ContractTradeFillWriteDto } from '~/domain/models/dto/contract-trade-fill-write-dto'
import { ContractTradePlanWriteDto } from '~/domain/models/dto/contract-trade-plan-write-dto'
import { ContractTradeReviewWriteDto } from '~/domain/models/dto/contract-trade-review-write-dto'
import { ContractTradeListQueryDto } from '~/domain/models/dto/contract-trade-list-query-dto'
import { ContractTradeNotFoundError } from '~/domain/errors/contract-trade-not-found-error'
import { JournalLinkNotFoundError } from '~/domain/errors/journal-link-not-found-error'
import { ContractTradeOpenPositionExistsError } from '~/domain/errors/contract-trade-open-position-exists-error'
import { ContractTradeRejectedError } from '~/domain/errors/contract-trade-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { signedInSessionStorage } from '../../fixtures/session-storage'

const BASE_URL = 'http://localhost:8080'

function rejection(status: number, data: Record<string, unknown>) {
  return createFetchError({
    request: BASE_URL,
    options: {},
    response: { status, statusText: 'rejected', _data: data },
  } as unknown as FetchContext)
}

function proxy() {
  return new ContractTradeRecordProxy(BASE_URL, signedInSessionStorage())
}

const MEASURE = { value: '1.53' }

const RECORD_WIRE = {
  id: 27,
  symbol: 'BTCUSDT',
  direction: 'long',
  leverage: '10',
  status: 'closed',
  plannedStopLossPrice: '96380',
  plannedTakeProfitPrice: null,
  entryReason: '突破',
  confidence: 3,
  tradingStrategyId: 5,
  tradingStrategyName: 'BTC 趨勢跟隨',
  tradingStrategyDeleted: false,
  openedAt: '2026-09-25T06:03:00Z',
  closedAt: '2026-09-26T08:40:00Z',
  fills: [{
    id: 1, kind: 'entry', filledAt: '2026-09-25T06:03:00Z', price: '97905', quantity: '0.030',
    liquidity: 'taker', fee: '1.47', feeRateMissing: true,
  }, {
    id: 2, kind: 'exit', filledAt: '2026-09-26T08:40:00Z', price: '100420', quantity: '0.030',
    liquidity: 'maker', fee: '0.6',
  }],
  notes: [{ id: 1, content: '附註', createdAt: '2026-09-26T09:00:00Z' }],
  tags: [{ id: 1, kind: 'setup', name: '突破' }],
  source: {
    strategyBotName: 'BTC 趨勢跟隨', runNumber: 412, referencePrice: '97850',
    suggestedStopLossPrice: '96380', suggestedTakeProfitPrice: null,
  },
  review: { wentWell: '照計畫', executionScore: 4, reviewedAt: '2026-09-27T00:00:00Z' },
  outcome: {
    position: '0',
    averageEntryPrice: '97905',
    averageExitPrice: '100420',
    grossProfit: '75.45',
    totalFee: '2.07',
    feeRateMissing: true,
    fundingFee: { value: null, unavailableReason: 'noFundingSettlements' },
    netProfit: '73.38',
    netProfitExcludesFunding: true,
    plannedRisk: MEASURE,
    rMultiple: MEASURE,
    maximumAdverseExcursion: MEASURE,
    maximumFavorableExcursion: MEASURE,
    maximumAdversePrice: '97110',
    maximumFavorablePrice: null,
    profitCaptureRate: { value: '' },
    floatingProfit: null,
    entrySlippagePercentage: MEASURE,
  },
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ContractTradeRecordProxy.findTrade', () => {
  it('把後端的一筆交易收成 entity', async () => {
    const fetchMock = vi.fn().mockResolvedValue(RECORD_WIRE)
    vi.stubGlobal('$fetch', fetchMock)

    const record = await proxy().findTrade(27)

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE_URL}/contract-trade-records/27`)
    expect(record.leverage.toString()).toBe('10')
    expect(record.plannedTakeProfitPrice).toBeNull()
    expect(record.fills[0]?.feeRateMissing).toBe(true)
    expect(record.fills[1]?.feeRateMissing).toBe(false)
    expect(record.fills[0]?.filledAt.toISOString()).toBe('2026-09-25T06:03:00.000Z')
    expect(record.notes[0]?.content).toBe('附註')
    expect(record.tags[0]?.name).toBe('突破')
    expect(record.source?.suggestedTakeProfitPrice).toBeNull()
    expect(record.review).toMatchObject({ wentWell: '照計畫', wentWrong: '', nextTime: '', executionScore: 4 })
    expect(record.outcome.fundingFee.unavailableReason).toBe('noFundingSettlements')
    expect(record.outcome.profitCaptureRate.value).toBeNull()
    expect(record.outcome.profitCaptureRate.unavailableReason).toBe('temporarilyUnavailable')
    expect(record.outcome.floatingProfit.unavailableReason).toBe('temporarilyUnavailable')
    expect(record.outcome.estimatedLiquidationPrice.value).toBeNull()
    expect(record.outcome.rMultiple.value?.toString()).toBe('1.53')
    expect(record.outcome.maximumFavorablePrice).toBeNull()
  })

  it('後端省略的欄位給安全的預設', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      id: 31, symbol: 'SOLUSDT', direction: 'short', leverage: '8', status: 'open', openedAt: '2026-09-27T00:00:00Z',
      review: { wentWrong: '追價', nextTime: '等回踩', executionScore: 2, reviewedAt: '2026-09-27T00:00:00Z' },
      outcome: { position: '1', averageEntryPrice: '186.42', grossProfit: '0', totalFee: '0', netProfit: '0' },
    }))

    const record = await proxy().findTrade(31)

    expect(record).toMatchObject({
      entryReason: '', confidence: null, tradingStrategyId: null, tradingStrategyName: null,
      tradingStrategyDeleted: false, closedAt: null, source: null,
    })
    expect(record.review).toMatchObject({ wentWell: '', wentWrong: '追價', nextTime: '等回踩' })
    expect(record.fills).toEqual([])
    expect(record.notes).toEqual([])
    expect(record.tags).toEqual([])
    expect(record.outcome.averageExitPrice).toBeNull()
    expect(record.outcome.feeRateMissing).toBe(false)
    expect(record.outcome.netProfitExcludesFunding).toBe(false)
  })

  it('還沒檢討的交易沒有檢討', async () => {
    const { review: _review, ...withoutReview } = RECORD_WIRE
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(withoutReview))

    expect((await proxy().findTrade(27)).review).toBeNull()
  })

  it.each([
    ['別人的或已刪除的交易', 404, { message: '找不到這筆交易' }, ContractTradeNotFoundError],
    ['後端自己壞了', 500, { message: 'boom' }, BackendServerError],
  ])('%s', async (_, status, data, expectedError) => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection(status, data)))

    await expect(proxy().findTrade(9)).rejects.toBeInstanceOf(expectedError)
  })
})

describe('ContractTradeRecordProxy.recordTrade', () => {
  const fill = new ContractTradeFillWriteDto(
    'entry', new Date('2026-09-25T06:03:00Z'), new Decimal('97905'), new Decimal('0.030'), 'taker', null)

  it('第一筆成交巢狀送出，手續費與時間省略時整個鍵不放', async () => {
    const fetchMock = vi.fn().mockResolvedValue(RECORD_WIRE)
    vi.stubGlobal('$fetch', fetchMock)

    await proxy().recordTrade(new ContractTradeRecordWriteDto(
      'BTCUSDT', 'long', new Decimal(10),
      new ContractTradeFillWriteDto('entry', null, new Decimal('97905'), new Decimal('0.030'), 'taker', null),
      new Decimal('96380'), null, '突破', 3, 5, [1], 'link-412'))

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE_URL}/contract-trade-records`)
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      body: {
        symbol: 'BTCUSDT',
        direction: 'long',
        leverage: '10',
        firstEntryFill: { kind: 'entry', price: '97905', quantity: '0.03', liquidity: 'taker' },
        plannedStopLossPrice: '96380',
        plannedTakeProfitPrice: null,
        entryReason: '突破',
        confidence: 3,
        tradingStrategyId: 5,
        setupTagIds: [1],
        journalLinkIdentifier: 'link-412',
      },
    })
    const body = fetchMock.mock.calls[0]?.[1].body as Record<string, Record<string, unknown>>
    expect(body.firstEntryFill).not.toHaveProperty('filledAt')
    expect(body.firstEntryFill).not.toHaveProperty('fee')
  })

  it('槓桿留白與沒有連結時整個鍵不放，時間與手續費有填就送', async () => {
    const fetchMock = vi.fn().mockResolvedValue(RECORD_WIRE)
    vi.stubGlobal('$fetch', fetchMock)

    await proxy().recordTrade(new ContractTradeRecordWriteDto(
      'BTCUSDT', 'long', null,
      new ContractTradeFillWriteDto('entry', new Date('2026-09-25T06:03:00Z'), new Decimal('97905'), new Decimal('0.03'), 'maker', new Decimal('1.2')),
      null, null, '', null, null, [], null))

    const body = fetchMock.mock.calls[0]?.[1].body as Record<string, unknown>
    expect(body).not.toHaveProperty('leverage')
    expect(body).not.toHaveProperty('journalLinkIdentifier')
    expect(body.firstEntryFill).toMatchObject({ filledAt: '2026-09-25T06:03:00.000Z', fee: '1.2' })
  })

  it('同標的同方向已有持倉中時帶出那一筆的編號', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection(409, {
      message: 'BTCUSDT 做多已有持倉中的 #27，請在那一筆加成交', existingContractTradeRecordId: 27,
    })))

    const failure = await proxy().recordTrade(new ContractTradeRecordWriteDto(
      'BTCUSDT', 'long', null, fill, null, null, '', null, null, [], null)).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(ContractTradeOpenPositionExistsError)
    expect((failure as ContractTradeOpenPositionExistsError).existingTradeId).toBe(27)
  })

  it.each([
    ['訊息裡有編號就從訊息讀', '已有持倉中的 #31', 31],
    ['訊息裡也沒有就是不知道', '已有持倉中的交易', null],
  ])('後端沒給編號時%s', async (_, message, expectedId) => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection(409, { message })))

    const failure = await proxy().recordTrade(new ContractTradeRecordWriteDto(
      'BTCUSDT', 'long', null, fill, null, null, '', null, null, [], null)).catch((error: unknown) => error)

    expect((failure as ContractTradeOpenPositionExistsError).existingTradeId).toBe(expectedId)
  })
})

describe('ContractTradeRecordProxy 拒絕對到欄位', () => {
  const fill = new ContractTradeFillWriteDto('exit', null, new Decimal(1), new Decimal(1), 'taker', null)

  it.each([
    ['後端說了欄位', { message: '槓桿倍數不得小於一', field: 'leverage' }, 'leverage'],
    ['後端的欄位名認不得時看訊息', { message: '做多的止損必須低於進場價', field: 'unknown' }, 'plannedStopLossPrice'],
    ['出場超過持倉', { message: '出場數量超過目前持倉 0.031，要反手請先平倉再新增一筆反方向的交易' }, 'exitQuantity'],
    ['成交時間在未來', { message: '成交時間不能在未來' }, 'fillTime'],
    ['對不到任何欄位', { message: '請求有誤' }, null],
  ])('%s', async (_, data, expectedField) => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection(400, data)))

    const failure = await proxy().addFill(27, fill).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(ContractTradeRejectedError)
    expect((failure as ContractTradeRejectedError).message).toBe(data.message)
    expect((failure as ContractTradeRejectedError).formField?.field ?? null).toBe(expectedField)
  })

  it('其他狀態碼的拒絕原樣帶回', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection(429, { message: '太頻繁' })))

    const failure = await proxy().addFill(27, fill).catch((error: unknown) => error)

    expect(failure).not.toBeInstanceOf(ContractTradeRejectedError)
    expect((failure as Error).message).toBe('太頻繁')
  })
})

describe('ContractTradeRecordProxy 其餘路由', () => {
  it.each([
    ['加成交', (subject: ContractTradeRecordProxy) => subject.addFill(27, new ContractTradeFillWriteDto('entry', null, new Decimal(1), new Decimal(2), 'taker', null)), '/contract-trade-records/27/fills', 'POST'],
    ['修正成交', (subject: ContractTradeRecordProxy) => subject.amendFill(27, 3, new ContractTradeFillWriteDto('entry', null, new Decimal(1), new Decimal(2), 'taker', null)), '/contract-trade-records/27/fills/3', 'PUT'],
    ['刪除成交', (subject: ContractTradeRecordProxy) => subject.removeFill(27, 3), '/contract-trade-records/27/fills/3', 'DELETE'],
    ['改計畫', (subject: ContractTradeRecordProxy) => subject.amendPlan(27, new ContractTradePlanWriteDto(new Decimal(1), new Decimal(2), '理由', 4)), '/contract-trade-records/27/plan', 'PUT'],
    ['改計畫清空止損止盈', (subject: ContractTradeRecordProxy) => subject.amendPlan(27, new ContractTradePlanWriteDto(null, null, '', null)), '/contract-trade-records/27/plan', 'PUT'],
    ['加附註', (subject: ContractTradeRecordProxy) => subject.addNote(27, '附註'), '/contract-trade-records/27/notes', 'POST'],
    ['寫檢討', (subject: ContractTradeRecordProxy) => subject.writeReview(27, new ContractTradeReviewWriteDto('a', 'b', 'c', 4, [2])), '/contract-trade-records/27/review', 'PUT'],
    ['貼型態標籤', (subject: ContractTradeRecordProxy) => subject.assignSetupTags(27, [1, 2]), '/contract-trade-records/27/setup-tags', 'PUT'],
  ] as const)('%s', async (_, act, path, method) => {
    const fetchMock = vi.fn().mockResolvedValue(RECORD_WIRE)
    vi.stubGlobal('$fetch', fetchMock)

    const record = await act(proxy())

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE_URL}${path}`)
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method })
    expect(record.id).toBe(27)
  })

  it('檢討與計畫的內容照格式送出', async () => {
    const fetchMock = vi.fn().mockResolvedValue(RECORD_WIRE)
    vi.stubGlobal('$fetch', fetchMock)

    await proxy().writeReview(27, new ContractTradeReviewWriteDto('照計畫', '提早出場', '讓止盈成交', 4, [2]))
    await proxy().amendPlan(27, new ContractTradePlanWriteDto(new Decimal('96300'), null, '理由', 3))

    expect(fetchMock.mock.calls[0]?.[1].body).toEqual({
      wentWell: '照計畫', wentWrong: '提早出場', nextTime: '讓止盈成交', executionScore: 4, mistakeTagIds: [2],
    })
    expect(fetchMock.mock.calls[1]?.[1].body).toEqual({
      plannedStopLossPrice: '96300', plannedTakeProfitPrice: null, entryReason: '理由', confidence: 3,
    })
  })

  it('刪除交易；別人的找不到', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(null).mockRejectedValueOnce(rejection(404, { message: '找不到這筆交易' }))
    vi.stubGlobal('$fetch', fetchMock)

    await proxy().deleteTrade(33)
    await expect(proxy().deleteTrade(9)).rejects.toBeInstanceOf(ContractTradeNotFoundError)
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'DELETE' })
  })
})

describe('ContractTradeRecordProxy.listTrades', () => {
  it('帶著篩選與筆數上限，收成一頁摘要', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      total: 1,
      records: [{
        id: 32, symbol: 'ETHUSDT', direction: 'short', leverage: '5', status: 'open',
        averageEntryPrice: '3412.5', floatingProfit: { value: '38.2' }, rMultiple: { unavailableReason: 'noStopLoss' },
        openedAt: '2026-09-27T00:00:00Z',
      }],
    })
    vi.stubGlobal('$fetch', fetchMock)

    const page = await proxy().listTrades(new ContractTradeListQueryDto('open', 'ETHUSDT', 200))

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ query: { status: 'open', symbol: 'ETHUSDT', limit: '200' } })
    expect(page.total).toBe(1)
    expect(page.records[0]).toMatchObject({
      id: 32, tradingStrategyId: null, tradingStrategyName: null, tradingStrategyDeleted: false,
      averageExitPrice: null, netProfit: null, closedAt: null,
    })
    expect(page.records[0]?.floatingProfit.value?.toString()).toBe('38.2')
    expect(page.records[0]?.rMultiple.unavailableReason).toBe('noStopLoss')
    expect(page.records[0]?.tags).toEqual([])
  })

  it('沒有篩選就不帶，後端回空也讀得懂', async () => {
    const fetchMock = vi.fn().mockResolvedValue({})
    vi.stubGlobal('$fetch', fetchMock)

    const page = await proxy().listTrades(new ContractTradeListQueryDto())

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ query: {} })
    expect(page.records).toEqual([])
    expect(page.total).toBe(0)
  })

  it('已平倉的摘要帶著淨損益與標籤', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      total: 1,
      records: [{
        id: 27, symbol: 'BTCUSDT', direction: 'long', leverage: '10', status: 'closed', tradingStrategyId: 5,
        tradingStrategyName: 'BTC 趨勢跟隨', tradingStrategyDeleted: true, averageEntryPrice: '97927.6',
        averageExitPrice: '100420', netProfit: '120.53', rMultiple: { value: '1.53' },
        tags: [{ id: 1, kind: 'setup', name: '突破' }], openedAt: '2026-09-25T06:03:00Z', closedAt: '2026-09-26T08:40:00Z',
      }],
    }))

    const [summary] = (await proxy().listTrades(new ContractTradeListQueryDto())).records

    expect(summary?.netProfit?.toString()).toBe('120.53')
    expect(summary?.tradingStrategyDeleted).toBe(true)
    expect(summary?.tags[0]?.name).toBe('突破')
    expect(summary?.closedAt?.toISOString()).toBe('2026-09-26T08:40:00.000Z')
  })
})

describe('ContractTradeRecordProxy.findStatistics', () => {
  it('收成統計 entity', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      period: '30d', closedTradeCount: 30, netProfit: '1284.6', winRate: 0.47, averageRMultiple: '0.38',
      profitFactor: '1.46', feeShareOfGrossProfit: 0.18, averageEntrySlippagePercentage: '0.07',
      slippageTradeCount: 2, excludedFromRMultipleCount: 3,
      cumulativeRMultiples: [{ closedAt: '2026-09-01T00:00:00Z', cumulativeRMultiple: '1.5' }],
      rMultipleDistribution: [{ label: '1~2R', count: 6, profitable: true }],
      mistakeCosts: [{ tagName: '移動止損', tradeCount: 4, rMultipleTotal: '-3.2' }],
      linkedGroup: { tradeCount: 22, winRate: 0.56, averageRMultiple: '0.71' },
      selfJudgedGroup: { tradeCount: 8, winRate: null, averageRMultiple: null },
    })
    vi.stubGlobal('$fetch', fetchMock)

    const statistics = await proxy().findStatistics('30d')

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE_URL}/contract-trade-records/statistics`)
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ query: { period: '30d' } })
    expect(statistics.excludedFromRMultipleCount).toBe(3)
    expect(statistics.cumulativeRMultiples[0]?.cumulativeRMultiple.toString()).toBe('1.5')
    expect(statistics.rMultipleDistribution[0]?.profitable).toBe(true)
    expect(statistics.mistakeCosts[0]?.rMultipleTotal.toString()).toBe('-3.2')
    expect(statistics.linkedGroup.averageRMultiple?.toString()).toBe('0.71')
    expect(statistics.selfJudgedGroup.winRate).toBeNull()
  })

  it('沒有已平倉交易時缺的欄位給預設', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ period: '', closedTradeCount: 0 }))

    const statistics = await proxy().findStatistics('7d')

    expect(statistics).toMatchObject({
      period: '7d', winRate: null, averageRMultiple: null, profitFactor: null, feeShareOfGrossProfit: null,
      averageEntrySlippagePercentage: null, slippageTradeCount: 0, excludedFromRMultipleCount: 0,
    })
    expect(statistics.netProfit.toString()).toBe('0')
    expect(statistics.cumulativeRMultiples).toEqual([])
    expect(statistics.rMultipleDistribution).toEqual([])
    expect(statistics.mistakeCosts).toEqual([])
    expect(statistics.linkedGroup.tradeCount).toBe(0)
  })
})

describe('ContractTradeRecordProxy.findJournalLink', () => {
  it('收成預填內容', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      journalLinkIdentifier: 'link-412', mode: 'newTrade', strategyBotName: 'BTC 趨勢跟隨', runNumber: 412,
      ranAt: '2026-09-25T06:00:00Z', symbol: 'BTCUSDT', direction: 'long', leverage: '10',
      plannedStopLossPrice: '96380', plannedTakeProfitPrice: '100785', tradingStrategyId: 5,
      tradingStrategyName: 'BTC 趨勢跟隨', referencePrice: '97850', suggestedQuantity: '0.051',
    })
    vi.stubGlobal('$fetch', fetchMock)

    const prefill = await proxy().findJournalLink('link/412')

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE_URL}/contract-trade-records/journal-links/link%2F412`)
    expect(prefill).toMatchObject({ mode: 'newTrade', targetTradeId: null, runNumber: 412, tradingStrategyId: 5 })
    expect(prefill.suggestedQuantity?.toString()).toBe('0.051')
  })

  it('後端省略的欄位給預設，沒回識別碼就用送去的那一個', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      journalLinkIdentifier: '', mode: 'addEntryFill', targetTradeId: 27, strategyBotName: 'b', runNumber: 1,
      ranAt: '2026-09-25T06:00:00Z', symbol: 'BTCUSDT', direction: 'long', leverage: '10',
    }))

    const prefill = await proxy().findJournalLink('link-412')

    expect(prefill).toMatchObject({
      journalLinkIdentifier: 'link-412', targetTradeId: 27, tradingStrategyId: null, tradingStrategyName: null,
      referencePrice: null, suggestedQuantity: null, plannedStopLossPrice: null,
    })
  })

  it.each([
    ['那一輪不在紀錄中或是別人的', 404, JournalLinkNotFoundError],
    ['其他失敗原樣帶回', 500, BackendServerError],
  ])('%s', async (_, status, expectedError) => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection(status, { message: '找不到這一輪' })))

    await expect(proxy().findJournalLink('link-412')).rejects.toBeInstanceOf(expectedError)
  })

  it('連不上維持連不上', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(createFetchError({
      request: BASE_URL, options: {}, error: new Error('fetch failed'),
    } as unknown as FetchContext)))

    await expect(proxy().findJournalLink('link-412')).rejects.toBeInstanceOf(BackendUnreachableError)
  })
})
