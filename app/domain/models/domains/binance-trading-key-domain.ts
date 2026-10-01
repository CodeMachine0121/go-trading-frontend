import type { BinanceTradingKey } from '~/domain/models/entities/binance-trading-key'
import { BinanceTradingKeyDto } from '~/domain/models/dto/binance-trading-key-dto'
import type { TradableMarketVo } from '~/domain/models/vo/tradable-market-vo'
import { TRADABLE_MARKETS } from '~/domain/models/vo/tradable-market-vo'

const TRADABLE_MARKET_LABELS: Readonly<Record<TradableMarketVo, string>> = {
  spot: '現貨',
  contract: '合約',
}

export class BinanceTradingKeyDomain {
  constructor(private readonly binanceTradingKey: BinanceTradingKey) {}

  toDto(): BinanceTradingKeyDto {
    if (!this.binanceTradingKey.configured) {
      return new BinanceTradingKeyDto(false, null, '', null)
    }

    return new BinanceTradingKeyDto(
      true,
      this.binanceTradingKey.apiKeyTail === ''
        ? '已設定'
        : `結尾 ${this.binanceTradingKey.apiKeyTail}`,
      TRADABLE_MARKETS
        .filter(market => this.binanceTradingKey.tradableMarkets.includes(market))
        .map(market => TRADABLE_MARKET_LABELS[market])
        .join('、'),
      this.binanceTradingKey.configuredAt,
    )
  }
}
