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
    /** 這個市場怎麼稱呼它（2330 → 台積電）。不取名字的市場是空字串。 */
    public readonly displayName: string,
    /**
     * 唸出這一檔時該說的整串：有名字就是「2330 台積電」，沒有就只有代號。
     *
     * 它在這裡算好，而不是讓每個畫面自己接——三個畫面都要唸它，
     * 各自接一份的話，遲早會有一個在沒有名字的時候多一個空格。
     */
    public readonly label: string,
    public readonly market: MarketVo,
    public readonly isWatched: boolean,
    public readonly isWithinTradingSession: boolean,
    /**
     * 這個市場**會不會收盤**。與「現在開著沒」是兩件事：
     * 一個永不收盤的市場永遠只差一輪就跟上了，手動要求更新對它沒有意義。
     */
    public readonly hasTradingSession: boolean,
    public readonly hasLiveUpdates: boolean,
  ) {}
}
