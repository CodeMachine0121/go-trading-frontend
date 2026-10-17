import { afterEach, describe, expect, it, vi } from 'vitest'
import { KCandleProxy } from '~/infrastructure/proxy/k-candle-proxy'
import { KCandleContractProxy } from '~/infrastructure/proxy/k-candle-contract-proxy'
import { KCandleChartLoadPlanVo } from '~/domain/models/vo/k-candle-chart-load-plan-vo'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { signedInSessionStorage } from '../../fixtures/session-storage'
import { aggregationIntervalChoiceOf } from '../../fixtures/aggregation-interval-choice'

const BASE_URL = 'http://localhost:8080'
const SERIES_WIRE = { symbol: 'BTCUSDT', interval: '1d', kCandles: [] }

function earlierStretchOf(interval: string): KCandleChartLoadPlanVo {
  return new KCandleChartLoadPlanVo(
    'extendEarlier',
    'BTCUSDT',
    new Date('2026-10-05T00:00:00.000Z'),
    new Date('2026-10-12T00:00:00.000Z'),
    new Date('2024-04-25T16:17:48.450Z'),
    new Date('2026-10-12T16:17:48.450Z'),
    aggregationIntervalChoiceOf(interval),
  )
}

/** 一個由測試決定何時回來的回覆，讓「還在路上」成為一個看得見的狀態。 */
function pendingReply() {
  const reply = { settle: (_value: unknown) => {}, fail: (_reason: unknown) => {} }
  const promise = new Promise((resolve, reject) => {
    reply.settle = resolve
    reply.fail = reject
  })

  return { promise, ...reply }
}

describe('同一段還在路上就不再要一次', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('拖了一下還是要同一段，只要一次，兩處拿到同一份', async () => {
    const reply = pendingReply()
    const fetchMock = vi.fn().mockReturnValue(reply.promise)
    vi.stubGlobal('$fetch', fetchMock)
    const proxy = new KCandleContractProxy(BASE_URL, signedInSessionStorage())

    const first = proxy.findKCandleContractSeries(earlierStretchOf('1d'))
    const second = proxy.findKCandleContractSeries(earlierStretchOf('1d'))
    reply.settle(SERIES_WIRE)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(await second).toBe(await first)
  })

  it('連拖五下仍只要一次', async () => {
    const reply = pendingReply()
    const fetchMock = vi.fn().mockReturnValue(reply.promise)
    vi.stubGlobal('$fetch', fetchMock)
    const proxy = new KCandleProxy(BASE_URL, signedInSessionStorage())

    const loads = Array.from({ length: 5 }, () => proxy.findKCandleSeries(earlierStretchOf('1d')))
    reply.settle(SERIES_WIRE)
    await Promise.all(loads)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('換了粗細就照常去要', async () => {
    const reply = pendingReply()
    const fetchMock = vi.fn().mockReturnValue(reply.promise)
    vi.stubGlobal('$fetch', fetchMock)
    const proxy = new KCandleContractProxy(BASE_URL, signedInSessionStorage())

    const daily = proxy.findKCandleContractSeries(earlierStretchOf('1d'))
    const fourHourly = proxy.findKCandleContractSeries(earlierStretchOf('4h'))
    reply.settle(SERIES_WIRE)
    await Promise.all([daily, fourHourly])

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('兩張圖互不影響：行情圖表與合約圖表各自去要自己的那一段', async () => {
    const reply = pendingReply()
    const fetchMock = vi.fn().mockReturnValue(reply.promise)
    vi.stubGlobal('$fetch', fetchMock)

    const spot = new KCandleProxy(BASE_URL, signedInSessionStorage())
      .findKCandleSeries(earlierStretchOf('1d'))
    const contract = new KCandleContractProxy(BASE_URL, signedInSessionStorage())
      .findKCandleContractSeries(earlierStretchOf('1d'))
    reply.settle(SERIES_WIRE)
    await Promise.all([spot, contract])

    expect(fetchMock.mock.calls.map(([endpoint]) => endpoint)).toEqual([
      'http://localhost:8080/k-candles/series',
      'http://localhost:8080/contract-k-candles/series',
    ])
  })

  it('回來之後再要同一段照常去要', async () => {
    const fetchMock = vi.fn().mockResolvedValue(SERIES_WIRE)
    vi.stubGlobal('$fetch', fetchMock)
    const proxy = new KCandleContractProxy(BASE_URL, signedInSessionStorage())

    await proxy.findKCandleContractSeries(earlierStretchOf('1d'))
    await proxy.findKCandleContractSeries(earlierStretchOf('1d'))

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('等著的那一處照常說明連不上系統', async () => {
    const reply = pendingReply()
    vi.stubGlobal('$fetch', vi.fn().mockReturnValue(reply.promise))
    const proxy = new KCandleContractProxy(BASE_URL, signedInSessionStorage())

    const first = proxy.findKCandleContractSeries(earlierStretchOf('1d'))
    const waiting = proxy.findKCandleContractSeries(earlierStretchOf('1d'))
    reply.fail(new Error('fetch failed'))

    await expect(first).rejects.toBeInstanceOf(BackendUnreachableError)
    await expect(waiting).rejects.toBeInstanceOf(BackendUnreachableError)
  })

  it('失敗之後再要同一段照常再去要一次', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce(SERIES_WIRE)
    vi.stubGlobal('$fetch', fetchMock)
    const proxy = new KCandleProxy(BASE_URL, signedInSessionStorage())

    await expect(proxy.findKCandleSeries(earlierStretchOf('1d'))).rejects.toBeInstanceOf(BackendUnreachableError)
    await proxy.findKCandleSeries(earlierStretchOf('1d'))

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
