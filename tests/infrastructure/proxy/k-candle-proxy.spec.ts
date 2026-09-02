import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { KCandleProxy } from '~/infrastructure/proxy/k-candle-proxy'
import { KCandleQueryDomain } from '~/domain/models/domains/k-candle-query-domain'
import { KCandleQueryDto } from '~/domain/models/dto/k-candle-query-dto'
import { KCandleWriteDomain } from '~/domain/models/domains/k-candle-write-domain'
import { KCandleWriteDto } from '~/domain/models/dto/k-candle-write-dto'
import { KCandleIdentityVo } from '~/domain/models/vo/k-candle-identity-vo'
import { KCandleChartLoadPlanVo } from '~/domain/models/vo/k-candle-chart-load-plan-vo'
import { AggregationIntervalVo } from '~/domain/models/vo/aggregation-interval-vo'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'

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

const LOAD_PLAN = new KCandleChartLoadPlanVo(
  true,
  'BTCUSDT',
  new AggregationIntervalVo('1h', '一小時', 60),
  new Date('2026-08-30T03:00:00.000Z'),
  new Date('2026-08-30T09:00:00.000Z'),
  new Date('2026-08-30T00:00:00.000Z'),
  new Date('2026-08-30T12:00:00.000Z'),
)

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

  it('取彙總 K 線時，把要取的那一段與彙總刻度一起問出去', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ symbol: 'BTCUSDT', interval: '1h', kCandles: [] })
    vi.stubGlobal('$fetch', fetchMock)

    await new KCandleProxy(BASE_URL).findKCandleSeries(LOAD_PLAN)

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/k-candles/series', {
      query: {
        symbol: 'BTCUSDT',
        startTime: '2026-08-30T00:00:00.000Z',
        endTime: '2026-08-30T12:00:00.000Z',
        interval: '1h',
      },
    })
  })

  it('把彙總回覆正規化成那幾根 K 線', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      symbol: 'BTCUSDT', interval: '1h', kCandles: [K_CANDLE_WIRE],
    }))

    const kCandles = await new KCandleProxy(BASE_URL).findKCandleSeries(LOAD_PLAN)

    expect(kCandles).toHaveLength(1)
    expect(kCandles[0]?.openTime.toISOString()).toBe('2026-08-30T10:00:00.000Z')
    expect(kCandles[0]?.open.toString()).toBe('100.5')
  })

  it('彙總查詢被拒絕時，一樣把後端說的原因包成可轉達的錯誤', async () => {
    const rejection = buildFetchError({
      status: 400,
      statusText: 'Bad Request',
      message: '時間區間過大，請縮小區間或改用更長的彙總刻度（單次最多 1000 根）',
    })
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection))

    await expect(new KCandleProxy(BASE_URL).findKCandleSeries(LOAD_PLAN))
      .rejects.toBeInstanceOf(BackendRequestRejectedError)
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
    const rejection = buildFetchError({ status: 400, statusText: 'Bad Request' })
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection))

    await expect(new KCandleProxy(BASE_URL).findKCandlesInRange(QUERY))
      .rejects.toThrow('400 Bad Request')
  })

  it('後端自己壞掉時，是「後端出錯」而不是請求被拒絕', async () => {
    const rejection = buildFetchError({ status: 502, statusText: 'Bad Gateway', message: '讀取 K 線失敗' })
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection))

    const findKCandles = new KCandleProxy(BASE_URL).findKCandlesInRange(QUERY)

    await expect(findKCandles).rejects.toBeInstanceOf(BackendServerError)
    await expect(new KCandleProxy(BASE_URL).findKCandlesInRange(QUERY))
      .rejects.not.toBeInstanceOf(BackendRequestRejectedError)
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

  describe('寫入', () => {
    const OPEN_TIME = new Date('2026-08-30T10:00:00.000Z')

    function buildWriteDomain(): KCandleWriteDomain {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-08-30T12:00:00.000Z'))
      const kCandleWriteDomain = new KCandleWriteDomain(new KCandleWriteDto(
        'BTCUSDT', OPEN_TIME, '100.5', '120', '90', '110', '11', '1200.25', '5', '600'))
      vi.useRealTimers()

      return kCandleWriteDomain
    }

    it('新增時把整根 K 線送到 K 線端點', async () => {
      const fetchMock = vi.fn().mockResolvedValue(K_CANDLE_WIRE)
      vi.stubGlobal('$fetch', fetchMock)

      await new KCandleProxy(BASE_URL).saveKCandle(buildWriteDomain())

      expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/k-candles', {
        method: 'POST',
        body: {
          symbol: 'BTCUSDT',
          openTime: '2026-08-30T10:00:00.000Z',
          open: '100.5',
          high: '120',
          low: '90',
          close: '110',
          volume: '11',
          quoteVolume: '1200.25',
          takerBuyBaseVolume: '5',
          takerBuyQuoteVolume: '600',
        },
      })
    })

    it('修改時以交易標的與起始時間指名那一根', async () => {
      const fetchMock = vi.fn().mockResolvedValue(K_CANDLE_WIRE)
      vi.stubGlobal('$fetch', fetchMock)

      await new KCandleProxy(BASE_URL).updateKCandle(buildWriteDomain())

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/k-candles/BTCUSDT/2026-08-30T10%3A00%3A00.000Z',
        expect.objectContaining({ method: 'PUT' }),
      )
    })

    it('刪除時以交易標的與起始時間指名那一根', async () => {
      const fetchMock = vi.fn().mockResolvedValue(null)
      vi.stubGlobal('$fetch', fetchMock)

      await new KCandleProxy(BASE_URL).deleteKCandle(new KCandleIdentityVo('BTCUSDT', OPEN_TIME))

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/k-candles/BTCUSDT/2026-08-30T10%3A00%3A00.000Z',
        { method: 'DELETE' },
      )
    })

    it('寫入回來的資料一樣正規化成 K 線', async () => {
      vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(K_CANDLE_WIRE))

      const savedKCandle = await new KCandleProxy(BASE_URL).saveKCandle(buildWriteDomain())

      expect(savedKCandle.openTime.toISOString()).toBe('2026-08-30T10:00:00.000Z')
      expect(savedKCandle.open.toString()).toBe('100.5')
    })

    it('被後端拒絕時一樣包成可轉達的錯誤', async () => {
      vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
        buildFetchError({ status: 404, statusText: 'Not Found', message: '找不到該根 K 線' }),
      ))

      await expect(new KCandleProxy(BASE_URL).deleteKCandle(new KCandleIdentityVo('BTCUSDT', OPEN_TIME)))
        .rejects.toThrow('找不到該根 K 線')
    })
  })
})
