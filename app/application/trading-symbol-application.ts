import type { TradingSymbolService } from '~/domain/service/trading-symbol-service'
import type { TradingSymbolDto } from '~/domain/models/dto/trading-symbol-dto'
import type { TradingSymbolOptionsDto } from '~/domain/models/dto/trading-symbol-options-dto'
import type { MarketValue } from '~/domain/models/vo/market-vo'

/**
 * Application：可查交易標的的用例編排，全程只碰 DTO。
 * 純 TypeScript——不認識 Vue、不碰 ref/reactive。
 */
export class TradingSymbolApplication {
  constructor(private readonly tradingSymbolService: TradingSymbolService) {}

  async listTradingSymbols(): Promise<TradingSymbolDto[]> {
    return this.tradingSymbolService.listTradingSymbols()
  }

  /** 挑標的那個選單這一次該長什麼樣子。清單只取一次，篩選在這一側完成。 */
  optionsFor(
    tradingSymbols: readonly TradingSymbolDto[],
    market: MarketValue | null,
    selectedSymbol: string,
  ): TradingSymbolOptionsDto {
    return this.tradingSymbolService.optionsFor(tradingSymbols, market, selectedSymbol)
  }
}
