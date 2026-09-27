import Decimal from 'decimal.js'
import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SpotTradeRecordProxy } from '~/infrastructure/proxy/spot-trade-record-proxy'
import { TradingStrategyProxy } from '~/infrastructure/proxy/trading-strategy-proxy'
import { SpotTradeRecordWriteDto } from '~/domain/models/dto/spot-trade-record-write-dto'
import { SpotTradeFillWriteDto } from '~/domain/models/dto/spot-trade-fill-write-dto'
import { SpotTradeListQueryDto } from '~/domain/models/dto/spot-trade-list-query-dto'
import { TradePlanWriteDto } from '~/domain/models/dto/trade-plan-write-dto'
import { TradeReviewWriteDto } from '~/domain/models/dto/trade-review-write-dto'
import { TradeRecordNotFoundError } from '~/domain/errors/trade-record-not-found-error'
import { JournalLinkNotFoundError } from '~/domain/errors/journal-link-not-found-error'
import { TradeAlreadyOpenError } from '~/domain/errors/trade-already-open-error'
import { TradeRejectedError } from '~/domain/errors/trade-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
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
  return new SpotTradeRecordProxy(BASE_URL, signedInSessionStorage())
}

const RECORD_WIRE = {
  id: 5,
  symbol: '2330',
  market: 'taiwanStock',
  currency: 'TWD',
  status: 'closed',
  plan: { plannedStopLossPrice: '1000', plannedTakeProfitPrice: null, entryReason: '回檔', confidence: 3, locked: true },
  fills: [
    { id: 1, kind: 'buy', filledAt: '2026-09-01T01:00:00Z', price: '1050', quantity: '1000', fee: '117' },
    { id: 2, kind: 'sell', filledAt: '2026-09-03T03:30:00Z', price: '1120', quantity: '1000', fee: '1983' },
  ],
  notes: [{ id: 1, content: '附註', createdAt: '2026-09-04T00:00:00Z' }],
  setupTags: [{ id: 4, kind: 'setup', name: '回踩' }],
  mistakeTags: null,
  tradingStrategyId: 7,
  tradingStrategyName: '台股均線',
  tradingStrategyDeleted: false,
  source: { strategyBotId: 3, strategyBotName: '台積電趨勢', runNumber: 88, referencePrice: '1048', suggestedStopLossPrice: '1000', suggestedTakeProfitPrice: null },
  review: { wentWell: '照計畫', executionScore: 4, reviewedAt: '2026-09-05T00:00:00Z' },
  openedAt: '2026-09-01T01:00:00Z',
  closedAt: '2026-09-03T03:30:00Z',
  averageBuyPrice: '1050',
  averageSellPrice: '1120',
  boughtQuantity: '1000',
  holding: '0',
  outcome: {
    grossProfit: '70000',
    totalFee: '2100',
    netProfit: '67900',
    buyCost: '1050000',
    returnRate: 0.0647,
    plannedRisk: '50000',
    rMultiple: 1.358,
    rMultipleUnavailableReason: '',
    excursion: { available: true, adversePrice: '1020', favorablePrice: '1150', adverseRMultiple: -0.6, favorableRMultiple: 2 },
    profitCaptureRate: 0.7,
    floatingProfit: { available: false, unavailableReason: 'notOpen' },
    entrySlippagePercentage: 0.19,
  },
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SpotTradeRecordProxy：讀一筆', () => {
  it('把交易服務的現貨交易正規化；比率接受數字、金額接受字串', async () => {
    const fetchMock = vi.fn().mockResolvedValue(RECORD_WIRE)
    vi.stubGlobal('$fetch', fetchMock)

    const record = await proxy().findTrade(5)

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE_URL}/spot-trade-records/5`)
    expect(record).toMatchObject({ symbol: '2330', market: 'taiwanStock', currency: 'TWD', status: 'closed', entryReason: '回檔', confidence: 3, tradingStrategyName: '台股均線' })
    expect(record.plannedStopLossPrice?.toString()).toBe('1000')
    expect(record.plannedTakeProfitPrice).toBeNull()
    expect(record.fills.map(fill => [fill.kind, fill.fee.toString()])).toEqual([['buy', '117'], ['sell', '1983']])
    expect(record.tags.map(tag => tag.name)).toEqual(['回踩'])
    expect(record.source?.suggestedTakeProfitPrice).toBeNull()
    expect(record.review).toMatchObject({ wentWell: '照計畫', wentWrong: '', nextTime: '', executionScore: 4 })
    expect(record.outcome.returnRate.value?.toString()).toBe('0.0647')
    expect(record.outcome.rMultiple.value?.toString()).toBe('1.358')
    expect(record.outcome.maximumAdverseExcursion.value?.toString()).toBe('-0.6')
    expect(record.outcome.averageSellPrice?.toString()).toBe('1120')
    expect(record.outcome.buyCost.toString()).toBe('1050000')
    expect(record.outcome.floatingProfit.unavailableReason).toBe('notApplicable')
    expect(record.outcome.entrySlippagePercentage.value?.toString()).toBe('0.19')
  })

  it.each([
    ['沒有止損算不出 R', { plannedRisk: null, rMultiple: null, rMultipleUnavailableReason: 'noStopLoss' }, 'rMultiple', 'noStopLoss'],
    ['R 其他原因算不出', { rMultiple: null }, 'rMultiple', 'temporarilyUnavailable'],
    ['沒有行情', { excursion: { available: false, unavailableReason: 'noMarketData' }, profitCaptureRate: null }, 'maximumAdverseExcursion', 'noMarketData'],
    ['列表不計算極值', { excursion: { available: false, unavailableReason: 'notComputed' } }, 'maximumFavorableExcursion', 'temporarilyUnavailable'],
    ['沒有最新價', { floatingProfit: { available: false, unavailableReason: 'noLatestPrice' } }, 'floatingProfit', 'noLatestPrice'],
    ['報酬率沒有值', { returnRate: null }, 'returnRate', 'notApplicable'],
  ] as const)('%s', async (_name, outcomeOverrides, measure, reason) => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ ...RECORD_WIRE, outcome: { ...RECORD_WIRE.outcome, ...outcomeOverrides } }))

    const record = await proxy().findTrade(5)

    expect(record.outcome[measure].value).toBeNull()
    expect(record.outcome[measure].unavailableReason).toBe(reason)
  })

  it('持有中算得出浮動損益；沒有賣出時賣出均價是空的', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      ...RECORD_WIRE,
      status: 'open',
      closedAt: null,
      averageSellPrice: null,
      source: null,
      review: null,
      plan: undefined,
      outcome: { ...RECORD_WIRE.outcome, floatingProfit: { available: true, amount: '18000', price: '1068' } },
    }))

    const record = await proxy().findTrade(5)

    expect(record.outcome.floatingProfit.value?.toString()).toBe('18000')
    expect(record.outcome.averageSellPrice).toBeNull()
    expect(record).toMatchObject({ closedAt: null, source: null, review: null, entryReason: '', confidence: null })
  })
})

describe('SpotTradeRecordProxy：寫入', () => {
  it('新增：第一筆買進與計畫巢狀送出，沒填的手續費與時間不送', async () => {
    const fetchMock = vi.fn().mockResolvedValue(RECORD_WIRE)
    vi.stubGlobal('$fetch', fetchMock)

    await proxy().recordTrade(new SpotTradeRecordWriteDto(
      '2330',
      new SpotTradeFillWriteDto('buy', null, new Decimal('1050'), new Decimal('1000'), null),
      new Decimal('1000'),
      null,
      '回檔',
      3,
      7,
      [4],
      'link-88',
    ))

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE_URL}/spot-trade-records`)
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      body: {
        symbol: '2330',
        firstBuyFill: { kind: 'buy', price: '1050', quantity: '1000' },
        plan: { plannedStopLossPrice: '1000', plannedTakeProfitPrice: null, entryReason: '回檔', confidence: 3 },
        tradingStrategyId: 7,
        setupTagIds: [4],
        journalLinkIdentifier: 'link-88',
      },
    })
    const body = fetchMock.mock.calls[0]?.[1].body as Record<string, Record<string, unknown>>
    expect(body.firstBuyFill).not.toHaveProperty('fee')
    expect(body.firstBuyFill).not.toHaveProperty('filledAt')
    expect(body).not.toHaveProperty('leverage')
  })

  it('沒有來自連結時不送連結識別碼；有時間與手續費就送', async () => {
    const fetchMock = vi.fn().mockResolvedValue(RECORD_WIRE)
    vi.stubGlobal('$fetch', fetchMock)

    await proxy().recordTrade(new SpotTradeRecordWriteDto(
      '2330',
      new SpotTradeFillWriteDto('buy', new Date('2026-09-01T01:00:00Z'), new Decimal('1050'), new Decimal('1000'), new Decimal('117')),
      null, null, '', null, null, [], null,
    ))

    const body = fetchMock.mock.calls[0]?.[1].body as Record<string, Record<string, unknown>>
    expect(body).not.toHaveProperty('journalLinkIdentifier')
    expect(body.firstBuyFill).toMatchObject({ filledAt: '2026-09-01T01:00:00.000Z', fee: '117' })
  })

  it('其餘寫入走對的路徑與動詞', async () => {
    const fetchMock = vi.fn().mockResolvedValue(RECORD_WIRE)
    vi.stubGlobal('$fetch', fetchMock)
    const fill = new SpotTradeFillWriteDto('sell', null, new Decimal('1120'), new Decimal('400'), null)

    await proxy().addFill(5, fill)
    await proxy().amendFill(5, 2, fill)
    await proxy().removeFill(5, 2)
    await proxy().amendPlan(5, new TradePlanWriteDto(null, new Decimal('1150'), '', 2))
    await proxy().addNote(5, '附註')
    await proxy().writeReview(5, new TradeReviewWriteDto('對', '錯', '下次', 4, [3]))
    await proxy().assignSetupTags(5, [4])
    await proxy().deleteTrade(5)

    expect(fetchMock.mock.calls.map(call => [call[0], call[1]?.method ?? 'GET'])).toEqual([
      [`${BASE_URL}/spot-trade-records/5/fills`, 'POST'],
      [`${BASE_URL}/spot-trade-records/5/fills/2`, 'PUT'],
      [`${BASE_URL}/spot-trade-records/5/fills/2`, 'DELETE'],
      [`${BASE_URL}/spot-trade-records/5/plan`, 'PUT'],
      [`${BASE_URL}/spot-trade-records/5/notes`, 'POST'],
      [`${BASE_URL}/spot-trade-records/5/review`, 'PUT'],
      [`${BASE_URL}/spot-trade-records/5/setup-tags`, 'PUT'],
      [`${BASE_URL}/spot-trade-records/5`, 'DELETE'],
    ])
    expect(fetchMock.mock.calls[0]?.[1].body).toEqual({ kind: 'sell', price: '1120', quantity: '400' })
    expect(fetchMock.mock.calls[3]?.[1].body).toEqual({ plannedStopLossPrice: null, plannedTakeProfitPrice: '1150', entryReason: '', confidence: 2 })
    expect(fetchMock.mock.calls[5]?.[1].body).toEqual({ wentWell: '對', wentWrong: '錯', nextTime: '下次', executionScore: 4, mistakeTagIds: [3] })
    expect(fetchMock.mock.calls[6]?.[1].body).toEqual({ setupTagIds: [4] })
  })

  it.each([
    ['找不到', 404, { message: '找不到這筆交易' }, TradeRecordNotFoundError],
    ['已有持有中', 409, { message: '2330 已有持有中的 #5', openTradeId: 5 }, TradeAlreadyOpenError],
    ['規則不通過', 400, { message: '賣出超過持有 600' }, TradeRejectedError],
    ['服務出錯', 502, { message: '壞了' }, BackendServerError],
  ])('%s時轉成具名錯誤', async (_name, status, data, errorClass) => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection(status, data)))

    await expect(proxy().addFill(5, new SpotTradeFillWriteDto('sell', null, new Decimal('1'), new Decimal('800'), null))).rejects.toBeInstanceOf(errorClass)
  })

  it('已有持有中：沒帶編號時從訊息讀出 #5', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection(409, { message: '2330 已有持有中的 #5' })))

    const failure = await proxy().recordTrade(new SpotTradeRecordWriteDto(
      '2330', new SpotTradeFillWriteDto('buy', null, new Decimal('1'), new Decimal('1'), null), null, null, '', null, null, [], null,
    )).catch(error => error)

    expect((failure as TradeAlreadyOpenError).existingTradeId).toBe(5)
  })

  it.each([
    ['賣出超過持有', { message: '賣出超過持有 600' }, 'exitQuantity'],
    ['整數股', { message: '台股數量以股計，必須是整數' }, 'fillQuantity'],
    ['止損放錯邊', { message: '止損必須低於買進價' }, 'plannedStopLossPrice'],
    ['交易服務指名欄位', { message: '不合法', field: 'fee' }, 'fillFee'],
  ])('%s時指向對應欄位', async (_name, data, field) => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection(400, data)))

    const failure = await proxy().amendPlan(5, new TradePlanWriteDto(null, null, '', null)).catch(error => error)

    expect((failure as TradeRejectedError).formField?.field).toBe(field)
  })

  it('刪除時找不到轉成具名錯誤', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection(404, { message: '找不到這筆交易' })))

    await expect(proxy().deleteTrade(5)).rejects.toBeInstanceOf(TradeRecordNotFoundError)
  })
})

