import type { ITradingSymbolProxy } from '~/domain/interface/i-trading-symbol-proxy'
import type { IWatchlistProxy } from '~/domain/interface/i-watchlist-proxy'
import type { TradingSymbolDto } from '~/domain/models/dto/trading-symbol-dto'
import type { WatchlistEntryDto } from '~/domain/models/dto/watchlist-entry-dto'

/**
 * Domain Service：觀察清單的用例。三個公開方法互不呼叫。
 *
 * 讀走的是可查交易標的那一份，只留下追蹤中的——觀察清單本來就是它的子集，
 * 為了讀一份已經拿得到的清單而多開一條路，只會養出兩份會漂移的答案。
 */
export class WatchlistService {
  constructor(
    private readonly tradingSymbolProxy: ITradingSymbolProxy,
    private readonly watchlistProxy: IWatchlistProxy,
  ) {}

  /** 目前正在被持續追蹤的那幾檔，順序原樣沿用後端給的。 */
  async listWatchedTradingSymbols(): Promise<TradingSymbolDto[]> {
    const tradingSymbols = await this.tradingSymbolProxy.findTradingSymbols()

    return tradingSymbols
      .filter(tradingSymbol => tradingSymbol.isWatched)
      .map(tradingSymbol => tradingSymbol.toDto())
  }

  /** 開始持續追蹤一檔。後端會先向該市場確認這個代號存在。 */
  async addToWatchlist(entry: WatchlistEntryDto): Promise<void> {
    await this.watchlistProxy.addToWatchlist(entry)
  }

  /** 停止追蹤。**只停止追蹤**——已經抓回來的 K 線一根都不會少。 */
  async removeFromWatchlist(symbol: string): Promise<void> {
    await this.watchlistProxy.removeFromWatchlist(symbol)
  }
}
