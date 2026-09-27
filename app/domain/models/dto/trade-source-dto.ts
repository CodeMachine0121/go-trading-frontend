export class TradeSourceDto {
  constructor(
    public readonly label: string,
    public readonly referencePriceText: string,
    public readonly suggestedStopLossPriceText: string,
    public readonly suggestedTakeProfitPriceText: string,
  ) {}
}
