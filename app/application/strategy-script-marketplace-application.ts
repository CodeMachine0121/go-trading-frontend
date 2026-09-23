import type { StrategyScriptMarketplaceService } from '~/domain/service/strategy-script-marketplace-service'
import type { StrategyScriptService } from '~/domain/service/strategy-script-service'
import { MarketplaceListingDomain } from '~/domain/models/domains/marketplace-listing-domain'
import { MarketplaceSearchDomain } from '~/domain/models/domains/marketplace-search-domain'
import type { MarketplaceListingRowDto } from '~/domain/models/dto/marketplace-listing-row-dto'

/**
 * Application：共用貨架的用例編排，全程只碰 DTO。
 *
 * 它吃兩個 domain service，而那不是巧合：市集回答「外面有什麼」，自己的清單回答
 * 「哪幾支是我的、哪幾支我收下過」。要畫出正確的按鈕，兩個答案都要。
 * 把兩個 service 排起來是這一層的工作——domain service 之間互不呼叫。
 */
export class StrategyScriptMarketplaceApplication {
  constructor(
    private readonly strategyScriptMarketplaceService: StrategyScriptMarketplaceService,
    private readonly strategyScriptService: StrategyScriptService,
  ) {}

  /**
   * 市集清單，每一列已經知道它對現在這個人是什麼。
   *
   * 兩份一起讀而不是先後讀：兩者都到手才畫得出正確的按鈕，分兩次讀只會讓畫面先閃一輪
   * 「全部都可以加入」。
   */
  async listMarketplace(): Promise<MarketplaceListingRowDto[]> {
    const [publishedStrategyScripts, available] = await Promise.all([
      this.strategyScriptMarketplaceService.browseMarketplace(),
      // 每一種行情都要：一支合約策略腳本是不是我的，與它吃哪一種行情無關。
      this.strategyScriptService.listAllAvailableStrategyScripts(),
    ])

    return new MarketplaceListingDomain(publishedStrategyScripts, available).toRowDtos()
  }

  /**
   * 一句搜尋的字之後，市集上還留下哪幾列。
   *
   * 它在這一層而不是在畫面上，因為「這一句話是什麼意思」是規則——切詞、比對哪幾欄、
   * 是不是每個詞都要對上，都寫在 domain model 裡，而畫面只認識這一層與 DTO。
   * 它**不讀任何東西**：篩的是畫面手上那一份，所以打字不會發出請求。
   */
  matchingRows(
    rows: readonly MarketplaceListingRowDto[], query: string,
  ): MarketplaceListingRowDto[] {
    return new MarketplaceSearchDomain(query).matching(rows)
  }

  async adoptStrategyScript(id: number): Promise<void> {
    return this.strategyScriptMarketplaceService.adoptStrategyScript(id)
  }

  async abandonStrategyScript(id: number): Promise<void> {
    return this.strategyScriptMarketplaceService.abandonStrategyScript(id)
  }
}
