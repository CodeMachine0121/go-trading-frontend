import type { TradingSymbolDto } from '~/domain/models/dto/trading-symbol-dto'

/**
 * DTO：挑標的那個選單這一次該長什麼樣子。
 *
 * 兩件事一起交出去，因為畫面同時需要它們，而分兩次問會讓「篩到什麼」與
 * 「這個市場有沒有東西」有機會出自兩份不同的清單。
 */
export class TradingSymbolOptionsDto {
  constructor(
    public readonly options: readonly TradingSymbolDto[],
    /** 這個市場一檔都沒有，所以選單是空的。 */
    public readonly hasNoneInMarket: boolean,
    /**
     * 換到這個市場之後該選著哪一檔。空字串代表這個市場沒得選。
     *
     * 它與選項一起交出去，因為分兩次問就有機會選出一個不在選單上的標的。
     */
    public readonly selectedSymbol: string,
  ) {}
}
