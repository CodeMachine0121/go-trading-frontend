import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { KCandleProxy } from '~/infrastructure/proxy/k-candle-proxy'
import { signedInSessionStorage, SIGNED_IN_HEADERS } from '../../fixtures/session-storage'
import { KCandleQueryDomain } from '~/domain/models/domains/k-candle-query-domain'
import { KCandleQueryDto } from '~/domain/models/dto/k-candle-query-dto'
import { KCandleWriteDomain } from '~/domain/models/domains/k-candle-write-domain'
import { KCandleWriteDto } from '~/domain/models/dto/k-candle-write-dto'
import { KCandleIdentityVo } from '~/domain/models/vo/k-candle-identity-vo'
import { KCandleChartLoadPlanVo } from '~/domain/models/vo/k-candle-chart-load-plan-vo'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import type { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'
import {
  AUTOMATIC_AGGREGATION_INTERVAL_CHOICE, aggregationIntervalChoiceOf,
} from '../../fixtures/aggregation-interval-choice'

const BASE_URL = 'http://localhost:8080'
// 查詢條件的結束時間取自建構當下，因此把目前時間釘住再建，送出去的那一段才說得準。
const QUERY = buildQueryAt(new Date('2026-08-30T12:00:00.000Z'))

function buildQueryAt(currentTime: Date): KCandleQueryDomain {
  vi.useFakeTimers()
  vi.setSystemTime(currentTime)
  const kCandleQueryDomain = new KCandleQueryDomain(
    new KCandleQueryDto('BTCUSDT', new Date('2026-08-30T00:00:00.000Z')),
  )
  vi.useRealTimers()

  return kCandleQueryDomain
}

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

function loadPlanChoosing(
  choice: AggregationIntervalChoiceDto = AUTOMATIC_AGGREGATION_INTERVAL_CHOICE,
): KCandleChartLoadPlanVo {
  return new KCandleChartLoadPlanVo(
    true,
    'BTCUSDT',
    new Date('2026-08-30T03:00:00.000Z'),
    new Date('2026-08-30T09:00:00.000Z'),
    new Date('2026-08-30T00:00:00.000Z'),
    new Date('2026-08-30T12:00:00.000Z'),
    choice,
  )
}

const LOAD_PLAN = loadPlanChoosing()

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

    await new KCandleProxy(BASE_URL, signedInSessionStorage()).findKCandlesInRange(QUERY)

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/k-candles', {
      headers: SIGNED_IN_HEADERS,
      query: {
        symbol: 'BTCUSDT',
        startTime: '2026-08-30T00:00:00.000Z',
        endTime: '2026-08-30T12:00:00.000Z',
      },
    })
  })

  it('把回來的原始資料正規化成 K 線：時間成為時間值、數字成為精確小數', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([K_CANDLE_WIRE]))

    const kCandles = await new KCandleProxy(BASE_URL, signedInSessionStorage()).findKCandlesInRange(QUERY)

    expect(kCandles).toHaveLength(1)
    expect(kCandles[0]?.symbol).toBe('BTCUSDT')
    expect(kCandles[0]?.openTime.toISOString()).toBe('2026-08-30T10:00:00.000Z')
    expect(kCandles[0]?.open.toString()).toBe('100.5')
    expect(kCandles[0]?.quoteVolume?.toString()).toBe('1200.25')
    expect(kCandles[0]?.takerBuyQuoteVolume?.toString()).toBe('600')
  })

  it('取彙總 K 線時，只把要取的那一段問出去——彙總刻度不由這裡決定', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ symbol: 'BTCUSDT', interval: '1h', kCandles: [] })
    vi.stubGlobal('$fetch', fetchMock)

    await new KCandleProxy(BASE_URL, signedInSessionStorage()).findKCandleSeries(LOAD_PLAN)

    // 沒挑時條件裡**沒有** interval：一根該多粗需要交易時段與休市日才算得對，
    // 我們自己算一種就等於在畫面這一側長出第二份市場作息。
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/k-candles/series', {
      headers: SIGNED_IN_HEADERS,
      query: {
        symbol: 'BTCUSDT',
        startTime: '2026-08-30T00:00:00.000Z',
        endTime: '2026-08-30T12:00:00.000Z',
      },
    })
  })

  it('使用者挑了一種粗細時，把那一種說出去', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ symbol: 'BTCUSDT', interval: '5m', kCandles: [] })
    vi.stubGlobal('$fetch', fetchMock)

    await new KCandleProxy(BASE_URL, signedInSessionStorage())
      .findKCandleSeries(loadPlanChoosing(aggregationIntervalChoiceOf('5m')))

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/k-candles/series', {
      headers: SIGNED_IN_HEADERS,
      query: {
        symbol: 'BTCUSDT',
        startTime: '2026-08-30T00:00:00.000Z',
        endTime: '2026-08-30T12:00:00.000Z',
        interval: '5m',
      },
    })
  })

  it('挑了一種粗細時，畫面標的仍然是系統回報的那一個，不是我們要求的那一個', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      symbol: 'BTCUSDT', interval: '15m', kCandles: [K_CANDLE_WIRE],
    }))

    const kCandleSeries = await new KCandleProxy(BASE_URL, signedInSessionStorage())
      .findKCandleSeries(loadPlanChoosing(aggregationIntervalChoiceOf('1m')))

    // 看得出來比信任可靠：要了一分鐘、系統給十五分鐘，畫面要說十五分鐘。
    expect(kCandleSeries.interval.value).toBe('15m')
  })

  it('把彙總回覆正規化成那幾根 K 線，以及系統說它用了哪一種刻度', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      symbol: 'BTCUSDT', interval: '1h', kCandles: [K_CANDLE_WIRE],
    }))

    const kCandleSeries = await new KCandleProxy(BASE_URL, signedInSessionStorage()).findKCandleSeries(LOAD_PLAN)

    expect(kCandleSeries.kCandles).toHaveLength(1)
    expect(kCandleSeries.kCandles[0]?.openTime.toISOString()).toBe('2026-08-30T10:00:00.000Z')
    expect(kCandleSeries.kCandles[0]?.open.toString()).toBe('100.5')
    expect(kCandleSeries.interval.value).toBe('1h')
    expect(kCandleSeries.interval.label).toBe('一小時')
  })

  it('系統回報一個認不得的刻度時退回最細的那一種，不讓畫面壞掉', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      symbol: 'BTCUSDT', interval: '7m', kCandles: [K_CANDLE_WIRE],
    }))

    const kCandleSeries = await new KCandleProxy(BASE_URL, signedInSessionStorage()).findKCandleSeries(LOAD_PLAN)

    // 後端多支援一種刻度而畫面還沒跟上時，使用者看到的要是圖，不是錯誤。
    expect(kCandleSeries.interval.value).toBe('1m')
    expect(kCandleSeries.kCandles).toHaveLength(1)
  })

  it('彙總查詢被拒絕時，一樣把後端說的原因包成可轉達的錯誤', async () => {
    const rejection = buildFetchError({
      status: 400,
      statusText: 'Bad Request',
      message: '時間區間過大，請縮小區間或改用更長的彙總刻度（單次最多 1000 根）',
    })
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection))

    await expect(new KCandleProxy(BASE_URL, signedInSessionStorage()).findKCandleSeries(LOAD_PLAN))
      .rejects.toBeInstanceOf(BackendRequestRejectedError)
  })

  it('後端有回應但拒絕時，把後端說的原因包成可轉達的錯誤', async () => {
    const rejection = buildFetchError({
      status: 400,
      statusText: 'Bad Request',
      message: '時間區間過大，請縮小區間（單次最多 1000 根）',
    })
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection))

    await expect(new KCandleProxy(BASE_URL, signedInSessionStorage()).findKCandlesInRange(QUERY))
      .rejects.toThrow('時間區間過大，請縮小區間（單次最多 1000 根）')
    await expect(new KCandleProxy(BASE_URL, signedInSessionStorage()).findKCandlesInRange(QUERY))
      .rejects.toBeInstanceOf(BackendRequestRejectedError)
  })

  it('後端有回應但沒有說明原因時，退而使用原始錯誤訊息', async () => {
    const rejection = buildFetchError({ status: 400, statusText: 'Bad Request' })
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection))

    await expect(new KCandleProxy(BASE_URL, signedInSessionStorage()).findKCandlesInRange(QUERY))
      .rejects.toThrow('400 Bad Request')
  })

  it('後端自己壞掉時，是「後端出錯」而不是請求被拒絕', async () => {
    const rejection = buildFetchError({ status: 502, statusText: 'Bad Gateway', message: '讀取 K 線失敗' })
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection))

    const findKCandles = new KCandleProxy(BASE_URL, signedInSessionStorage()).findKCandlesInRange(QUERY)

    await expect(findKCandles).rejects.toBeInstanceOf(BackendServerError)
    await expect(new KCandleProxy(BASE_URL, signedInSessionStorage()).findKCandlesInRange(QUERY))
      .rejects.not.toBeInstanceOf(BackendRequestRejectedError)
  })

  it('後端連回應都沒有時，視為連不上', async () => {
    // 這正是後端沒啟動時實際會拿到的錯誤：它帶著 response 屬性，但值是 undefined。
    const noResponse = buildFetchError({})
    expect('response' in noResponse).toBe(true)
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(noResponse))

    await expect(new KCandleProxy(BASE_URL, signedInSessionStorage()).findKCandlesInRange(QUERY))
      .rejects.toBeInstanceOf(BackendUnreachableError)
  })

  it.each([
    { description: '一般的錯誤物件', rejection: new Error('fetch failed') },
    { description: '根本不是錯誤物件的東西', rejection: 'fetch failed' },
  ])('$description 也一樣視為連不上', async ({ rejection }) => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection))

    await expect(new KCandleProxy(BASE_URL, signedInSessionStorage()).findKCandlesInRange(QUERY))
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

      await new KCandleProxy(BASE_URL, signedInSessionStorage()).saveKCandle(buildWriteDomain())

      expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/k-candles', {
        headers: SIGNED_IN_HEADERS,
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

    it('這個市場不報的那幾項送出去是沒有，不是零', async () => {
      const fetchMock = vi.fn().mockResolvedValue(K_CANDLE_WIRE)
      vi.stubGlobal('$fetch', fetchMock)

      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-08-30T12:00:00.000Z'))
      const kCandleWriteDomain = new KCandleWriteDomain(new KCandleWriteDto(
        '2330', OPEN_TIME, '100.5', '120', '90', '110', '11', '', '', ''))
      vi.useRealTimers()

      await new KCandleProxy(BASE_URL, signedInSessionStorage()).saveKCandle(kCandleWriteDomain)

      expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/k-candles', {
        headers: SIGNED_IN_HEADERS,
        method: 'POST',
        body: expect.objectContaining({
          volume: '11',
          quoteVolume: null,
          takerBuyBaseVolume: null,
          takerBuyQuoteVolume: null,
        }),
      })
    })

    it('要後端補齊一檔，並把這一輪補到的根數算出來', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        symbolReports: [{ storedCount: 3 }],
      })
      vi.stubGlobal('$fetch', fetchMock)

      const collected = await new KCandleProxy(BASE_URL, signedInSessionStorage()).catchUpSymbol('2330')

      expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/k-candles/backfill', {
        headers: SIGNED_IN_HEADERS,
        method: 'POST',
        body: { symbol: '2330' },
      })
      expect(collected).toBe(3)
    })

    it('這一輪一根都沒補到就是零，不是「沒有答案」', async () => {
      // 零是常見的答案（手上已經是最新的），它與「問不到」完全不同。
      vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
        symbolReports: [{ storedCount: 0 }],
      }))

      expect(await new KCandleProxy(BASE_URL, signedInSessionStorage()).catchUpSymbol('2330')).toBe(0)
    })

    it('修改時以交易標的與起始時間指名那一根', async () => {
      const fetchMock = vi.fn().mockResolvedValue(K_CANDLE_WIRE)
      vi.stubGlobal('$fetch', fetchMock)

      await new KCandleProxy(BASE_URL, signedInSessionStorage()).updateKCandle(buildWriteDomain())

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/k-candles/BTCUSDT/2026-08-30T10%3A00%3A00.000Z',
        expect.objectContaining({ method: 'PUT' }),
      )
    })

    it('刪除時以交易標的與起始時間指名那一根', async () => {
      const fetchMock = vi.fn().mockResolvedValue(null)
      vi.stubGlobal('$fetch', fetchMock)

      await new KCandleProxy(BASE_URL, signedInSessionStorage()).deleteKCandle(new KCandleIdentityVo('BTCUSDT', OPEN_TIME))

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/k-candles/BTCUSDT/2026-08-30T10%3A00%3A00.000Z',
        { headers: SIGNED_IN_HEADERS, method: 'DELETE' },
      )
    })

    it('寫入回來的資料一樣正規化成 K 線', async () => {
      vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(K_CANDLE_WIRE))

      const savedKCandle = await new KCandleProxy(BASE_URL, signedInSessionStorage()).saveKCandle(buildWriteDomain())

      expect(savedKCandle.openTime.toISOString()).toBe('2026-08-30T10:00:00.000Z')
      expect(savedKCandle.open.toString()).toBe('100.5')
    })

    it('被後端拒絕時一樣包成可轉達的錯誤', async () => {
      vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
        buildFetchError({ status: 404, statusText: 'Not Found', message: '找不到該根 K 線' }),
      ))

      await expect(new KCandleProxy(BASE_URL, signedInSessionStorage()).deleteKCandle(new KCandleIdentityVo('BTCUSDT', OPEN_TIME)))
        .rejects.toThrow('找不到該根 K 線')
    })
  })
})

describe('KCandleProxy 對這個市場不報的數字', () => {
  it('後端不帶那一項時原樣傳成沒有值，不換成零', () => {
    // 換成 0 的話，「這個市場不報它」與「這五分鐘沒有成交」就再也分不開了。
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([{
      symbol: '2330',
      openTime: '2026-09-08T02:00:00.000Z',
      open: '574',
      high: '576',
      low: '572',
      close: '575',
      volume: '0',
      quoteVolume: null,
      takerBuyBaseVolume: null,
      takerBuyQuoteVolume: null,
    }]))

    return new KCandleProxy(BASE_URL, signedInSessionStorage()).findKCandlesInRange(QUERY).then((kCandles) => {
      expect(kCandles[0]?.quoteVolume).toBeNull()
      expect(kCandles[0]?.takerBuyBaseVolume).toBeNull()
      expect(kCandles[0]?.takerBuyQuoteVolume).toBeNull()
      // 成交量真的是零：它有值，只是那個值是零。
      expect(kCandles[0]?.volume.toString()).toBe('0')
    })
  })
})
