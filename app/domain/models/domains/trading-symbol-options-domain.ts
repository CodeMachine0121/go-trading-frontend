import type { TradingSymbolDto } from '~/domain/models/dto/trading-symbol-dto'
import type { MarketValue } from '~/domain/models/vo/market-vo'

/**
 * Domain Model：挑標的那個選單上該出現哪幾檔，以及該選著哪一檔。
 *
 * 兩件事在這裡一起決定，因為它們是同一條規則的兩半：**只看某一個市場，就真的只看它**。
 * 選單裡混進一檔別的市場的標的，那個市場鍵就不再是「只看台股」，而是「台股，外加你
 * 剛好選著的那一檔加密貨幣」——看的人會以為自己在看台股，圖上畫的卻是比特幣。
 *
 * 代價是換市場會換掉目前選著的那一檔，這是刻意的：市場鍵是「我現在要看哪個市場」，
 * 不是「幫我把清單過濾一下」。
 */
export class TradingSymbolOptionsDomain {
  constructor(
    private readonly tradingSymbols: readonly TradingSymbolDto[],
    private readonly selectedSymbol: string,
  ) {}

  /**
   * 這個市場的每一檔，如實照清單順序。
   *
   * `null` 的意思是不篩，全部都看。
   */
  optionsFor(market: MarketValue | null): TradingSymbolDto[] {
    if (market === null) {
      return [...this.tradingSymbols]
    }

    return this.tradingSymbols.filter(tradingSymbol => tradingSymbol.market.value === market)
  }

  /**
   * 換到這個市場之後，該選著哪一檔。空字串的意思是**這個市場沒得選**。
   *
   * 目前選著的那一檔就在這個市場裡時原封不動——只是換個角度看同一份清單，
   * 沒有理由把人正在看的東西換掉。它不在，才改選這個市場的第一檔。
   *
   * 它與「列出哪幾檔」必須一起回答：分兩次問，就有機會依據兩份不同的清單，
   * 選出一個根本不在選單上的標的。
   */
  selectionFor(market: MarketValue | null): string {
    const options = this.optionsFor(market)
    if (options.some(tradingSymbol => tradingSymbol.symbol === this.selectedSymbol)) {
      return this.selectedSymbol
    }

    return options[0]?.symbol ?? ''
  }

  /** 這個市場一檔都沒有。 */
  hasNoneIn(market: MarketValue | null): boolean {
    return this.optionsFor(market).length === 0
  }
}
