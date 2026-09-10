import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TradingSymbolProxy } from '~/infrastructure/proxy/trading-symbol-proxy'
import { signedInSessionStorage, SIGNED_IN_HEADERS } from '../../fixtures/session-storage'
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

    await new TradingSymbolProxy(BASE_URL, signedInSessionStorage()).findTradingSymbols()

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/trading-symbols', { headers: SIGNED_IN_HEADERS })
  })

  it('把回來的原始資料正規化成交易標的，順序原樣保留', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([
      { symbol: 'BTCUSDT' }, { symbol: 'ETHUSDT' }, { symbol: 'SOLUSDT' },
    ]))

    const tradingSymbols = await new TradingSymbolProxy(BASE_URL, signedInSessionStorage()).findTradingSymbols()

    expect(tradingSymbols.map(tradingSymbol => tradingSymbol.symbol))
      .toEqual(['BTCUSDT', 'ETHUSDT', 'SOLUSDT'])
  })

  it('後端一檔都沒有時是空的一批，不是錯誤', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([]))

    await expect(new TradingSymbolProxy(BASE_URL, signedInSessionStorage()).findTradingSymbols()).resolves.toEqual([])
  })

  it('連不上後端時，是「連不上」而不是被拒絕', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError()))

    await expect(new TradingSymbolProxy(BASE_URL, signedInSessionStorage()).findTradingSymbols())
      .rejects.toBeInstanceOf(BackendUnreachableError)
  })

  it('後端有回應但出錯時，把原因包成可轉達的錯誤', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError(400)))

    await expect(new TradingSymbolProxy(BASE_URL, signedInSessionStorage()).findTradingSymbols())
      .rejects.toBeInstanceOf(BackendRequestRejectedError)
  })
})

describe('TradingSymbolProxy 讀後端隨標的送來的四件事', () => {
  it('把市場正規化成一個帶標籤的值', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([
      {
        symbol: '2330',
        market: 'taiwanStock',
        isWatched: true,
        isWithinTradingSession: true,
        hasLiveUpdates: true,
      },
    ]))

    const tradingSymbols = await new TradingSymbolProxy(BASE_URL, signedInSessionStorage()).findTradingSymbols()

    expect(tradingSymbols[0]!.market.value).toBe('taiwanStock')
    expect(tradingSymbols[0]!.market.label).toBe('台股')
  })

  it('把後端說的三件事原樣帶進來，不自己推算', async () => {
    // 畫面不知道哪幾天休市，也不知道後端把即時名額給了誰。自己算的結果會把
    // 國定假日說成故障，或替一張永遠不動的圖保證即時更新。
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([
      {
        symbol: '2454',
        market: 'taiwanStock',
        isWatched: false,
        isWithinTradingSession: false,
        hasLiveUpdates: false,
      },
    ]))

    const tradingSymbols = await new TradingSymbolProxy(BASE_URL, signedInSessionStorage()).findTradingSymbols()

    expect(tradingSymbols[0]!.isWatched).toBe(false)
    expect(tradingSymbols[0]!.isWithinTradingSession).toBe(false)
    expect(tradingSymbols[0]!.hasLiveUpdates).toBe(false)
  })

  it('認不得的市場名稱不讓那一檔消失', async () => {
    // 它仍然挑得到，只是暫時歸在預設的那個市場。
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([
      {
        symbol: 'AAPL',
        market: 'nasdaq',
        isWatched: true,
        isWithinTradingSession: true,
        hasLiveUpdates: true,
      },
    ]))

    const tradingSymbols = await new TradingSymbolProxy(BASE_URL, signedInSessionStorage()).findTradingSymbols()

    expect(tradingSymbols.map(tradingSymbol => tradingSymbol.symbol)).toEqual(['AAPL'])
    expect(tradingSymbols[0]!.market.value).toBe('crypto')
  })
})
