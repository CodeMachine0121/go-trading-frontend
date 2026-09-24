import type { MarketSideVo } from '~/domain/models/vo/market-side-vo'

/**
 * DTO：現在這個畫面在哪一邊，另一邊的對應畫面在哪。
 *
 * 不分現貨合約的畫面 `side` 為 null、`counterpartPath` 為 null——開關看得到但按不動。
 */
export class MarketCounterpartDto {
  constructor(
    public readonly side: MarketSideVo | null,
    public readonly counterpartPath: string | null,
    /** 開關的名字與停留提示：可以切時說它做什麼，不能切時說為什麼。 */
    public readonly switchLabel: string,
  ) {}

  get switchable(): boolean {
    return this.counterpartPath !== null
  }

  get onContract(): boolean {
    return this.side === 'contract'
  }
}
