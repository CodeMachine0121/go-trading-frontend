import type { AvailableStrategyScriptsDto } from '~/domain/models/dto/available-strategy-scripts-dto'
import type { PublishedStrategyScriptDto } from '~/domain/models/dto/published-strategy-script-dto'
import { MarketplaceListingRowDto } from '~/domain/models/dto/marketplace-listing-row-dto'

/**
 * Domain Model：市集這一份清單，配上「每一支對這個人是什麼」。
 *
 * 市集本身回答的是「外面有什麼」，而那份答案對每個人都一樣。要畫出正確的按鈕，還需要
 * 兩件只有自己的清單答得出來的事：這一支是不是我分享的、我收下過了沒。把兩份湊起來的
 * 那個判斷放在這裡，是因為它是**規則**而不是接線——放在畫面上，它就會在每一張卡上
 * 各算一次，而其中一次算錯就是一顆按不動的按鈕。
 */
export class MarketplaceListingDomain {
  constructor(
    private readonly publishedStrategyScripts: readonly PublishedStrategyScriptDto[],
    private readonly available: AvailableStrategyScriptsDto,
  ) {}

  /**
   * 市集上的每一列，順序照市集給的（最近分享的在前）。
   *
   * 自己分享的那些**留在清單上**：市集回答的是「外面有什麼」，而自己那一支確實在外面。
   * 把它藏起來會讓人以為分享沒有成功。
   */
  toRowDtos(): MarketplaceListingRowDto[] {
    const ownStrategyScriptIds = new Set(this.available.mine.map(strategyScript => strategyScript.id))
    const adoptedStrategyScriptIds = new Set(this.available.adopted.map(published => published.id))

    return this.publishedStrategyScripts.map(strategyScript => new MarketplaceListingRowDto(
      strategyScript,
      ownStrategyScriptIds.has(strategyScript.id),
      adoptedStrategyScriptIds.has(strategyScript.id),
    ))
  }
}
