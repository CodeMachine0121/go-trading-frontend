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
    /**
     * 這個市場一檔都沒有——除了因為被選著才留下來的那一檔以外。
     * 它與「選單是空的」不同，說「這個市場沒有任何標的」才是實話。
     */
    public readonly hasNoneInMarket: boolean,
  ) {}
}
