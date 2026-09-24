import type { ITradingSymbolProxy } from '~/domain/interface/i-trading-symbol-proxy'
import type { IContractTradingSymbolProxy } from '~/domain/interface/i-contract-trading-symbol-proxy'
import type { ContractTradingSymbolDto } from '~/domain/models/dto/contract-trading-symbol-dto'
import type { ContractTradingSymbolOptionsDto } from '~/domain/models/dto/contract-trading-symbol-options-dto'
import { ContractTradingSymbolOptionsDomain } from '~/domain/models/domains/contract-trading-symbol-options-domain'
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
  constructor(
    private readonly tradingSymbolProxy: ITradingSymbolProxy,
    private readonly contractTradingSymbolProxy: IContractTradingSymbolProxy,
  ) {}

  async listTradingSymbols(): Promise<TradingSymbolDto[]> {
    const tradingSymbols = await this.tradingSymbolProxy.findTradingSymbols()

    return tradingSymbols.map(tradingSymbol => tradingSymbol.toDto())
  }

  /**
   * 挑標的那個選單這一次該長什麼樣子：只看某一個市場，以及該選著哪一檔。
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
      optionsDomain.optionsFor(market),
      optionsDomain.hasNoneIn(market),
      optionsDomain.selectionFor(market),
    )
  }

  /** 合約那一邊認得的每一個標的，順序原樣沿用後端給的。 */
  async listContractTradingSymbols(): Promise<ContractTradingSymbolDto[]> {
    const contractTradingSymbols
      = await this.contractTradingSymbolProxy.findContractTradingSymbols()

    return contractTradingSymbols.map(contractTradingSymbol => contractTradingSymbol.toDto())
  }

  /**
   * 挑合約那一格這一次該長什麼樣子。它與列出清單是兩個用例，理由與現貨那一格相同：
   * 清單取一次就好。
   */
  contractOptionsFor(
    contractTradingSymbols: readonly ContractTradingSymbolDto[],
    selectedSymbol: string,
    watchedOnly = false,
    keepsSelection = false,
  ): ContractTradingSymbolOptionsDto {
    return new ContractTradingSymbolOptionsDomain(
      contractTradingSymbols, selectedSymbol, watchedOnly, keepsSelection).toDto()
  }
}
