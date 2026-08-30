/**
 * DTO：使用者在維護表單裡打的原始輸入。
 *
 * 價量刻意是字串——使用者可能留空、可能打「一百」，在通過驗證之前它還不是一個「值」。
 * 若在元件裡就轉成精確小數，轉換失敗會在最不該處理業務規則的地方爆掉。
 * 解讀與拒絕都是 KCandleWriteDomain 的事。
 */
export class KCandleWriteDto {
  constructor(
    public readonly symbol: string,
    public readonly openTime: Date,
    public readonly open: string,
    public readonly high: string,
    public readonly low: string,
    public readonly close: string,
    public readonly volume: string,
    public readonly quoteVolume: string,
    public readonly takerBuyBaseVolume: string,
    public readonly takerBuyQuoteVolume: string,
  ) {}
}
