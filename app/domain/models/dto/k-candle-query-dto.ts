/**
 * DTO：畫面交給 application 的查詢輸入形狀。
 * DTO 是雙向的——既是 domain 回傳的形狀，也是元件送進來的形狀。
 *
 * 這裡沒有結束時間：查詢一律查到目前時間，那不是使用者填得出來的條件（見 KCandleQueryDomain）。
 */
export class KCandleQueryDto {
  constructor(
    public readonly symbol: string,
    public readonly startTime: Date,
  ) {}
}
