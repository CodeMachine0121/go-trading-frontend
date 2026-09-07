import { describe, expect, it, vi } from 'vitest'
import { WatchlistService } from '~/domain/service/watchlist-service'
import { WatchlistEntryDto } from '~/domain/models/dto/watchlist-entry-dto'
import { buildTradingSymbol } from '../../fixtures/trading-symbol-application'

function buildService(watchlistProxy = {
  addToWatchlist: vi.fn().mockResolvedValue(undefined),
  removeFromWatchlist: vi.fn().mockResolvedValue(undefined),
}) {
  return {
    watchlistService: new WatchlistService(
      {
        findTradingSymbols: vi.fn().mockResolvedValue([
          buildTradingSymbol('2330', { market: 'taiwanStock', isWatched: true }),
          buildTradingSymbol('XRPUSDT', { isWatched: false }),
          buildTradingSymbol('BTCUSDT', { isWatched: true }),
        ]),
      },
      watchlistProxy,
    ),
    watchlistProxy,
  }
}

describe('WatchlistService', () => {
  it('只回追蹤中的那幾檔，順序原樣沿用後端給的', async () => {
    // 觀察清單是可查交易標的的子集。為了讀一份已經拿得到的清單而多開一條路，
    // 只會養出兩份會漂移的答案。
    const { watchlistService } = buildService()

    const watched = await watchlistService.listWatchedTradingSymbols()

    expect(watched.map(tradingSymbol => tradingSymbol.symbol)).toEqual(['2330', 'BTCUSDT'])
  })

  it('加一檔就是把市場與代號交給那條寫入的路', async () => {
    const { watchlistService, watchlistProxy } = buildService()
    const entry = new WatchlistEntryDto('2454', 'taiwanStock')

    await watchlistService.addToWatchlist(entry)

    expect(watchlistProxy.addToWatchlist).toHaveBeenCalledWith(entry)
  })

  it('拿掉一檔只以代號指名', async () => {
    const { watchlistService, watchlistProxy } = buildService()

    await watchlistService.removeFromWatchlist('2330')

    expect(watchlistProxy.removeFromWatchlist).toHaveBeenCalledWith('2330')
  })
})
