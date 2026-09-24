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
  ) {}

  get switchable(): boolean {
    return this.counterpartPath !== null
  }
}
