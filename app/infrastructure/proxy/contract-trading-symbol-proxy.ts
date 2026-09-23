import type { IContractTradingSymbolProxy } from '~/domain/interface/i-contract-trading-symbol-proxy'
import { ContractTradingSymbol } from '~/domain/models/entities/contract-trading-symbol'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'

const CONTRACT_TRADING_SYMBOLS_ENDPOINT = '/contract-trading-symbols'

/**
 * 後端回傳的原始 wire 形狀，只存在於本檔內，不外流進 domain。
 * 交易規格也在回覆裡，但這兩個畫面用不到它，所以不讀。
 */
type ContractTradingSymbolWire = {
  symbol: string
  isWatched: boolean
}

/** Proxy：唯一允許出現 $fetch 的地方，負責把 wire 形狀收乾淨再往 domain 送。 */
export class ContractTradingSymbolProxy extends BackendApiProxy
  implements IContractTradingSymbolProxy {
  async findContractTradingSymbols(): Promise<ContractTradingSymbol[]> {
    const contractTradingSymbolWires = await this.requestBackend<ContractTradingSymbolWire[]>(
      CONTRACT_TRADING_SYMBOLS_ENDPOINT)

    return contractTradingSymbolWires.map(contractTradingSymbolWire => new ContractTradingSymbol(
      contractTradingSymbolWire.symbol,
      contractTradingSymbolWire.isWatched,
    ))
  }
}
