import type { TradingSymbolService } from '~/domain/service/trading-symbol-service'
import type { TradingSymbolDto } from '~/domain/models/dto/trading-symbol-dto'
import type { TradingSymbolOptionsDto } from '~/domain/models/dto/trading-symbol-options-dto'
import type { MarketValue } from '~/domain/models/vo/market-vo'
import type { ContractTradingSymbolDto } from '~/domain/models/dto/contract-trading-symbol-dto'
import type { ContractTradingSymbolOptionsDto } from '~/domain/models/dto/contract-trading-symbol-options-dto'

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

  async listContractTradingSymbols(): Promise<ContractTradingSymbolDto[]> {
    return this.tradingSymbolService.listContractTradingSymbols()
  }

  /** 挑合約那一格這一次該長什麼樣子。 */
  contractOptionsFor(
    contractTradingSymbols: readonly ContractTradingSymbolDto[],
    selectedSymbol: string,
    watchedOnly = false,
  ): ContractTradingSymbolOptionsDto {
    return this.tradingSymbolService.contractOptionsFor(
      contractTradingSymbols, selectedSymbol, watchedOnly)
  }
}
