/**
 * DTO：一個合約標的交給 application 與畫面的唯一形狀。
 *
 * 沒有市場這一欄：合約都在同一個全天候的市場，說了也只有一種答案。
 */
export class ContractTradingSymbolDto {
  constructor(
    public readonly symbol: string,
    /** 是否在合約追蹤名單上。不在的也列著——手上有它的合約 K 線。 */
    public readonly isWatched: boolean,
  ) {}
}
