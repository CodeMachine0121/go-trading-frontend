/**
 * DTO：畫面交給 application 的查詢輸入形狀。
 * DTO 是雙向的——既是 domain 回傳的形狀，也是元件送進來的形狀。
 */
export class KCandleQueryDto {
  constructor(
    public readonly symbol: string,
    public readonly startTime: Date,
    public readonly endTime: Date,
  ) {}
}
