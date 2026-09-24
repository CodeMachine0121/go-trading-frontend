import type { MarketSideVo } from '~/domain/models/vo/market-side-vo'

const MARKET_SIDES: readonly MarketSideVo[] = ['spot', 'contract']

/**
 * Domain Model：使用者此刻站在哪一邊。
 *
 * 記住的值來自這台瀏覽器，可能是空的或看不懂的——一律正規化成現貨，
 * 因為那是從沒切過時的樣子。
 */
export class MarketSideDomain {
  readonly side: MarketSideVo

  constructor(rememberedSide: string | null) {
    this.side = MARKET_SIDES.find(side => side === rememberedSide) ?? 'spot'
  }
}
