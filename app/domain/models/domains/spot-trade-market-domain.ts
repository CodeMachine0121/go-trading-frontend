import type { SpotTradeMarket } from '~/domain/models/vo/spot-trade-market-vo'

const MARKET_LABELS: Readonly<Record<SpotTradeMarket, string>> = {
  taiwanStock: '台股',
  crypto: '加密貨幣',
}

export class SpotTradeMarketDomain {
  constructor(private readonly market: SpotTradeMarket) {}

  get label(): string {
    return MARKET_LABELS[this.market] ?? this.market
  }

  get wholeSharesOnly(): boolean {
    return this.market === 'taiwanStock'
  }
}
