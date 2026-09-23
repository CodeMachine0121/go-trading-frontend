import { vi } from 'vitest'
import type { IKCandleContractProxy } from '~/domain/interface/i-k-candle-contract-proxy'
import type { IContractTradingSymbolProxy } from '~/domain/interface/i-contract-trading-symbol-proxy'
import { ContractTradingSymbol } from '~/domain/models/entities/contract-trading-symbol'

/**
 * 合約那一條線的兩個外部資源，只 mock 它們的介面。
 *
 * 現貨的 K 線、圖表與標的清單 service 也管合約那一條，所以每個組出這三個 service 的
 * 測試都要給它們一個合約 proxy——只測現貨的那些用不到它，給一個什麼都沒有的就好。
 */
export function buildKCandleContractProxy(
  overrides: Partial<IKCandleContractProxy> = {},
): IKCandleContractProxy {
  return {
    findKCandleContractsInRange: vi.fn().mockResolvedValue([]),
    findKCandleContractSeries: vi.fn(),
    ...overrides,
  }
}

/** 合約標的清單：預設一個都沒有，要的案例自己說出有哪幾個。 */
export function buildContractTradingSymbolProxy(
  contractTradingSymbols: ContractTradingSymbol[] = [],
): IContractTradingSymbolProxy {
  return {
    findContractTradingSymbols: vi.fn().mockResolvedValue(contractTradingSymbols),
  }
}

/** 一個合約標的；預設在合約追蹤名單上。 */
export function buildContractTradingSymbol(symbol: string, isWatched = true): ContractTradingSymbol {
  return new ContractTradingSymbol(symbol, isWatched)
}
