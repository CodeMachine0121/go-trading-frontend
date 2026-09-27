export class SpotTradeSourceGroup {
  constructor(
    public readonly tradeCount: number,
    public readonly winRate: number | null,
    public readonly averageReturnRate: number | null,
  ) {}
}
