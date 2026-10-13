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

describe('StrategyScriptMarketplaceProxy：市集上的訂單流價位寬度', () => {
  it('讀回來還是訂單流價位寬度，不會退回成數值', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([{
      id: 1, name: '別人的足跡', resultType: 'signal', marketDataKind: 'contractKCandle',
      publisherEmail: 'a@example.com', publishedAt: '2026-10-14T08:00:00.000Z',
      parameters: [{ name: '寬', kind: 'orderFlowPriceStep', defaultValue: 10 }],
    }]))

    const marketplace = await new StrategyScriptMarketplaceProxy(BASE_URL, signedInSessionStorage()).browseMarketplace()

    expect(marketplace[0]?.parameters.map(parameter => parameter.kind)).toEqual(['orderFlowPriceStep'])
  })
})
