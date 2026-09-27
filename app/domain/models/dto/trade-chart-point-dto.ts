export class TradeChartPointDto {
  constructor(
    public readonly time: Date,
    public readonly value: number,
  ) {}
}
