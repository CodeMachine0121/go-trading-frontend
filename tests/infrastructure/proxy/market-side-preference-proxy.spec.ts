import { afterEach, describe, expect, it, vi } from 'vitest'
import { MarketSidePreferenceProxy } from '~/infrastructure/proxy/market-side-preference-proxy'

describe('MarketSidePreferenceProxy', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('寫進去的那一邊讀得回來', () => {
    const marketSidePreferenceProxy = new MarketSidePreferenceProxy()

    marketSidePreferenceProxy.writeMarketSide('contract')

    expect(marketSidePreferenceProxy.readMarketSide()).toBe('contract')
  })

  it('瀏覽器記不住時，讀回 null、寫入安靜略過', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('storage blocked')
      },
      setItem: () => {
        throw new Error('storage blocked')
      },
    })
    const marketSidePreferenceProxy = new MarketSidePreferenceProxy()

    expect(() => marketSidePreferenceProxy.writeMarketSide('contract')).not.toThrow()
    expect(marketSidePreferenceProxy.readMarketSide()).toBeNull()
  })
})
