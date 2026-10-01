import type { BinanceTradingKey } from '~/domain/models/entities/binance-trading-key'
import { BinanceTradingKeyDto } from '~/domain/models/dto/binance-trading-key-dto'
import type { TradableMarketVo } from '~/domain/models/vo/tradable-market-vo'
import { TRADABLE_MARKETS } from '~/domain/models/vo/tradable-market-vo'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const TRADABLE_MARKET_LABELS: Readonly<Record<TradableMarketVo, LocalizedTextVo>> = {
  spot: new LocalizedTextVo('現貨', 'Spot'),
  contract: new LocalizedTextVo('合約', 'Contract'),
}

export class BinanceTradingKeyDomain {
  constructor(private readonly binanceTradingKey: BinanceTradingKey) {}

  toDto(): BinanceTradingKeyDto {
    if (!this.binanceTradingKey.configured) {
      return new BinanceTradingKeyDto(false, null, new LocalizedTextVo('', ''), null)
    }

    const tradableMarketLabels = TRADABLE_MARKETS
      .filter(market => this.binanceTradingKey.tradableMarkets.includes(market))
      .map(market => TRADABLE_MARKET_LABELS[market])

    return new BinanceTradingKeyDto(
      true,
      this.binanceTradingKey.apiKeyTail === ''
        ? new LocalizedTextVo('已設定', 'Configured')
        : new LocalizedTextVo(
            `結尾 ${this.binanceTradingKey.apiKeyTail}`,
            `Ending in ${this.binanceTradingKey.apiKeyTail}`,
          ),
      new LocalizedTextVo(
        tradableMarketLabels.map(label => label.traditionalChinese).join('、'),
        tradableMarketLabels.map(label => label.english).join(', '),
      ),
      this.binanceTradingKey.configuredAt,
    )
  }
}
