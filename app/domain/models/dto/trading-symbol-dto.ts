import type { MarketVo } from '~/domain/models/vo/market-vo'

/**
 * DTO：一個可查交易標的交給 application 與畫面的唯一形狀。
 *
 * 市場以 VO 的形式帶著，所以畫面拿到的是一個已經有中文標籤的東西，
 * 不必也不得自己把代號翻成人話。
 */
export class TradingSymbolDto {
  constructor(
    public readonly symbol: string,
    public readonly market: MarketVo,
    public readonly isWatched: boolean,
    public readonly isWithinTradingSession: boolean,
    public readonly hasLiveUpdates: boolean,
  ) {}
}
