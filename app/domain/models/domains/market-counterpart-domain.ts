import { MarketCounterpartDto } from '~/domain/models/dto/market-counterpart-dto'
import type { MarketSideVo } from '~/domain/models/vo/market-side-vo'

/**
 * 有兩邊的去處：現貨那一頁的路徑與合約那一頁的路徑。
 *
 * 新增一條對應＝這裡多一列，開關不必改。
 */
const COUNTERPART_PAIRS = [
  { spot: '/k-candles/chart', contract: '/contract-k-candles/chart' },
  { spot: '/k-candles', contract: '/contract-k-candles' },
  { spot: '/strategy-scripts', contract: '/contract-strategy-scripts' },
  { spot: '/strategy-bots', contract: '/contract-strategy-bots' },
] as const

/**
 * Domain Model：一條路徑在現貨／合約開關眼裡是什麼。
 *
 * 路徑完全相同是那一頁本身；**在機器人清單底下的更深一層**（建立、編輯某一台）
 * 也算那一邊，但它的對應畫面是另一邊的**清單**——同一台機器人在另一邊不存在。
 */
export class MarketCounterpartDomain {
  private readonly path: string

  constructor(path: string) {
    this.path = path.length > 1 ? path.replace(/\/+$/, '') : path
  }

  toDto(): MarketCounterpartDto {
    for (const pair of COUNTERPART_PAIRS) {
      for (const [side, otherSide] of [['spot', 'contract'], ['contract', 'spot']] as const) {
        const destinationPath = pair[side]
        const withinBotDestination = destinationPath.endsWith('-bots')
          && this.path.startsWith(`${destinationPath}/`)

        if (this.path === destinationPath || withinBotDestination) {
          return new MarketCounterpartDto(side, pair[otherSide])
        }
      }
    }

    return new MarketCounterpartDto(null, null)
  }

  /**
   * 這條路在某一邊的樣子：本來就在那一邊或根本不分兩邊時就是它自己，否則是它的對應畫面。
   * 導覽上的每一格因此跟著使用者最後切到的那一邊走，不必每一頁再切一次。
   */
  toPathOnSide(side: MarketSideVo): string {
    const counterpart = this.toDto()

    return counterpart.side === null || counterpart.side === side || counterpart.counterpartPath === null
      ? this.path
      : counterpart.counterpartPath
  }
}
