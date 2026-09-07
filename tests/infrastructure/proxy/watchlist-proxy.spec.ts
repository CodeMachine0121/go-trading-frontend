import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WatchlistProxy } from '~/infrastructure/proxy/watchlist-proxy'
import { WatchlistEntryDto } from '~/domain/models/dto/watchlist-entry-dto'
import { TradingSymbolNotInMarketError } from '~/domain/errors/trading-symbol-not-in-market-error'
import { MarketDataSourceUnavailableError } from '~/domain/errors/market-data-source-unavailable-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

const BASE_URL = 'http://localhost:8080'

function buildFetchError(status?: number, message = '拒絕了') {
  const context = status === undefined
    ? { request: `${BASE_URL}/watchlist`, options: {}, error: new Error('fetch failed') }
    : {
        request: `${BASE_URL}/watchlist`,
        options: {},
        response: { status, statusText: '', _data: { message } },
      }

  return createFetchError(context as unknown as FetchContext)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

const ENTRY = new WatchlistEntryDto('2330', 'taiwanStock')

describe('WatchlistProxy 加一檔進來', () => {
  it('把市場與代號一起送出', async () => {
    const fetchMock = vi.fn().mockResolvedValue(null)
    vi.stubGlobal('$fetch', fetchMock)

    await new WatchlistProxy(BASE_URL).addToWatchlist(ENTRY)

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/watchlist', {
      method: 'POST',
      body: { symbol: '2330', market: 'taiwanStock' },
    })
  })

  it('後端讀懂了請求卻拒絕，代表這個代號在那個市場找不到', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError(400, '找不到這個代號')))

    await expect(new WatchlistProxy(BASE_URL).addToWatchlist(ENTRY))
      .rejects.toBeInstanceOf(TradingSymbolNotInMarketError)
  })

  it('後端說它問不到那個市場，是另一種失敗', async () => {
    // 使用者的下一步完全相反：一個改輸入，一個等一下再試。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError(502, '問不到台股')))

    await expect(new WatchlistProxy(BASE_URL).addToWatchlist(ENTRY))
      .rejects.toBeInstanceOf(MarketDataSourceUnavailableError)
  })

  it('後端自己壞掉不說成行情來源不在', async () => {
    // 說錯的話，會把使用者的注意力引到錯的地方。
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError(500, '壞了')))

    await expect(new WatchlistProxy(BASE_URL).addToWatchlist(ENTRY))
      .rejects.toBeInstanceOf(BackendServerError)
  })

  it('連不上後端仍然是連不上', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError()))

    await expect(new WatchlistProxy(BASE_URL).addToWatchlist(ENTRY))
      .rejects.toBeInstanceOf(BackendUnreachableError)
  })
})

describe('WatchlistProxy 把一檔拿掉', () => {
  it('以代號指名那一檔', async () => {
    const fetchMock = vi.fn().mockResolvedValue(null)
    vi.stubGlobal('$fetch', fetchMock)

    await new WatchlistProxy(BASE_URL).removeFromWatchlist('2330')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/watchlist/2330', { method: 'DELETE' })
  })
})
