import type { IWatchlistProxy } from '~/domain/interface/i-watchlist-proxy'
import type { WatchlistEntryDto } from '~/domain/models/dto/watchlist-entry-dto'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { MarketDataSourceUnavailableError } from '~/domain/errors/market-data-source-unavailable-error'
import { TradingSymbolNotInMarketError } from '~/domain/errors/trading-symbol-not-in-market-error'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'

const WATCHLIST_ENDPOINT = '/watchlist'

/** 後端說「我問不到那個市場」時用的狀態碼。它自己活著，是它後面那位不在。 */
/** 後端讀懂了請求、認為代號不對時回的那一種。 */
const SYMBOL_NOT_IN_MARKET_STATUS = 400
const MARKET_UNREACHABLE_STATUS = 502

/** Proxy：觀察清單的兩個寫入動作。 */
export class WatchlistProxy extends BackendApiProxy implements IWatchlistProxy {
  async addToWatchlist(entry: WatchlistEntryDto): Promise<void> {
    try {
      await this.requestBackend<null>(WATCHLIST_ENDPOINT, {
        method: 'POST',
        body: { symbol: entry.symbol, market: entry.market },
      })
    }
    catch (error: unknown) {
      throw this.watchlistFailureOf(error)
    }
  }

  async removeFromWatchlist(symbol: string): Promise<void> {
    await this.requestBackend<null>(
      `${WATCHLIST_ENDPOINT}/${encodeURIComponent(symbol)}`, { method: 'DELETE' })
  }

  /**
   * 兩種失敗在這一層被分開，因為使用者的下一步完全相反。
   *
   * 後端拒絕（它讀懂了請求、認為代號不對）是「你打錯了」；後端說它問不到那個市場
   * 是「請求沒問題，等一下再試」。說成同一句話，等於讓一半的人在一個本來就正確的
   * 代號上反覆重打。
   */
  private watchlistFailureOf(error: unknown): unknown {
    // 只認那一種狀態碼，理由與底下那一條一模一樣：後端還有別的理由拒絕一個請求
    // （沒登入、太頻繁），把那些一律說成「這個代號不對」，等於叫人反覆重打一個
    // 本來就正確的代號。
    if (error instanceof BackendRequestRejectedError
      && error.status === SYMBOL_NOT_IN_MARKET_STATUS) {
      return new TradingSymbolNotInMarketError(error.message, { cause: error })
    }
    // 只認那一種狀態碼，不是所有的伺服器錯誤：後端自己壞掉是另一回事，
    // 說成「行情來源不在」會把使用者的注意力引到錯的地方。
    if (error instanceof BackendServerError && error.status === MARKET_UNREACHABLE_STATUS) {
      return new MarketDataSourceUnavailableError(error.message, { cause: error })
    }

    return error
  }
}
