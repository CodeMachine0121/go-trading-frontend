import type { IStrategyMarketplaceProxy } from '~/domain/interface/i-strategy-marketplace-proxy'
import type { PublishedStrategyDto } from '~/domain/models/dto/published-strategy-dto'

/**
 * Domain Service：共用貨架的編排。公開用例方法之間互不呼叫。
 *
 * 它與策略那一個 service 分開，理由與 proxy 相同：那一個回答「我的東西」，
 * 這一個回答「外面有什麼」。
 */
export class StrategyMarketplaceService {
  constructor(private readonly strategyMarketplaceProxy: IStrategyMarketplaceProxy) {}

  /**
   * 市集上目前有什麼，最近分享的排前面。一支都沒有是答案，不是錯誤。
   *
   * 回的每一支都沒有算式——那是型別上的事實，不是這裡做的過濾。
   */
  async browseMarketplace(): Promise<PublishedStrategyDto[]> {
    const publishedStrategies = await this.strategyMarketplaceProxy.browseMarketplace()

    return publishedStrategies.map(published => published.toDomain().toDto())
  }

  /** 把市集上的那一支放進自己的清單。已經加入過的再加一次不算失敗。 */
  async adoptStrategy(id: number): Promise<void> {
    return this.strategyMarketplaceProxy.adoptStrategy(id)
  }

  /** 從自己的清單拿掉。只影響自己——它仍然在市集上。 */
  async abandonStrategy(id: number): Promise<void> {
    return this.strategyMarketplaceProxy.abandonStrategy(id)
  }
}
