import { afterEach, describe, expect, it, vi } from 'vitest'
import { ContractTradingSymbolProxy } from '~/infrastructure/proxy/contract-trading-symbol-proxy'
import { signedInSessionStorage, SIGNED_IN_HEADERS } from '../../fixtures/session-storage'

const BASE_URL = 'http://localhost:8080'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ContractTradingSymbolProxy', () => {
  it('問的是合約那一邊的標的清單，順序原樣', async () => {
    const fetchMock = vi.fn().mockResolvedValue([
      { symbol: 'BTCUSDT', isWatched: true, tradingSpecification: null },
      { symbol: '1000SHIBUSDT', isWatched: false, tradingSpecification: null },
    ])
    vi.stubGlobal('$fetch', fetchMock)

    const contractTradingSymbols
      = await new ContractTradingSymbolProxy(BASE_URL, signedInSessionStorage())
        .findContractTradingSymbols()

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/contract-trading-symbols', {
      headers: SIGNED_IN_HEADERS,
    })
    expect(contractTradingSymbols.map(contract => [contract.symbol, contract.isWatched]))
      .toEqual([['BTCUSDT', true], ['1000SHIBUSDT', false]])
  })
})
