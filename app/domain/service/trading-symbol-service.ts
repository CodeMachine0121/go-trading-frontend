import type { ITradingSymbolProxy } from '~/domain/interface/i-trading-symbol-proxy'
import type { TradingSymbolDto } from '~/domain/models/dto/trading-symbol-dto'

/**
 * Domain Service：可查交易標的的用例。
 *
 * 順序**原樣沿用後端給的**（後端已經依名稱排好）——兩個地方各排一次，
 * 遲早會有一天排得不一樣。
 */
export class TradingSymbolService {
  constructor(private readonly tradingSymbolProxy: ITradingSymbolProxy) {}

  async listTradingSymbols(): Promise<TradingSymbolDto[]> {
    const tradingSymbols = await this.tradingSymbolProxy.findTradingSymbols()

    return tradingSymbols.map(tradingSymbol => tradingSymbol.toDto())
  }
}
