import type { TradingSymbolDto } from '~/domain/models/dto/trading-symbol-dto'
import type { MarketValue } from '~/domain/models/vo/market-vo'

/**
 * Domain Model：挑標的那個選單上該出現哪幾檔。
 *
 * 兩件事在這裡一起決定，因為它們互相牽制：只看某一個市場，**而且**目前選著的那一檔
 * 一定看得見。少了後半，切換市場會把使用者正在看的那一檔從選單上抹掉，
 * 而選單一旦沒有它，畫面就得替他改選一個他沒要的標的——他只是想換個角度看清單，
 * 不是想換一檔股票。
 */
export class TradingSymbolOptionsDomain {
  constructor(
    private readonly tradingSymbols: readonly TradingSymbolDto[],
    private readonly selectedSymbol: string,
  ) {}

  /**
   * 篩過之後該列出來的那幾檔。
   *
   * `null` 的意思是不篩，全部都看。
   */
  optionsFor(market: MarketValue | null): TradingSymbolDto[] {
    if (market === null) {
      return [...this.tradingSymbols]
    }

    return this.tradingSymbols.filter(tradingSymbol =>
      tradingSymbol.market.value === market
      || tradingSymbol.symbol === this.selectedSymbol)
  }

  /**
   * 這個市場一檔都沒有——除了因為被選著才留下來的那一檔以外。
   *
   * 它與「選單是空的」不同：選單上還有一個項目，但那是使用者原本就選著的，
   * 不是這個市場提供的選擇。說「這個市場沒有任何標的」才是實話。
   */
  hasNoneIn(market: MarketValue | null): boolean {
    if (market === null) {
      return this.tradingSymbols.length === 0
    }

    return !this.tradingSymbols.some(tradingSymbol => tradingSymbol.market.value === market)
  }
}