describe('SpotTradeRecordProxy：列表、統計、連結', () => {
  it('列表帶筆數上限', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ trades: [RECORD_WIRE], totalCount: 1 })
    vi.stubGlobal('$fetch', fetchMock)

    const page = await proxy().listTrades(new SpotTradeListQueryDto(200))

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ query: { limit: '200' } })
    expect(page.totalCount).toBe(1)
    expect(page.records[0]?.symbol).toBe('2330')
  })

  it('列表沒有交易時是空的', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ trades: null }))

    expect((await proxy().listTrades(new SpotTradeListQueryDto(null))).records).toEqual([])
  })

  it('統計依市場兩組讀回', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      period: '30d',
      markets: [{
        market: 'taiwanStock',
        currency: 'TWD',
        closedTradeCount: 10,
        winCount: 6,
        winRate: 0.6,
        netProfit: '120000',
        averageReturnRate: 0.0312,
        profitFactor: 1.8,
        averageRMultiple: 0.9,
        rTradeCount: 3,
        cumulativeProfit: [{ tradeId: 5, closedAt: '2026-09-03T03:30:00Z', netProfit: '67900', cumulativeNetProfit: '67900' }],
        returnDistribution: [{ label: '-5%~0%', count: 2 }, { label: '0%~5%', count: 4 }],
        mistakeCosts: [{ tagId: 3, name: '追價進場', tradeCount: 2, totalNetProfit: '-30000', averageReturnRate: -0.028 }],
        withTradingStrategy: { tradeCount: 4, winRate: 0.75, averageReturnRate: 0.05 },
        selfJudged: { tradeCount: 6, winRate: 0.5, averageReturnRate: null },
        averageEntrySlippagePercentage: 0.12,
        entrySlippageTradeCount: 2,
      }, { market: 'crypto', currency: 'USDT' }],
    })
    vi.stubGlobal('$fetch', fetchMock)

    const statistics = await proxy().findStatistics('30d')
    const [taiwanStock, crypto] = statistics.markets

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ query: { period: '30d' } })
    expect(taiwanStock).toMatchObject({ market: 'taiwanStock', closedTradeCount: 10, winRate: 0.6, averageReturnRate: 0.0312, rTradeCount: 3 })
    expect(taiwanStock?.profitFactor?.toString()).toBe('1.8')
    expect(taiwanStock?.cumulativeProfit[0]?.cumulativeNetProfit.toString()).toBe('67900')
    expect(taiwanStock?.returnDistribution.map(bucket => bucket.profitable)).toEqual([false, true])
    expect(taiwanStock?.mistakeCosts[0]).toMatchObject({ tagName: '追價進場', tradeCount: 2, averageReturnRate: -0.028 })
    expect(taiwanStock?.linkedGroup).toMatchObject({ tradeCount: 4, winRate: 0.75, averageReturnRate: 0.05 })
    expect(taiwanStock?.averageEntrySlippagePercentage?.toString()).toBe('0.12')
    expect(crypto).toMatchObject({ closedTradeCount: 0, winRate: null, cumulativeProfit: [], mistakeCosts: [] })
    expect(crypto?.netProfit.toString()).toBe('0')
  })

  it('連結預填讀回四種情況之一', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      mode: 'addSellFill',
      targetTradeId: 5,
      strategyBotId: 3,
      strategyBotName: '台積電趨勢',
      runNumber: 88,
      ranAt: '2026-09-27T01:30:00Z',
      signal: 'sell',
      symbol: '2330',
      market: 'taiwanStock',
      price: '1120',
      quantity: '600',
      plannedStopLossPrice: null,
      plannedTakeProfitPrice: null,
      tradingStrategyId: 7,
      priceNeedsConfirmation: true,
      missingReferenceReason: '',
    })
    vi.stubGlobal('$fetch', fetchMock)

    const prefill = await proxy().findJournalLink('link 88')

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE_URL}/spot-trade-records/journal-links/link%2088`)
    expect(prefill).toMatchObject({ journalLinkIdentifier: 'link 88', mode: 'addSellFill', targetTradeId: 5, signal: 'sell', market: 'taiwanStock', plannedStopLossPrice: null })
    expect(prefill.quantity?.toString()).toBe('600')
  })

  it('連結找不到時轉成具名錯誤；其他錯誤原樣帶回', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection(404, { message: '找不到這一輪' })))
    await expect(proxy().findJournalLink('x')).rejects.toBeInstanceOf(JournalLinkNotFoundError)

    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection(502, { message: '壞了' })))
    await expect(proxy().findJournalLink('x')).rejects.toBeInstanceOf(BackendServerError)
  })
})

describe('TradingStrategyProxy.findSpotTradeComparison', () => {
  it('讀回現貨實盤 vs 回測的每一列', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      tradingStrategyId: 7,
      tradingStrategyName: '台股均線',
      tradingStrategyDeleted: false,
      noClosedTrades: false,
      averageEntrySlippagePercentage: 0.1,
      entrySlippageTradeCount: 2,
      rows: [
        { symbol: '2330', market: 'taiwanStock', live: { closedTradeCount: 8, winRate: 0.5, averageEntrySlippagePercentage: 0.1, entrySlippageTradeCount: 2 }, backtest: { closedTradeCount: 12, winRate: 0.62 }, backtestUnavailableReason: '' },
        { symbol: '2317', market: 'taiwanStock', live: { closedTradeCount: 3 }, backtest: null, backtestUnavailableReason: '行情不夠' },
      ],
    })
    vi.stubGlobal('$fetch', fetchMock)

    const comparison = await new TradingStrategyProxy(BASE_URL, signedInSessionStorage()).findSpotTradeComparison(7)

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE_URL}/trading-strategies/7/spot-trade-comparison`)
    expect(comparison).toMatchObject({ tradingStrategyName: '台股均線', tradingStrategyDeleted: false, entrySlippageTradeCount: 2 })
    expect(comparison.rows[0]).toMatchObject({ symbol: '2330', market: 'taiwanStock', backtestFailureReason: null })
    expect(comparison.rows[0]?.backtest).toMatchObject({ closedTradeCount: 12, winRate: 0.62, averageEntrySlippagePercentage: null, entrySlippageTradeCount: 0 })
    expect(comparison.rows[1]).toMatchObject({ backtest: null, backtestFailureReason: '行情不夠' })
    expect(comparison.rows[1]?.live).toMatchObject({ winRate: null, entrySlippageTradeCount: 0 })
  })

  it('空的回應也讀得回來；找不到策略轉成具名錯誤', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({}))
    const empty = await new TradingStrategyProxy(BASE_URL, signedInSessionStorage()).findSpotTradeComparison(7)
    expect(empty).toMatchObject({ tradingStrategyName: '', tradingStrategyDeleted: false, rows: [], averageEntrySlippagePercentage: null })

    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection(404, { message: '找不到這份交易策略' })))
    await expect(new TradingStrategyProxy(BASE_URL, signedInSessionStorage()).findSpotTradeComparison(7)).rejects.toThrow('找不到這份交易策略')
  })
})
