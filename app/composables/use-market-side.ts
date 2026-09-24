import type { MarketCounterpartApplication } from '~/application/market-counterpart-application'
import type { MarketSideVo } from '~/domain/models/vo/market-side-vo'

/**
 * 使用者最後站在現貨還是合約那一邊，跨畫面共用一份，並記在這台瀏覽器。
 *
 * 它只看**使用者真的到了哪一頁**：到了合約的任何一頁就記下合約、到了現貨的任何一頁就記下現貨，
 * 不分兩邊的頁面不改變它。開關、網址、重新整理因此是同一件事——都只是「到了某一頁」。
 * 導覽上有兩邊的那幾格照它指路，切一次之後每個有分兩邊的畫面都帶著走。
 */
export function useMarketSide(
  marketCounterpartApplication: MarketCounterpartApplication = useNuxtApp().$marketCounterpartApplication,
) {
  const marketSide = useState<MarketSideVo>('market-side', () => marketCounterpartApplication.restoreMarketSide())

  function followPath(path: string): void {
    const { side } = marketCounterpartApplication.describeCounterpart(path)

    if (side !== null && side !== marketSide.value) {
      marketSide.value = marketCounterpartApplication.rememberMarketSide(side)
    }
  }

  function pathOnMarketSide(path: string): string {
    return marketCounterpartApplication.resolvePathOnSide(path, marketSide.value)
  }

  return {
    followPath,
    pathOnMarketSide,
  }
}
