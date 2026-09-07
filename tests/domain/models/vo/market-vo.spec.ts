import { describe, expect, it } from 'vitest'
import { FALLBACK_MARKET, MARKETS } from '~/domain/models/vo/market-vo'

describe('MarketVo', () => {
  it('每一個市場都帶著給人看的標籤', () => {
    // 畫面不得自己把代號翻成人話——那樣的翻譯散在幾個元件裡，遲早有一個沒跟上。
    expect(MARKETS.map(market => [market.value, market.label])).toEqual([
      ['taiwanStock', '台股'],
      ['crypto', '加密貨幣'],
    ])
  })

  it('認不得的市場名稱有一個歸處，而不是讓那一檔消失', () => {
    // 一檔標的因為市場名稱沒跟上就整個從選單消失，比它暫時標錯市場糟得多。
    expect(FALLBACK_MARKET.value).toBe('crypto')
  })
})
