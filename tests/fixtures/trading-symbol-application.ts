import { vi } from 'vitest'
import { TradingSymbolApplication } from '~/application/trading-symbol-application'
import { TradingSymbolService } from '~/domain/service/trading-symbol-service'
import { TradingSymbol } from '~/domain/models/entities/trading-symbol'
import { MARKETS, type MarketValue } from '~/domain/models/vo/market-vo'

/**
 * 交易標的清單來自另一個外部資源，只 mock 它的介面；
 * application、domain service 與 entity 都是真的。
 *
 * 每個要讀行情的畫面都需要它，四個測試檔各抄一份只會慢慢長歪，
 * 因此收在這裡。預設就給既有那兩檔——這樣既有的測試不會因為多了一份清單而換一檔標的。
 */
export function buildTradingSymbolApplication(
  symbols: string[] = ['BTCUSDT', 'ETHUSDT'],
  overrides: TradingSymbolOverrides = {},
): TradingSymbolApplication {
  return new TradingSymbolApplication(new TradingSymbolService({
    findTradingSymbols: vi.fn().mockResolvedValue(
      symbols.map(symbol => buildTradingSymbol(symbol, overrides))),
  }))
}

/** 一個案例真正在意的那幾個欄位；其餘交給中性的預設。 */
export type TradingSymbolOverrides = {
  market?: MarketValue
  isWatched?: boolean
  isWithinTradingSession?: boolean
  hasTradingSession?: boolean
  hasLiveUpdates?: boolean
}

/**
 * 一檔交易標的，只有這一個案例真正在意的欄位需要說出來。
 *
 * 其餘的給一個中性的預設：屬於既有那個市場、追蹤中、在交易時段內、有即時更新——
 * 也就是「台股接進來之前這台終端機唯一見過的樣子」，所以既有的測試讀起來一如往常。
 */
export function buildTradingSymbol(
  symbol: string,
  overrides: TradingSymbolOverrides = {},
): TradingSymbol {
  const market = MARKETS.find(known => known.value === (overrides.market ?? 'crypto'))!

  return new TradingSymbol(
    symbol,
    market,
    overrides.isWatched ?? true,
    overrides.isWithinTradingSession ?? true,
    // 預設是既有那個永不收盤的市場，所以既有的測試讀起來一如往常。
    overrides.hasTradingSession ?? false,
    overrides.hasLiveUpdates ?? true,
  )
}
