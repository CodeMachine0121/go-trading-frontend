export class SpotTradeSourceComparisonRowDto {
  constructor(
    public readonly label: string,
    public readonly tradeCountText: string,
    public readonly winRateText: string,
    public readonly averageReturnRateText: string,
  ) {}
}
