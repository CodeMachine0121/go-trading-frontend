import type { ITradingSymbolProxy } from '~/domain/interface/i-trading-symbol-proxy'
import type { TradingSymbolDto } from '~/domain/models/dto/trading-symbol-dto'
import { TradingSymbolOptionsDto } from '~/domain/models/dto/trading-symbol-options-dto'
import { TradingSymbolOptionsDomain } from '~/domain/models/domains/trading-symbol-options-domain'
import type { MarketValue } from '~/domain/models/vo/market-vo'

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

  /**
   * 挑標的那個選單這一次該長什麼樣子：只看某一個市場，而且目前選著的那一檔一定看得見。
   *
   * 它與列出清單是兩個用例，互不呼叫——清單取一次就好，而篩選會在使用者每次切換
   * 市場時發生，兩者綁在一起等於每按一次就再向後端要一次同一份資料。
   */
  optionsFor(
    tradingSymbols: readonly TradingSymbolDto[],
    market: MarketValue | null,
    selectedSymbol: string,
  ): TradingSymbolOptionsDto {
    const optionsDomain = new TradingSymbolOptionsDomain(tradingSymbols, selectedSymbol)

    return new TradingSymbolOptionsDto(
      optionsDomain.optionsFor(market), optionsDomain.hasNoneIn(market))
  }
}
