import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { KCandleProxy } from '~/infrastructure/proxy/k-candle-proxy'
import { KCandleQueryDomain } from '~/domain/models/domains/k-candle-query-domain'
import { KCandleQueryDto } from '~/domain/models/dto/k-candle-query-dto'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

const BASE_URL = 'http://localhost:8080'
const QUERY = new KCandleQueryDomain(new KCandleQueryDto(
  'BTCUSDT',
  new Date('2026-08-30T00:00:00.000Z'),
  new Date('2026-08-30T12:00:00.000Z'),
))

const K_CANDLE_WIRE = {
  symbol: 'BTCUSDT',
  openTime: '2026-08-30T10:00:00Z',
  open: '100.5',
  high: '120',
  low: '90',
  close: '110',
  volume: '11',
  quoteVolume: '1200.25',
  takerBuyBaseVolume: '5',
  takerBuyQuoteVolume: '600',
}

/**
 * 用真正的 FetchError 當替身：它與自己 new 出來的 Error 形狀不同——
 * **連不上時它照樣有 response 這個屬性，只是值為 undefined**，
 * 這正是錯誤翻譯必須分辨的差別。
 * createFetchError 要的是一份完整的請求脈絡，測試只需要其中會影響行為的欄位，
 * 因此在這裡（也只有這裡）收斂成一次轉型。
 */
function buildFetchError(failure: {
  status?: number
  statusText?: string
  message?: string
}) {
  const context = failure.status === undefined
    ? { request: 'http://localhost:8080/k-candles', options: {}, error: new Error('fetch failed') }
    : {
        request: 'http://localhost:8080/k-candles',
        options: {},
        response: {
          status: failure.status,
          statusText: failure.statusText,
          _data: failure.message === undefined ? undefined : { message: failure.message },
        },
      }

  return createFetchError(context as unknown as FetchContext)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('KCandleProxy', () => {
  it('以交易標的與世界標準時間的起訖去問後端', async () => {
    const fetchMock = vi.fn().mockResolvedValue([])
    vi.stubGlobal('$fetch', fetchMock)

    await new KCandleProxy(BASE_URL).findKCandlesInRange(QUERY)

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/k-candles', {
      query: {
        symbol: 'BTCUSDT',
        startTime: '2026-08-30T00:00:00.000Z',
        endTime: '2026-08-30T12:00:00.000Z',
      },
    })
  })

  it('把回來的原始資料正規化成 K 線：時間成為時間值、數字成為精確小數', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([K_CANDLE_WIRE]))

    const kCandles = await new KCandleProxy(BASE_URL).findKCandlesInRange(QUERY)

    expect(kCandles).toHaveLength(1)
    expect(kCandles[0]?.symbol).toBe('BTCUSDT')
    expect(kCandles[0]?.openTime.toISOString()).toBe('2026-08-30T10:00:00.000Z')
    expect(kCandles[0]?.open.toString()).toBe('100.5')
    expect(kCandles[0]?.quoteVolume.toString()).toBe('1200.25')
    expect(kCandles[0]?.takerBuyQuoteVolume.toString()).toBe('600')
  })

  it('後端有回應但拒絕時，把後端說的原因包成可轉達的錯誤', async () => {
    const rejection = buildFetchError({
      status: 400,
      statusText: 'Bad Request',
      message: '時間區間過大，請縮小區間（單次最多 1000 根）',
    })
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection))

    await expect(new KCandleProxy(BASE_URL).findKCandlesInRange(QUERY))
      .rejects.toThrow('時間區間過大，請縮小區間（單次最多 1000 根）')
    await expect(new KCandleProxy(BASE_URL).findKCandlesInRange(QUERY))
      .rejects.toBeInstanceOf(BackendRequestRejectedError)
  })

  it('後端有回應但沒有說明原因時，退而使用原始錯誤訊息', async () => {
    const rejection = buildFetchError({ status: 500, statusText: 'Internal Server Error' })
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection))

    await expect(new KCandleProxy(BASE_URL).findKCandlesInRange(QUERY))
      .rejects.toThrow('500 Internal Server Error')
  })

  it('後端連回應都沒有時，視為連不上', async () => {
    // 這正是後端沒啟動時實際會拿到的錯誤：它帶著 response 屬性，但值是 undefined。
    const noResponse = buildFetchError({})
    expect('response' in noResponse).toBe(true)
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(noResponse))

    await expect(new KCandleProxy(BASE_URL).findKCandlesInRange(QUERY))
      .rejects.toBeInstanceOf(BackendUnreachableError)
  })

  it.each([
    { description: '一般的錯誤物件', rejection: new Error('fetch failed') },
    { description: '根本不是錯誤物件的東西', rejection: 'fetch failed' },
  ])('$description 也一樣視為連不上', async ({ rejection }) => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection))

    await expect(new KCandleProxy(BASE_URL).findKCandlesInRange(QUERY))
      .rejects.toBeInstanceOf(BackendUnreachableError)
  })
})
