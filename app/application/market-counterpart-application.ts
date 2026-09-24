import { MarketCounterpartDomain } from '~/domain/models/domains/market-counterpart-domain'
import type { MarketCounterpartDto } from '~/domain/models/dto/market-counterpart-dto'
import type { MarketSideService } from '~/domain/service/market-side-service'
import type { MarketSideVo } from '~/domain/models/vo/market-side-vo'

export class MarketCounterpartApplication {
  constructor(private readonly marketSideService: MarketSideService) {}

  describeCounterpart(path: string): MarketCounterpartDto {
    return new MarketCounterpartDomain(path).toDto()
  }

  /** 這條路在某一邊的樣子（例如使用者最後切到合約時，「行情圖表」指向合約 K 線圖表）。 */
  resolvePathOnSide(path: string, side: MarketSideVo): string {
    return new MarketCounterpartDomain(path).toPathOnSide(side)
  }

  restoreMarketSide(): MarketSideVo {
    return this.marketSideService.restoreMarketSide()
  }

  rememberMarketSide(side: string): MarketSideVo {
    return this.marketSideService.rememberMarketSide(side)
  }
}
