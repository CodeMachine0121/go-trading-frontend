import type { StrategyMarketplaceService } from '~/domain/service/strategy-marketplace-service'
import type { StrategyService } from '~/domain/service/strategy-service'
import { MarketplaceListingDomain } from '~/domain/models/domains/marketplace-listing-domain'
import type { MarketplaceListingRowDto } from '~/domain/models/dto/marketplace-listing-row-dto'

/**
 * Application：共用貨架的用例編排，全程只碰 DTO。
 *
 * 它吃兩個 domain service，而那不是巧合：市集回答「外面有什麼」，自己的清單回答
 * 「哪幾支是我的、哪幾支我收下過」。要畫出正確的按鈕，兩個答案都要。
 * 把兩個 service 排起來是這一層的工作——domain service 之間互不呼叫。
 */
export class StrategyMarketplaceApplication {
  constructor(
    private readonly strategyMarketplaceService: StrategyMarketplaceService,
    private readonly strategyService: StrategyService,
  ) {}

  /**
   * 市集清單，每一列已經知道它對現在這個人是什麼。
   *
   * 兩份一起讀而不是先後讀：兩者都到手才畫得出正確的按鈕，分兩次讀只會讓畫面先閃一輪
   * 「全部都可以加入」。
   */
  async listMarketplace(): Promise<MarketplaceListingRowDto[]> {
    const [publishedStrategies, available] = await Promise.all([
      this.strategyMarketplaceService.browseMarketplace(),
      this.strategyService.listAvailableStrategies(),
    ])

    return new MarketplaceListingDomain(publishedStrategies, available).toRowDtos()
  }

  async adoptStrategy(id: number): Promise<void> {
    return this.strategyMarketplaceService.adoptStrategy(id)
  }

  async abandonStrategy(id: number): Promise<void> {
    return this.strategyMarketplaceService.abandonStrategy(id)
  }
}
