import { TradingSymbolDto } from '~/domain/models/dto/trading-symbol-dto'
import type { MarketVo } from '~/domain/models/vo/market-vo'

/**
 * Entity：一個可查交易標的在 domain 內的本體形狀，只有欄位、沒有業務邏輯。
 * 它是後端認得的那些標的之一：已登錄的，加上實際有 K 線的。
 *
 * 後四個欄位由後端回答，畫面**不自己推算**：畫面不知道哪幾天休市，
 * 不知道後端把即時名額給了誰，也分不出「這個市場收盤了」與「這個市場只是很安靜」。
 * 自己算的結果會把國定假日說成故障，或替一張永遠不動的圖保證即時更新。
 */
export class TradingSymbol {
  constructor(
    public readonly symbol: string,
    public readonly market: MarketVo,
    public readonly isWatched: boolean,
    public readonly isWithinTradingSession: boolean,
    /** 這個市場**會不會收盤**。與「現在開著沒」是兩件事。 */
    public readonly hasTradingSession: boolean,
    public readonly hasLiveUpdates: boolean,
  ) {}

  toDto(): TradingSymbolDto {
    return new TradingSymbolDto(
      this.symbol,
      this.market,
      this.isWatched,
      this.isWithinTradingSession,
      this.hasTradingSession,
      this.hasLiveUpdates,
    )
  }
}
