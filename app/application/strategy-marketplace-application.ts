import type { StrategyMarketplaceService } from '~/domain/service/strategy-marketplace-service'
import type { PublishedStrategyDto } from '~/domain/models/dto/published-strategy-dto'

/** Application：共用貨架的用例編排，全程只碰 DTO。 */
export class StrategyMarketplaceApplication {
  constructor(private readonly strategyMarketplaceService: StrategyMarketplaceService) {}

  async browseMarketplace(): Promise<PublishedStrategyDto[]> {
    return this.strategyMarketplaceService.browseMarketplace()
  }

  async adoptStrategy(id: number): Promise<void> {
    return this.strategyMarketplaceService.adoptStrategy(id)
  }

  async abandonStrategy(id: number): Promise<void> {
    return this.strategyMarketplaceService.abandonStrategy(id)
  }
}
