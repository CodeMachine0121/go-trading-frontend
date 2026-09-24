// @vitest-environment nuxt
// 那一邊跨畫面共用一份（useState），需要 Nuxt runtime 才問得到它。
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useMarketSide } from '~/composables/use-market-side'
import { MarketCounterpartApplication } from '~/application/market-counterpart-application'
import { MarketSideService } from '~/domain/service/market-side-service'
import type { IMarketSidePreferenceProxy } from '~/domain/interface/i-market-side-preference-proxy'

function marketSideRemembering(rememberedSide: string | null) {
  const marketSidePreferenceProxy: IMarketSidePreferenceProxy = {
    readMarketSide: vi.fn(() => rememberedSide),
    writeMarketSide: vi.fn(),
  }
  const marketSide = useMarketSide(
    new MarketCounterpartApplication(new MarketSideService(marketSidePreferenceProxy)))

  return { marketSide, marketSidePreferenceProxy }
}

describe('useMarketSide', () => {
  beforeEach(() => {
    clearNuxtState()
  })

  it('到了合約的一頁，其他有兩邊的去處都指向合約那一頁，並記下來', () => {
    const { marketSide, marketSidePreferenceProxy } = marketSideRemembering(null)

    marketSide.followPath('/contract-k-candles/chart')

    expect(marketSide.pathOnMarketSide('/strategy-scripts')).toBe('/contract-strategy-scripts')
    expect(marketSide.pathOnMarketSide('/strategy-bots')).toBe('/contract-strategy-bots')
    expect(marketSidePreferenceProxy.writeMarketSide).toHaveBeenCalledWith('contract')
  })

  it('不分兩邊的頁面不改變它', () => {
    const { marketSide } = marketSideRemembering('contract')

    marketSide.followPath('/trading-strategies')

    expect(marketSide.pathOnMarketSide('/k-candles')).toBe('/contract-k-candles')
  })

  it('重新打開時照記住的那一邊指路', () => {
    const { marketSide } = marketSideRemembering('contract')

    expect(marketSide.pathOnMarketSide('/k-candles/chart')).toBe('/contract-k-candles/chart')
  })

  it('回到現貨的一頁就換回現貨', () => {
    const { marketSide } = marketSideRemembering('contract')

    marketSide.followPath('/strategy-bots/12')

    expect(marketSide.pathOnMarketSide('/k-candles/chart')).toBe('/k-candles/chart')
  })
})
