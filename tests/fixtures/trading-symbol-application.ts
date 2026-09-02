import { vi } from 'vitest'
import { TradingSymbolApplication } from '~/application/trading-symbol-application'
import { TradingSymbolService } from '~/domain/service/trading-symbol-service'
import { TradingSymbol } from '~/domain/models/entities/trading-symbol'

/**
 * 交易標的清單來自另一個外部資源，只 mock 它的介面；
 * application、domain service 與 entity 都是真的。
 *
 * 每個要讀行情的畫面都需要它，四個測試檔各抄一份只會慢慢長歪，
 * 因此收在這裡。預設就給既有那兩檔——這樣既有的測試不會因為多了一份清單而換一檔標的。
 */
export function buildTradingSymbolApplication(
  symbols: string[] = ['BTCUSDT', 'ETHUSDT'],
): TradingSymbolApplication {
  return new TradingSymbolApplication(new TradingSymbolService({
    findTradingSymbols: vi.fn().mockResolvedValue(symbols.map(symbol => new TradingSymbol(symbol))),
  }))
}
