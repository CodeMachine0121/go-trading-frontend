import { BinanceTradingKeyDomain } from '~/domain/models/domains/binance-trading-key-domain'

export class BinanceTradingKey {
  constructor(
    public readonly configured: boolean,
    public readonly apiKeyTail: string,
    public readonly tradableMarkets: readonly string[],
    public readonly configuredAt: Date | null,
  ) {}

  toDomain(): BinanceTradingKeyDomain {
    return new BinanceTradingKeyDomain(this)
  }
}
