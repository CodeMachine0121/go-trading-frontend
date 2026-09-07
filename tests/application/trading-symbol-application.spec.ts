import { describe, expect, it, vi } from 'vitest'
import { TradingSymbolApplication } from '~/application/trading-symbol-application'
import { TradingSymbolService } from '~/domain/service/trading-symbol-service'
import type { ITradingSymbolProxy } from '~/domain/interface/i-trading-symbol-proxy'
import { buildTradingSymbol } from '~~/tests/fixtures/trading-symbol-application'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

// 只 mock 最外層的 proxy 介面；application、domain service 與 entity 都是真的。
function buildApplication(tradingSymbolProxy: ITradingSymbolProxy): TradingSymbolApplication {
  return new TradingSymbolApplication(new TradingSymbolService(tradingSymbolProxy))
}

describe('TradingSymbolApplication', () => {
  it('列出後端握有的每一個交易標的，順序原樣沿用後端給的', async () => {
    const tradingSymbolApplication = buildApplication({
      findTradingSymbols: vi.fn().mockResolvedValue([
        buildTradingSymbol('BTCUSDT'), buildTradingSymbol('ETHUSDT'), buildTradingSymbol('SOLUSDT'),
      ]),
    })

    const tradingSymbols = await tradingSymbolApplication.listTradingSymbols()

    expect(tradingSymbols.map(tradingSymbol => tradingSymbol.symbol))
      .toEqual(['BTCUSDT', 'ETHUSDT', 'SOLUSDT'])
  })

  it('後端一檔都沒有時是空的一批，不是錯誤', async () => {
    const tradingSymbolApplication = buildApplication({
      findTradingSymbols: vi.fn().mockResolvedValue([]),
    })

    await expect(tradingSymbolApplication.listTradingSymbols()).resolves.toEqual([])
  })

  it('取不到時如實往上拋，讓畫面說明取不到', async () => {
    const tradingSymbolApplication = buildApplication({
      findTradingSymbols: vi.fn().mockRejectedValue(new BackendUnreachableError('/trading-symbols')),
    })

    await expect(tradingSymbolApplication.listTradingSymbols())
      .rejects.toBeInstanceOf(BackendUnreachableError)
  })
})

describe('TradingSymbolApplication 把四件事一路帶到畫面', () => {
  it('每一檔都帶著市場與後端說的三件事', async () => {
    const tradingSymbolApplication = buildApplication({
      findTradingSymbols: vi.fn().mockResolvedValue([
        buildTradingSymbol('2454', {
          market: 'taiwanStock',
          isWatched: false,
          isWithinTradingSession: false,
          hasLiveUpdates: false,
        }),
      ]),
    })

    const tradingSymbols = await tradingSymbolApplication.listTradingSymbols()

    expect(tradingSymbols[0]!.market.label).toBe('台股')
    expect(tradingSymbols[0]!.isWatched).toBe(false)
    expect(tradingSymbols[0]!.isWithinTradingSession).toBe(false)
    expect(tradingSymbols[0]!.hasLiveUpdates).toBe(false)
  })
})
