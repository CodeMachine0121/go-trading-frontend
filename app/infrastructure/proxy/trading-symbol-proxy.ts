import type { ITradingSymbolProxy } from '~/domain/interface/i-trading-symbol-proxy'
import { TradingSymbol } from '~/domain/models/entities/trading-symbol'
import { FALLBACK_MARKET, MARKETS } from '~/domain/models/vo/market-vo'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'

const TRADING_SYMBOLS_ENDPOINT = '/trading-symbols'

/**
 * 後端回傳的原始 wire 形狀，只存在於本檔內，不外流進 domain。
 */
type TradingSymbolWire = {
  symbol: string
  market: string
  isWatched: boolean
  isWithinTradingSession: boolean
  hasLiveUpdates: boolean
}

/** Proxy：唯一允許出現 $fetch 的地方，負責把 wire 形狀收乾淨再往 domain 送。 */
export class TradingSymbolProxy extends BackendApiProxy implements ITradingSymbolProxy {
  async findTradingSymbols(): Promise<TradingSymbol[]> {
    const tradingSymbolWires
      = await this.requestBackend<TradingSymbolWire[]>(TRADING_SYMBOLS_ENDPOINT)

    return tradingSymbolWires.map(tradingSymbolWire => new TradingSymbol(
      tradingSymbolWire.symbol,
      // 認不得的市場名稱不讓整檔消失——它仍然挑得到，只是暫時歸在預設的那個市場。
      MARKETS.find(market => market.value === tradingSymbolWire.market) ?? FALLBACK_MARKET,
      tradingSymbolWire.isWatched,
      tradingSymbolWire.isWithinTradingSession,
      tradingSymbolWire.hasLiveUpdates,
    ))
  }
}
