import { describe, expect, it } from 'vitest'
import { TradeLinkedStrategyDomain } from '~/domain/models/domains/trade-linked-strategy-domain'

describe('TradeLinkedStrategyDomain', () => {
  it.each([
    ['沒有關聯', null, null, false, '自行判斷'],
    ['已刪除', 5, 'BTC 趨勢跟隨', true, '關聯的交易策略已刪除'],
    ['有名字', 5, 'BTC 趨勢跟隨', false, 'BTC 趨勢跟隨'],
    ['後端沒給名字', 5, null, false, ''],
  ])('%s', (_, tradingStrategyId, tradingStrategyName, tradingStrategyDeleted, expected) => {
    expect(new TradeLinkedStrategyDomain(tradingStrategyId, tradingStrategyName, tradingStrategyDeleted).label)
      .toBe(expected)
  })
})
