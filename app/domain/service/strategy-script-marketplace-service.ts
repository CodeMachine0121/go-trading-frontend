import type { IStrategyScriptMarketplaceProxy } from '~/domain/interface/i-strategy-script-marketplace-proxy'
import type { PublishedStrategyScriptDto } from '~/domain/models/dto/published-strategy-script-dto'

/**
 * Domain Service：共用貨架的編排。公開用例方法之間互不呼叫。
 *
 * 它與策略腳本那一個 service 分開，理由與 proxy 相同：那一個回答「我的東西」，
 * 這一個回答「外面有什麼」。
 */
export class StrategyScriptMarketplaceService {
  constructor(private readonly strategyScriptMarketplaceProxy: IStrategyScriptMarketplaceProxy) {}

  /**
   * 市集上目前有什麼，最近分享的排前面。一支都沒有是答案，不是錯誤。
   *
   * 回的每一支都沒有算式——那是型別上的事實，不是這裡做的過濾。
   */
  async browseMarketplace(): Promise<PublishedStrategyScriptDto[]> {
    const publishedStrategyScripts = await this.strategyScriptMarketplaceProxy.browseMarketplace()

    return publishedStrategyScripts.map(published => published.toDomain().toDto())
  }

  /** 把市集上的那一支放進自己的清單。已經加入過的再加一次不算失敗。 */
  async adoptStrategyScript(id: number): Promise<void> {
    return this.strategyScriptMarketplaceProxy.adoptStrategyScript(id)
  }
}
