import type { ITradingSymbolProxy } from '~/domain/interface/i-trading-symbol-proxy'
import { TradingSymbol } from '~/domain/models/entities/trading-symbol'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'

const TRADING_SYMBOLS_ENDPOINT = '/trading-symbols'

/**
 * 後端回傳的原始 wire 形狀，只存在於本檔內，不外流進 domain。
 * 它是一個物件而不是一個字串，因為後端預留了往後多帶資訊的空間。
 */
type TradingSymbolWire = {
  symbol: string
}

/** Proxy：唯一允許出現 $fetch 的地方，負責把 wire 形狀收乾淨再往 domain 送。 */
export class TradingSymbolProxy extends BackendApiProxy implements ITradingSymbolProxy {
  async findTradingSymbols(): Promise<TradingSymbol[]> {
    const tradingSymbolWires
      = await this.requestBackend<TradingSymbolWire[]>(TRADING_SYMBOLS_ENDPOINT)

    return tradingSymbolWires.map(
      tradingSymbolWire => new TradingSymbol(tradingSymbolWire.symbol))
  }
}
