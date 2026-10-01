export class BinanceTradingKeyDto {
  constructor(
    public readonly configured: boolean,
    public readonly apiKeySummary: string | null,
    public readonly tradableMarketsLabel: string,
    public readonly configuredAt: Date | null,
  ) {}
}
