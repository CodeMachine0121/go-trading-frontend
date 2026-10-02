import type { SpotTradeMarket } from '~/domain/models/vo/spot-trade-market-vo'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

const MARKET_LABELS: Readonly<Record<SpotTradeMarket, LocalizedTextVo>> = {
  taiwanStock: new LocalizedTextVo('台股', 'Taiwan stocks'),
  crypto: new LocalizedTextVo('加密貨幣', 'Crypto'),
}

export class SpotTradeMarketDomain {
  constructor(private readonly market: SpotTradeMarket) {}

  get label(): LocalizedTextVo {
    return MARKET_LABELS[this.market] ?? new UntranslatedTextVo(this.market)
  }

  get wholeSharesOnly(): boolean {
    return this.market === 'taiwanStock'
  }
}
