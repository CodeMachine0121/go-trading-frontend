import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TradingSymbolProxy } from '~/infrastructure/proxy/trading-symbol-proxy'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

const BASE_URL = 'http://localhost:8080'

/** 連不上與被拒絕的差別在於 response 這個屬性在不在，因此用真正的 FetchError 當替身。 */
function buildFetchError(status?: number) {
  const context = status === undefined
    ? { request: `${BASE_URL}/trading-symbols`, options: {}, error: new Error('fetch failed') }
    : {
        request: `${BASE_URL}/trading-symbols`,
        options: {},
        response: { status, statusText: 'Bad Gateway', _data: { message: '讀取失敗' } },
      }

  return createFetchError(context as unknown as FetchContext)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TradingSymbolProxy', () => {
  it('向後端要目前握有哪幾檔', async () => {
    const fetchMock = vi.fn().mockResolvedValue([])
    vi.stubGlobal('$fetch', fetchMock)

    await new TradingSymbolProxy(BASE_URL).findTradingSymbols()

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/trading-symbols', {})
  })

  it('把回來的原始資料正規化成交易標的，順序原樣保留', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([
      { symbol: 'BTCUSDT' }, { symbol: 'ETHUSDT' }, { symbol: 'SOLUSDT' },
    ]))

    const tradingSymbols = await new TradingSymbolProxy(BASE_URL).findTradingSymbols()

    expect(tradingSymbols.map(tradingSymbol => tradingSymbol.symbol))
      .toEqual(['BTCUSDT', 'ETHUSDT', 'SOLUSDT'])
  })

  it('後端一檔都沒有時是空的一批，不是錯誤', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([]))

    await expect(new TradingSymbolProxy(BASE_URL).findTradingSymbols()).resolves.toEqual([])
  })

  it('連不上後端時，是「連不上」而不是被拒絕', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError()))

    await expect(new TradingSymbolProxy(BASE_URL).findTradingSymbols())
      .rejects.toBeInstanceOf(BackendUnreachableError)
  })

  it('後端有回應但出錯時，把原因包成可轉達的錯誤', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError(400)))

    await expect(new TradingSymbolProxy(BASE_URL).findTradingSymbols())
      .rejects.toBeInstanceOf(BackendRequestRejectedError)
  })
})
