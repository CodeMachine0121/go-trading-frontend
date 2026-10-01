export class BinanceTradingKeyWriteDto {
  constructor(
    public readonly apiKey: string,
    public readonly secretKey: string,
  ) {}
}
