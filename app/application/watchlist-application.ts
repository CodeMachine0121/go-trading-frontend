import type { WatchlistService } from '~/domain/service/watchlist-service'
import type { TradingSymbolDto } from '~/domain/models/dto/trading-symbol-dto'
import type { WatchlistEntryDto } from '~/domain/models/dto/watchlist-entry-dto'

/**
 * Application：觀察清單的用例編排，全程只碰 DTO。
 * 它是那一頁**唯一**的 collaborator——頁面不必自己編排三件事。
 */
export class WatchlistApplication {
  constructor(private readonly watchlistService: WatchlistService) {}

  async listWatchedTradingSymbols(): Promise<TradingSymbolDto[]> {
    return this.watchlistService.listWatchedTradingSymbols()
  }

  async addToWatchlist(entry: WatchlistEntryDto): Promise<void> {
    return this.watchlistService.addToWatchlist(entry)
  }

  async removeFromWatchlist(symbol: string): Promise<void> {
    return this.watchlistService.removeFromWatchlist(symbol)
  }
}
