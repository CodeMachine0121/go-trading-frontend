import type { WatchlistEntryDto } from '~/domain/models/dto/watchlist-entry-dto'

/**
 * 介面以「能力」命名，不以供應商命名。
 *
 * 觀察清單的**讀**沿用可查交易標的那一份（追蹤中的是它的子集），
 * 所以這裡只有兩個寫入動作——為了讀一份已經在手上的清單而多開一條路，
 * 只會養出兩份會漂移的答案。
 * 實作在 app/infrastructure/proxy/watchlist-proxy.ts。
 */
export interface IWatchlistProxy {
  /** 開始持續追蹤這一檔。後端會先向該市場確認這個代號存在。 */
  addToWatchlist(entry: WatchlistEntryDto): Promise<void>
  /** 停止追蹤。**只停止追蹤**——已經抓回來的 K 線一根都不會少。 */
  removeFromWatchlist(symbol: string): Promise<void>
}
