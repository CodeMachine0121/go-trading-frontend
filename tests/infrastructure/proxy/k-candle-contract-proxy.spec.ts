import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { KCandleContractProxy } from '~/infrastructure/proxy/k-candle-contract-proxy'
import { KCandleQueryDomain } from '~/domain/models/domains/k-candle-query-domain'
import { KCandleQueryDto } from '~/domain/models/dto/k-candle-query-dto'
import { KCandleChartLoadPlanVo } from '~/domain/models/vo/k-candle-chart-load-plan-vo'
import type { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { signedInSessionStorage, SIGNED_IN_HEADERS } from '../../fixtures/session-storage'
import {
  AUTOMATIC_AGGREGATION_INTERVAL_CHOICE, aggregationIntervalChoiceOf,
} from '../../fixtures/aggregation-interval-choice'

const BASE_URL = 'http://localhost:8080'

function buildQueryAt(currentTime: Date): KCandleQueryDomain {
  vi.useFakeTimers()
  vi.setSystemTime(currentTime)
  const kCandleQueryDomain = new KCandleQueryDomain(
    new KCandleQueryDto('BTCUSDT', new Date('2026-09-23T07:00:00.000Z')),
  )
  vi.useRealTimers()

  return kCandleQueryDomain
}

const QUERY = buildQueryAt(new Date('2026-09-23T12:00:00.000Z'))

function loadPlanChoosing(
  choice: AggregationIntervalChoiceDto = AUTOMATIC_AGGREGATION_INTERVAL_CHOICE,
): KCandleChartLoadPlanVo {
  return new KCandleChartLoadPlanVo(
    true, 'BTCUSDT',
    new Date('2026-09-23T03:00:00.000Z'), new Date('2026-09-23T09:00:00.000Z'),
    new Date('2026-09-23T00:00:00.000Z'), new Date('2026-09-23T12:00:00.000Z'),
    choice,
  )
}

/** 一根有三條線的合約 K 線，照後端回的樣子。 */
const K_CANDLE_CONTRACT_WIRE = {
  symbol: 'BTCUSDT',
  openTime: '2026-09-23T08:01:00Z',
  open: '100',
  high: '120',
  low: '90',
  close: '110.5',
  volume: '11',
  quoteVolume: '1200',
  takerBuyBaseVolume: '5',
  takerBuyQuoteVolume: '600',
  tradeCount: 42,
  markOpen: '100.1',
  markHigh: '120.1',
  markLow: '90.1',
  markClose: '110.6',
  indexOpen: '100.2',
  indexHigh: '120.2',
  indexLow: '90.2',
  indexClose: '110.7',
  premiumIndexOpen: '0.0001',
  premiumIndexHigh: '0.0002',
  premiumIndexLow: '-0.0006',
  premiumIndexClose: '-0.0005',
}

/** 同一根，但它是在指數價格與溢價指數開始被記錄之前存下的。 */
const K_CANDLE_CONTRACT_WIRE_BEFORE_THE_LATER_LINES = {
  ...K_CANDLE_CONTRACT_WIRE,
  openTime: '2026-09-23T08:00:00Z',
  indexOpen: null,
  indexHigh: null,
  indexLow: null,
  indexClose: null,
  premiumIndexOpen: null,
  premiumIndexHigh: null,
  premiumIndexLow: null,
  premiumIndexClose: null,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('KCandleContractProxy', () => {
  it('查一段合約 K 線時問的是合約那一條線，不是現貨', async () => {
    const fetchMock = vi.fn().mockResolvedValue([])
    vi.stubGlobal('$fetch', fetchMock)

    await new KCandleContractProxy(BASE_URL, signedInSessionStorage())
      .findKCandleContractsInRange(QUERY)

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/contract-k-candles', {
      headers: SIGNED_IN_HEADERS,
      query: {
        symbol: 'BTCUSDT',
        startTime: '2026-09-23T07:00:00.000Z',
        endTime: '2026-09-23T12:00:00.000Z',
      },
    })
  })

  it('把一根合約 K 線連同三條線與成交筆數收進來，負的溢價照原樣', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([K_CANDLE_CONTRACT_WIRE]))

    const [kCandleContract] = await new KCandleContractProxy(BASE_URL, signedInSessionStorage())
      .findKCandleContractsInRange(QUERY)

    expect(kCandleContract?.openTime.toISOString()).toBe('2026-09-23T08:01:00.000Z')
    expect(kCandleContract?.close.toString()).toBe('110.5')
    expect(kCandleContract?.tradeCount).toBe(42)
    expect(kCandleContract?.markPriceLine.close.toString()).toBe('110.6')
    expect(kCandleContract?.indexPriceLine?.close.toString()).toBe('110.7')
    expect(kCandleContract?.premiumIndexLine?.close.toString()).toBe('-0.0005')
    expect(kCandleContract?.premiumIndexLine?.low.toString()).toBe('-0.0006')
  })

  it('舊合約 K 線沒有的那兩條是「沒有」，不是零', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([K_CANDLE_CONTRACT_WIRE_BEFORE_THE_LATER_LINES]))

    const [kCandleContract] = await new KCandleContractProxy(BASE_URL, signedInSessionStorage())
      .findKCandleContractsInRange(QUERY)

    expect(kCandleContract?.indexPriceLine).toBeNull()
    expect(kCandleContract?.premiumIndexLine).toBeNull()
    expect(kCandleContract?.markPriceLine.close.toString()).toBe('110.6')
  })

  it.each([
    ['只缺開盤', { indexOpen: null }],
    ['只缺收盤', { indexClose: null }],
  ])('一條線缺了任何一個數字就整條不在（%s）', async (_label, missing) => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([{ ...K_CANDLE_CONTRACT_WIRE, ...missing }]))

    const [kCandleContract] = await new KCandleContractProxy(BASE_URL, signedInSessionStorage())
      .findKCandleContractsInRange(QUERY)

    expect(kCandleContract?.indexPriceLine).toBeNull()
    expect(kCandleContract?.premiumIndexLine?.close.toString()).toBe('-0.0005')
  })

  it('取合約的彙總序列時，挑「自動」就不說刻度', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ symbol: 'BTCUSDT', interval: '1h', kCandles: [] })
    vi.stubGlobal('$fetch', fetchMock)

    await new KCandleContractProxy(BASE_URL, signedInSessionStorage())
      .findKCandleContractSeries(loadPlanChoosing())

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/contract-k-candles/series', {
      headers: SIGNED_IN_HEADERS,
      query: {
        symbol: 'BTCUSDT',
        startTime: '2026-09-23T00:00:00.000Z',
        endTime: '2026-09-23T12:00:00.000Z',
      },
    })
  })

  it('挑了一種粗細時把那一種說出去', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ symbol: 'BTCUSDT', interval: '5m', kCandles: [] })
    vi.stubGlobal('$fetch', fetchMock)

    await new KCandleContractProxy(BASE_URL, signedInSessionStorage())
      .findKCandleContractSeries(loadPlanChoosing(aggregationIntervalChoiceOf('5m')))

    expect(fetchMock.mock.calls[0]?.[1].query.interval).toBe('5m')
  })

  it('序列帶回那幾根合約 K 線與系統說它用了哪一種刻度', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      symbol: 'BTCUSDT', interval: '15m',
      kCandles: [K_CANDLE_CONTRACT_WIRE_BEFORE_THE_LATER_LINES, K_CANDLE_CONTRACT_WIRE],
    }))

    const series = await new KCandleContractProxy(BASE_URL, signedInSessionStorage())
      .findKCandleContractSeries(loadPlanChoosing(aggregationIntervalChoiceOf('1m')))

    expect(series.interval.value).toBe('15m')
    expect(series.kCandleContracts).toHaveLength(2)
    expect(series.kCandleContracts[0]?.indexPriceLine).toBeNull()
    expect(series.kCandleContracts[1]?.markPriceLine.close.toString()).toBe('110.6')
  })

  it('被拒絕時把後端說的原因包成可轉達的錯誤', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(createFetchError({
      request: 'http://localhost:8080/contract-k-candles/series',
      options: {},
      response: { status: 400, statusText: 'Bad Request', _data: { message: '時間區間過大，請縮小區間' } },
    } as unknown as FetchContext)))

    const loading = new KCandleContractProxy(BASE_URL, signedInSessionStorage())
      .findKCandleContractSeries(loadPlanChoosing())

    await expect(loading).rejects.toBeInstanceOf(BackendRequestRejectedError)
    await expect(loading).rejects.toThrow('時間區間過大，請縮小區間')
  })
})
