/** 商品搜尋上的一列：代號、唸法、補充說明（市場、有沒有即時更新）。 */
export class SymbolSearchOptionDto {
  constructor(
    public readonly symbol: string,
    public readonly title: string,
    public readonly description: string,
  ) {}
}
