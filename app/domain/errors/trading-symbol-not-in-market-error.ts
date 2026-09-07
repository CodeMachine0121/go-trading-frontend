/**
 * 哨兵錯誤：這個代號在那個市場找不到。
 *
 * 它必須與 MarketDataSourceUnavailableError 分開，因為使用者該做的事完全相反：
 * 這一種是他打錯了，改一個字就好；那一種他改什麼都沒用，只能等一下再試。
 * 說成同一句話，等於讓一半的人在一個本來就正確的代號上反覆重打。
 */
export class TradingSymbolNotInMarketError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'TradingSymbolNotInMarketError'
  }
}
