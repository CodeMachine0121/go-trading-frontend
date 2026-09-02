import type { TradingSymbolService } from '~/domain/service/trading-symbol-service'
import type { TradingSymbolDto } from '~/domain/models/dto/trading-symbol-dto'

/**
 * Application：可查交易標的的用例編排，全程只碰 DTO。
 * 純 TypeScript——不認識 Vue、不碰 ref/reactive。
 */
export class TradingSymbolApplication {
  constructor(private readonly tradingSymbolService: TradingSymbolService) {}

  async listTradingSymbols(): Promise<TradingSymbolDto[]> {
    return this.tradingSymbolService.listTradingSymbols()
  }
}
