import { describe, expect, it, vi } from 'vitest'
import { TradingSymbolApplication } from '~/application/trading-symbol-application'
import { TradingSymbolService } from '~/domain/service/trading-symbol-service'
import type { ITradingSymbolProxy } from '~/domain/interface/i-trading-symbol-proxy'
import { TradingSymbol } from '~/domain/models/entities/trading-symbol'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

// 只 mock 最外層的 proxy 介面；application、domain service 與 entity 都是真的。
function buildApplication(tradingSymbolProxy: ITradingSymbolProxy): TradingSymbolApplication {
  return new TradingSymbolApplication(new TradingSymbolService(tradingSymbolProxy))
}

describe('TradingSymbolApplication', () => {
  it('列出後端握有的每一個交易標的，順序原樣沿用後端給的', async () => {
    const tradingSymbolApplication = buildApplication({
      findTradingSymbols: vi.fn().mockResolvedValue([
        new TradingSymbol('BTCUSDT'), new TradingSymbol('ETHUSDT'), new TradingSymbol('SOLUSDT'),
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
