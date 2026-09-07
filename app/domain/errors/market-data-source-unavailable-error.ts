/**
 * 哨兵錯誤：後端問不到那個市場——它自己活著，是它後面那個行情來源不在。
 *
 * 這一種說「稍後再試」，而不是「你打錯了」：請求本身沒有任何問題。
 */
export class MarketDataSourceUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'MarketDataSourceUnavailableError'
  }
}
