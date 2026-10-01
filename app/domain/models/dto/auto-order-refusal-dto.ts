export class AutoOrderRefusalDto {
  constructor(
    public readonly strategyBotId: number,
    public readonly message: string,
    public readonly offersBinanceTradingKeySettings: boolean,
  ) {}
}
