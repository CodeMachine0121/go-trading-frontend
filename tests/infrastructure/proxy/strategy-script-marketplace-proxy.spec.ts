import { afterEach, describe, expect, it, vi } from 'vitest'
import { StrategyScriptMarketplaceProxy } from '~/infrastructure/proxy/strategy-script-marketplace-proxy'
import { signedInSessionStorage } from '../../fixtures/session-storage'

const BASE_URL = 'http://localhost:8080'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('StrategyScriptMarketplaceProxy.browseMarketplace', () => {
  it('讀得到每一支吃哪一種行情；舊版後端不說時是 K 線', async () => {
    const published = { name: '別人的', resultType: 'float', publisherEmail: 'a@example.com', publishedAt: '2026-09-10T08:00:00.000Z' }
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([
      { ...published, id: 1, marketDataKind: 'contractKCandle' },
      { ...published, id: 2 },
    ]))

    const marketplace = await new StrategyScriptMarketplaceProxy(BASE_URL, signedInSessionStorage()).browseMarketplace()

    expect(marketplace.map(entry => entry.marketDataKind)).toEqual(['contractKCandle', 'kCandle'])
  })
})
