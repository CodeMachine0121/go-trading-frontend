import { MarketCounterpartDomain } from '~/domain/models/domains/market-counterpart-domain'
import type { MarketCounterpartDto } from '~/domain/models/dto/market-counterpart-dto'

export class MarketCounterpartApplication {
  describeCounterpart(path: string): MarketCounterpartDto {
    return new MarketCounterpartDomain(path).toDto()
  }
}
