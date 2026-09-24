import type { IMarketSidePreferenceProxy } from '~/domain/interface/i-market-side-preference-proxy'
import { MarketSideDomain } from '~/domain/models/domains/market-side-domain'
import type { MarketSideVo } from '~/domain/models/vo/market-side-vo'

/**
 * Domain Service：記住使用者最後待在哪一邊。公開用例方法之間互不呼叫。
 */
export class MarketSideService {
  constructor(private readonly marketSidePreferenceProxy: IMarketSidePreferenceProxy) {}

  restoreMarketSide(): MarketSideVo {
    return new MarketSideDomain(this.marketSidePreferenceProxy.readMarketSide()).side
  }

  rememberMarketSide(side: string): MarketSideVo {
    const marketSide = new MarketSideDomain(side).side
    this.marketSidePreferenceProxy.writeMarketSide(marketSide)

    return marketSide
  }
}
